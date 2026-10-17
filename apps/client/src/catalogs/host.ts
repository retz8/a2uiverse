/**
 * The host-module interface (phase-11 decision 8; the sdk's catalog contract): the one object a
 * packed catalog artifact reaches the page's singletons through — React, react-dom, the A2UI
 * runtime and zod, the client's own module namespaces — and the stylesheet loader its rewritten
 * stylesheet imports call. Registered under the global before any artifact loads; an artifact
 * reads it as its entry evaluates.
 */
import * as React from 'react';
import * as ReactJsxRuntime from 'react/jsx-runtime';
import * as ReactDom from 'react-dom';
import * as ReactDomClient from 'react-dom/client';
import * as A2uiReact from '@a2ui/react/v0_9';
import * as A2uiWebCore from '@a2ui/web_core/v0_9';
import * as Zod from 'zod';
import {
  HOST_INTERFACE_GLOBAL,
  HOST_INTERFACE_VERSION,
  type HostInterface,
  type HostSpecifier,
} from '@a2uiverse/sdk';

/** The client's own module for each specifier an artifact leaves external. */
export const HOST_MODULES: Record<HostSpecifier, unknown> = {
  react: React,
  'react/jsx-runtime': ReactJsxRuntime,
  'react-dom': ReactDom,
  'react-dom/client': ReactDomClient,
  '@a2ui/react/v0_9': A2uiReact,
  '@a2ui/web_core/v0_9': A2uiWebCore,
  zod: Zod,
};

/** Loads a stylesheet by URL; resolves when it has applied. */
export type StylesheetLoader = (url: string) => Promise<void>;

/** How long a stylesheet link waits for its load or its error before it is asked once more. */
export const STYLESHEET_TIMEOUT_MS = 10_000;

/**
 * The page's loader: one `<link>` per URL, appended in call order — so the cascade follows the
 * order the artifact's modules import their sheets — resolved on its load, rejected on its error.
 * A link that gets neither within the timeout is replaced by a fresh one, asked once more under a
 * URL of its own — the browser hands a link for the same URL the request still unanswered; no
 * answer to that either rejects, so a request nothing answers fails the catalog's load rather than
 * holding its entry, and its slots, forever (task-11.8 decision 20).
 */
export function linkStylesheetLoader(
  document: Document = globalThis.document,
  {timeoutMs = STYLESHEET_TIMEOUT_MS}: {timeoutMs?: number} = {},
): StylesheetLoader {
  const loads = new Map<string, Promise<void>>();
  return url => {
    const held = loads.get(url);
    if (held) return held;
    const load = new Promise<void>((resolve, reject) => {
      const fail = (reason: string) => {
        loads.delete(url);
        reject(new Error(`the stylesheet ${url} did not load: ${reason}`));
      };
      const ask = (attempt: number, before?: HTMLLinkElement) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href =
          attempt === 1 ? url : `${url}${url.includes('?') ? '&' : '?'}attempt=${attempt}`;
        const timer = setTimeout(() => {
          if (attempt === 1) return ask(2, link);
          link.remove();
          fail(`no answer in ${timeoutMs / 1000} s, twice`);
        }, timeoutMs);
        link.addEventListener('load', () => {
          clearTimeout(timer);
          resolve();
        });
        link.addEventListener('error', () => {
          clearTimeout(timer);
          link.remove();
          fail('its request failed');
        });
        // In place of the link that got no answer, so the cascade keeps the call order.
        if (before) before.replaceWith(link);
        else document.head.append(link);
      };
      ask(1);
    });
    loads.set(url, load);
    return load;
  };
}

/** What a surface's frame carries naming its catalog's build (task-14.11 decision 39). */
export const BUILD_ATTRIBUTE = 'data-catalog-build';

/** The build a stylesheet belongs to: the artifact id its URL is under; none outside an artifact. */
export function buildOfStylesheet(url: string): string | undefined {
  return /\/artifacts\/(sha256-[\w-]+)\//.exec(url)?.[1];
}

/** At-rules a scope holds; every other one — fonts, keyframes, a property, a layer order — stays at the top. */
const SCOPED_AT_RULE = /^@(media|supports|container|layer|scope|starting-style)\b[^;{]*\{/;
/** A selector aimed at the document itself, which no scope inside the page reaches. */
const DOCUMENT_SELECTOR = /^(:root|html|body)(?![\w-])/;

/** Where a quoted string that opens at `i` ends: past its closing quote, escapes stepped over. */
function endOfString(text: string, i: number): number {
  const quote = text[i];
  let j = i + 1;
  while (j < text.length && text[j] !== quote && text[j] !== '\n') j += text[j] === '\\' ? 2 : 1;
  return j + 1;
}

/**
 * A sheet's top-level rules as written: cut at the end of each block or statement, outside
 * comments, quoted strings and unquoted `url()`s. The text is kept as it stands — a sheet the page
 * parses and serializes again can lose a shorthand holding a variable.
 */
export function topLevelRules(text: string): string[] {
  const rules: string[] = [];
  let depth = 0;
  let start = 0;
  const cut = (end: number) => {
    const rule = text.slice(start, end).trim();
    if (rule !== '') rules.push(rule);
    start = end;
  };
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (char === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end < 0 ? text.length : end + 2;
    } else if (char === '"' || char === "'") {
      i = endOfString(text, i);
    } else if (/^url\(\s*[^\s'"]/i.test(text.slice(i, i + 6))) {
      const end = text.indexOf(')', i);
      i = end < 0 ? text.length : end + 1;
    } else {
      if (char === '{') depth++;
      else if (char === '}' && --depth === 0) cut(i + 1);
      else if (char === ';' && depth === 0) cut(i + 1);
      i++;
    }
  }
  cut(text.length);
  return rules;
}

/** A rule without the comments before it. */
const headOf = (rule: string) => rule.replace(/^(\s|\/\*[\s\S]*?\*\/)+/, '');

/** A style rule's selectors: its prelude split on the commas outside parentheses and brackets. */
function selectorsOf(rule: string): string[] {
  const prelude = rule.slice(0, rule.indexOf('{')).replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < prelude.length; i++) {
    const char = prelude[i];
    if (char === '(' || char === '[') depth++;
    else if (char === ')' || char === ']') depth--;
    else if (char === ',' && depth === 0) {
      selectors.push(prelude.slice(start, i).trim());
      start = i + 1;
    }
  }
  selectors.push(prelude.slice(start).trim());
  return selectors;
}

/**
 * A build's sheet held to that build's surfaces (task-14.11 decision 39): its rules inside an
 * `@scope` rooted at every frame marked with the build, so two builds of one catalog never style
 * each other's surfaces. What names a thing for the whole page — a font, keyframes, a registered
 * property, a layer order — and a rule aimed only at the document itself stay at the top, as the
 * sheet had them.
 */
export function scopeToBuild(rules: readonly string[], build: string): string {
  const top: string[] = [];
  const scoped: string[] = [];
  for (const rule of rules) {
    const text = rule.trim();
    const head = headOf(text);
    const stays = head.startsWith('@')
      ? !SCOPED_AT_RULE.test(head)
      : selectorsOf(head).every(selector => DOCUMENT_SELECTOR.test(selector));
    (stays ? top : scoped).push(text);
  }
  return [...top, `@scope ([${BUILD_ATTRIBUTE}="${build}"]) {`, ...scoped, '}'].join('\n');
}

/** A `url()` in a sheet, its quote kept apart from its address. */
const URL_REFERENCE = /url\(\s*(['"]?)([^'")]*)\1\s*\)/g;

/**
 * A sheet's text with every relative address made whole against the sheet's own: a font face's
 * `src` in a constructed sheet resolves against the page, not the sheet's base, in Chromium.
 * A data address and a fragment are left as they are.
 */
export function absoluteUrls(text: string, sheetUrl: string): string {
  return text.replace(URL_REFERENCE, (whole, quote: string, address: string) =>
    address === '' || /^(data:|#)/i.test(address)
      ? whole
      : `url(${quote}${new URL(address, sheetUrl).href}${quote})`,
  );
}

/** Whether the page can hold a sheet to a build: constructed sheets, adopted, and `@scope`. */
const canScope = (document: Document) =>
  typeof CSSStyleSheet === 'function' &&
  'adoptedStyleSheets' in document &&
  'CSSScopeRule' in globalThis;

/** A stylesheet's text; rejects on a failed request, or with `TimeoutError` when `signal` fires. */
export type StylesheetReader = (url: string, signal: AbortSignal) => Promise<string>;

const readOverHttp: StylesheetReader = async (url, signal) => {
  const response = await fetch(url, {signal});
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
};

/**
 * The page's loader (task-14.11 decision 39): a sheet inside a catalog artifact is held to its
 * build's surfaces — read as text, its addresses made whole, cut into its rules as written and
 * scoped by `scopeToBuild`, and adopted onto the document on a sheet of its own. Its place is taken when it is asked for, so the cascade follows the order the
 * artifact's modules import their sheets. A read that gets no answer in the timeout is asked once
 * more, under a URL of its own, as a link is; a sheet outside an artifact, or a page that cannot
 * scope, takes the link loader.
 */
export function scopedStylesheetLoader(
  document: Document = globalThis.document,
  {
    timeoutMs = STYLESHEET_TIMEOUT_MS,
    read = readOverHttp,
  }: {timeoutMs?: number; read?: StylesheetReader} = {},
): StylesheetLoader {
  const links = linkStylesheetLoader(document, {timeoutMs});
  if (!canScope(document)) return links;
  const loads = new Map<string, Promise<void>>();
  const readTwice = async (url: string): Promise<string> => {
    try {
      return await read(url, AbortSignal.timeout(timeoutMs));
    } catch (err) {
      if ((err as Error).name !== 'TimeoutError') throw new Error('its request failed');
    }
    try {
      return await read(
        `${url}${url.includes('?') ? '&' : '?'}attempt=2`,
        AbortSignal.timeout(timeoutMs),
      );
    } catch (err) {
      throw new Error(
        (err as Error).name === 'TimeoutError'
          ? `no answer in ${timeoutMs / 1000} s, twice`
          : 'its request failed',
      );
    }
  };
  return url => {
    const build = buildOfStylesheet(url);
    if (!build) return links(url);
    const held = loads.get(url);
    if (held) return held;
    const baseURL = new URL(url, document.baseURI).href;
    const sheet = new CSSStyleSheet({baseURL});
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    const load = readTwice(url).then(
      text => {
        sheet.replaceSync(scopeToBuild(topLevelRules(absoluteUrls(text, baseURL)), build));
      },
      (err: Error) => {
        document.adoptedStyleSheets = document.adoptedStyleSheets.filter(s => s !== sheet);
        loads.delete(url);
        throw new Error(`the stylesheet ${url} did not load: ${err.message}`);
      },
    );
    loads.set(url, load);
    return load;
  };
}

/** Registers the host-module interface under its global, before any artifact loads. */
export function registerHost(
  loadStylesheet: StylesheetLoader = scopedStylesheetLoader(),
): HostInterface {
  const host: HostInterface = {
    version: HOST_INTERFACE_VERSION,
    modules: HOST_MODULES,
    loadStylesheet,
  };
  (globalThis as Record<string, unknown>)[HOST_INTERFACE_GLOBAL] = host;
  return host;
}
