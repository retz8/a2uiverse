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

/**
 * The page's loader: one `<link>` per URL, appended in call order — so the cascade follows the
 * order the artifact's modules import their sheets — resolved on its load, rejected on its error.
 */
export function linkStylesheetLoader(document: Document = globalThis.document): StylesheetLoader {
  const loads = new Map<string, Promise<void>>();
  return url => {
    const held = loads.get(url);
    if (held) return held;
    const load = new Promise<void>((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.addEventListener('load', () => resolve());
      link.addEventListener('error', () => {
        loads.delete(url);
        reject(new Error(`the stylesheet ${url} did not load`));
      });
      document.head.append(link);
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
