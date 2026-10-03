/**
 * The host-module interface (phase-11 decision 8) and the web_core behaviour a runtime-loaded
 * catalog relies on (task-11.5 decision 3).
 */
import {afterEach, describe, expect, it, vi} from 'vitest';
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
import {HOST_MODULES, linkStylesheetLoader, registerHost} from './host';

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

describe('web_core and a catalog loaded after the processor was built (task-11.5 decision 3)', () => {
  it('finds a catalog pushed into the array the processor was built over', () => {
    // web_core keeps the array it was given and looks a catalog up when a surface is created; it
    // has no API to add one. The loader relies on this; a web_core that copies the array fails here.
    const catalogs: Catalog<A2uiWebCore.ComponentApi>[] = [];
    const processor = new MessageProcessor(catalogs);
    catalogs.push(new Catalog('urn:catalog:late', [], []));
    processor.processMessages([
      {
        version: 'v0.9',
        createSurface: {surfaceId: 's1', catalogId: 'urn:catalog:late'},
      } as unknown as A2uiMessage,
    ]);
    expect(processor.model.getSurface('s1')?.catalog.id).toBe('urn:catalog:late');
  });
});
