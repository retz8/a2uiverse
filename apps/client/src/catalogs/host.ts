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
 * A link that gets neither within the timeout is replaced by a fresh one for the same URL, asked
 * once more; no answer to that either rejects, so a request nothing answers fails the catalog's
 * load rather than holding its entry, and its slots, forever (task-11.8 decision 20).
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
        link.href = url;
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

/** Registers the host-module interface under its global, before any artifact loads. */
export function registerHost(
  loadStylesheet: StylesheetLoader = linkStylesheetLoader(),
): HostInterface {
  const host: HostInterface = {
    version: HOST_INTERFACE_VERSION,
    modules: HOST_MODULES,
    loadStylesheet,
  };
  (globalThis as Record<string, unknown>)[HOST_INTERFACE_GLOBAL] = host;
  return host;
}
