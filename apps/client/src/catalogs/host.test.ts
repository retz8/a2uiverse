/**
 * The host-module interface (phase-11 decision 8) and the web_core behaviour a runtime-loaded
 * catalog relies on (task-11.5 decision 3).
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import * as React from 'react';
import * as A2uiWebCore from '@a2ui/web_core/v0_9';
import {Catalog, MessageProcessor} from '@a2ui/web_core/v0_9';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import {
  HOST_INTERFACE_GLOBAL,
  HOST_INTERFACE_VERSION,
  HOST_SPECIFIERS,
  type HostInterface,
} from '@a2uiverse/sdk';
import {
  HOST_MODULES,
  absoluteUrls,
  buildOfStylesheet,
  linkStylesheetLoader,
  registerHost,
  scopeToBuild,
  scopedStylesheetLoader,
  topLevelRules,
} from './host';

describe('the host-module interface', () => {
  it('is registered under its global with the version the client lends and every specifier', () => {
    const loadStylesheet = async () => {};
    const host = registerHost(loadStylesheet);
    const global = (globalThis as Record<string, unknown>)[HOST_INTERFACE_GLOBAL] as HostInterface;
    expect(global).toBe(host);
    expect(global.version).toBe(HOST_INTERFACE_VERSION);
    expect(Object.keys(global.modules).sort()).toEqual([...HOST_SPECIFIERS].sort());
    expect(global.loadStylesheet).toBe(loadStylesheet);
  });

  it('lends the client’s own module namespaces: one React, one A2UI runtime on the page', () => {
    expect(HOST_MODULES.react).toBe(React);
    expect(HOST_MODULES['@a2ui/web_core/v0_9']).toBe(A2uiWebCore);
  });
});

describe('the page’s stylesheet loader', () => {
  it('appends one link per URL, in call order, resolving on its load', async () => {
    const load = linkStylesheetLoader(document);
    const first = load('http://hub.test/a.css');
    const again = load('http://hub.test/a.css');
    void load('http://hub.test/b.css');
    expect(again).toBe(first);
    const links = [...document.head.querySelectorAll('link[rel="stylesheet"]')].map(
      link => (link as HTMLLinkElement).href,
    );
    expect(links.slice(-2)).toEqual(['http://hub.test/a.css', 'http://hub.test/b.css']);
    document.head
      .querySelector('link[href="http://hub.test/a.css"]')!
      .dispatchEvent(new Event('load'));
    await expect(first).resolves.toBeUndefined();
  });

  it('rejects on the link’s error and lets the next call try again', async () => {
    const load = linkStylesheetLoader(document);
    const failed = load('http://hub.test/missing.css');
    document.head
      .querySelector('link[href="http://hub.test/missing.css"]')!
      .dispatchEvent(new Event('error'));
    await expect(failed).rejects.toThrow('did not load');
    expect(load('http://hub.test/missing.css')).not.toBe(failed);
  });
});

describe('a stylesheet that gets no answer (task-11.8 decision 20)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  const linksTo = (url: string) => [...document.head.querySelectorAll(`link[href^="${url}"]`)];

  it('is asked once more on a fresh link after the timeout, and resolves on that one', async () => {
    vi.useFakeTimers();
    const load = linkStylesheetLoader(document, {timeoutMs: 10_000});
    const url = 'http://hub.test/stalled.css';
    const loaded = load(url);
    const [first] = linksTo(url);
    vi.advanceTimersByTime(10_000);
    const links = linksTo(url);
    expect(links).toHaveLength(1);
    expect(links[0]).not.toBe(first);
    // A URL of its own: the browser would otherwise hand the new link the request still unanswered.
    expect((links[0] as HTMLLinkElement).href).toBe(`${url}?attempt=2`);
    links[0]!.dispatchEvent(new Event('load'));
    await expect(loaded).resolves.toBeUndefined();
  });

  it('rejects when the second link gets no answer either, and the next call tries again', async () => {
    vi.useFakeTimers();
    const load = linkStylesheetLoader(document, {timeoutMs: 10_000});
    const url = 'http://hub.test/lost.css';
    const failed = load(url);
    vi.advanceTimersByTime(10_000);
    vi.advanceTimersByTime(10_000);
    await expect(failed).rejects.toThrow('no answer in 10 s, twice');
    expect(linksTo(url)).toHaveLength(0);
    expect(load(url)).not.toBe(failed);
  });
});

describe('a build’s stylesheet held to its own surfaces (task-14.11 decision 39)', () => {
  it('scopes every rule to the build’s frames; what names a thing for the page stays at the top', () => {
    const rules = [
      '@font-face { font-family: inter; src: url("fonts/inter.woff2"); }',
      '@keyframes spin { to { rotate: 1turn; } }',
      '@layer base, theme;',
      'body { margin: 0px; }',
      'body[data-dialog-scroll-disabled] { overflow: hidden !important; }',
      ':root { --gap: 4px; }',
      '* { box-sizing: border-box; }',
      'html, .x { color: red; }',
      '.a:is(.b, .c) { color: blue; }',
      '@media (min-width: 480px) { .t { display: grid; } }',
      '@layer theme { .u { color: green; } }',
    ];
    expect(scopeToBuild(rules, 'sha256-abc').split('\n')).toEqual([
      ...rules.slice(0, 6),
      '@scope ([data-catalog-build="sha256-abc"]) {',
      ...rules.slice(6),
      '}',
    ]);
  });

  it('cuts a sheet into its rules as written: comments, strings and addresses stepped over', () => {
    const sheet = [
      '@charset "utf-8";',
      '/* a } in a comment */ .a{content:"}{;";border:var(--w,.0625rem) solid;border-color:red}',
      '.b{background:url(data:image/svg+xml;utf8,<svg/>)}',
      "@media (min-width:1px){.c{content:'}'}}",
      '@layer x,y;',
    ];
    expect(topLevelRules(sheet.join(''))).toEqual(sheet);
    expect(scopeToBuild(topLevelRules(sheet.join('\n')), 'sha256-abc').split('\n')).toEqual([
      sheet[0],
      sheet[4],
      '@scope ([data-catalog-build="sha256-abc"]) {',
      sheet[1],
      sheet[2],
      sheet[3],
      '}',
    ]);
  });

  it('reads the build off the sheet’s address, the registry’s or the marketplace’s', () => {
    expect(buildOfStylesheet('http://o.test/registry/artifacts/sha256-Ab_c-1/dist/theme.css')).toBe(
      'sha256-Ab_c-1',
    );
    expect(
      buildOfStylesheet('http://o.test/marketplace/artifacts/sha256-Zz9/node_modules/x/a.css'),
    ).toBe('sha256-Zz9');
    expect(buildOfStylesheet('http://o.test/assets/index.css')).toBeUndefined();
  });

  /** A constructed sheet as the page holds one: the text it was given. */
  class Sheet {
    readonly baseURL: string;
    text = '';
    constructor(options?: {baseURL?: string}) {
      this.baseURL = options?.baseURL ?? '';
    }
    replaceSync(text: string) {
      this.text = text;
    }
  }
  const adopted = () => (document as unknown as {adoptedStyleSheets: Sheet[]}).adoptedStyleSheets;
  const OLD = 'http://o.test/registry/artifacts/sha256-old/dist/theme.css';
  const NEW = 'http://o.test/registry/artifacts/sha256-new/dist/theme.css';

  beforeEach(() => {
    vi.stubGlobal('CSSStyleSheet', Sheet);
    vi.stubGlobal('CSSScopeRule', class {});
    Object.defineProperty(document, 'adoptedStyleSheets', {
      value: [],
      writable: true,
      configurable: true,
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete (document as unknown as {adoptedStyleSheets?: unknown}).adoptedStyleSheets;
  });

  it('adopts each build’s sheet scoped, in the order asked, based at its own address', async () => {
    const texts: Record<string, string> = {
      [OLD]: '.lc-panel { border: 1px solid grey; }',
      [NEW]: '.lc-panel { border: 2px solid indigo; }',
    };
    const load = scopedStylesheetLoader(document, {read: async url => texts[url]!});
    const later = load(NEW);
    await Promise.all([load(OLD), later]);
    expect(adopted().map(sheet => [sheet.baseURL, sheet.text])).toEqual([
      [NEW, scopeToBuild([texts[NEW]!], 'sha256-new')],
      [OLD, scopeToBuild([texts[OLD]!], 'sha256-old')],
    ]);
    expect(load(OLD)).toBe(load(OLD));
  });

  it('makes every relative address whole against the sheet’s own, data and fragments kept', async () => {
    expect(
      absoluteUrls(
        `src: url("./fonts/inter.woff2") url(../img/a.png) url('data:image/png;base64,AA') url(#clip)`,
        OLD,
      ),
    ).toBe(
      'src: url("http://o.test/registry/artifacts/sha256-old/dist/fonts/inter.woff2") ' +
        'url(http://o.test/registry/artifacts/sha256-old/img/a.png) ' +
        `url('data:image/png;base64,AA') url(#clip)`,
    );
    const load = scopedStylesheetLoader(document, {
      read: async () => '@font-face { font-family: x; src: url("fonts/x.woff2"); }',
    });
    await load(OLD);
    expect(adopted()[0]!.text).toContain(
      'url("http://o.test/registry/artifacts/sha256-old/dist/fonts/x.woff2")',
    );
  });

  it('takes a link for a sheet outside an artifact', async () => {
    const read = vi.fn();
    const load = scopedStylesheetLoader(document, {read});
    const url = 'http://hub.test/own.css';
    const loaded = load(url);
    const link = document.head.querySelector(`link[href="${url}"]`)!;
    link.dispatchEvent(new Event('load'));
    await expect(loaded).resolves.toBeUndefined();
    expect(read).not.toHaveBeenCalled();
    expect(adopted()).toEqual([]);
  });

  it('asks once more under an address of its own when the first read gets no answer', async () => {
    const read = vi
      .fn()
      .mockRejectedValueOnce(new DOMException('timed out', 'TimeoutError'))
      .mockResolvedValueOnce('.a { color: red; }');
    await scopedStylesheetLoader(document, {read})(OLD);
    expect(read.mock.calls.map(([url]) => url)).toEqual([OLD, `${OLD}?attempt=2`]);
    expect(adopted()[0]!.text).toContain('.a { color: red; }');
  });

  it('a failed read rejects, its place given back, and the next call tries again', async () => {
    const read = vi.fn().mockRejectedValue(new Error('HTTP 404'));
    const load = scopedStylesheetLoader(document, {read});
    const failed = load(OLD);
    await expect(failed).rejects.toThrow(`the stylesheet ${OLD} did not load: its request failed`);
    expect(adopted()).toEqual([]);
    const again = load(OLD);
    expect(again).not.toBe(failed);
    await expect(again).rejects.toThrow('its request failed');
  });
});

describe('web_core and a catalog loaded after the processor was built (task-16.7 decision 2)', () => {
  const late = () => new Catalog('urn:catalog:late', 'v0.9.1', [], []);

  it('takes a catalog through the patched addCatalog, from the next surface on', () => {
    // web_core 0.14.0 links copies of the catalogs it is built over; `addCatalog` is upstream's
    // PR #3304, carried as a patch. A web_core without it fails here.
    const processor = new MessageProcessor<A2uiWebCore.ComponentApi>([]);
    processor.addCatalog(late());
    processor.processMessages([
      {
        version: 'v0.9',
        createSurface: {surfaceId: 's1', catalogId: 'urn:catalog:late'},
      } as unknown as A2uiMessage,
    ]);
    expect(processor.model.getSurface('s1')?.defaultCatalog?.id).toBe('urn:catalog:late');
  });

  it('refuses a catalog whose id the processor holds', () => {
    const processor = new MessageProcessor<A2uiWebCore.ComponentApi>([late()]);
    expect(() => processor.addCatalog(late())).toThrow(A2uiWebCore.A2uiCatalogError);
  });
});
