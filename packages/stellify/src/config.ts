/**
 * `stellify.config.ts`: the one config format, a TypeScript file loaded through esbuild, so a
 * vendor writes it beside the `vitest.config.ts` they already have. Bundled in memory with the
 * `@a2uiverse/stellify` import answered by a virtual `defineConfig`, then imported as a data URL —
 * nothing is written into the vendor's checkout.
 */
import {build} from 'esbuild';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import type {Finding, StellifyConfig} from './types.js';

export const CONFIG_FILE = 'stellify.config.ts';

const KEYS = ['entry', 'schema', 'catalogId', 'outDir'] as const;

/** Types the config; returns it unchanged. */
export function defineConfig(config: StellifyConfig): StellifyConfig {
  return config;
}

export interface LoadedConfig {
  config: StellifyConfig;
  findings: Finding[];
}

/** Reads and checks `stellify.config.ts` at the package root; no file is an empty config. */
export async function loadConfig(packageDir: string): Promise<LoadedConfig> {
  const path = join(packageDir, CONFIG_FILE);
  if (!existsSync(path)) return {config: {}, findings: []};
  let exported: unknown;
  try {
    const result = await build({
      entryPoints: [path],
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node22',
      write: false,
      logLevel: 'silent',
      plugins: [
        {
          name: 'stellify-self',
          setup(api) {
            api.onResolve({filter: /^@a2uiverse\/stellify$/}, () => ({
              path: 'stellify',
              namespace: 'stellify-self',
            }));
            api.onLoad({filter: /.*/, namespace: 'stellify-self'}, () => ({
              contents: 'export const defineConfig = config => config;',
              loader: 'js',
            }));
          },
        },
      ],
    });
    const code = result.outputFiles[0]!.text;
    const module = (await import(
      `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
    )) as {default?: unknown};
    exported = module.default;
  } catch (error) {
    return {config: {}, findings: [{file: CONFIG_FILE, reason: messageOf(error)}]};
  }
  return checkConfig(exported);
}

/** The exported value against the config's shape: an object of known string fields. */
export function checkConfig(value: unknown): LoadedConfig {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return {
      config: {},
      findings: [{file: CONFIG_FILE, reason: 'the default export is not a config object'}],
    };
  }
  const findings: Finding[] = [];
  const config: StellifyConfig = {};
  for (const [key, field] of Object.entries(value)) {
    if (!(KEYS as readonly string[]).includes(key)) {
      findings.push({file: CONFIG_FILE, reason: `unknown key ${JSON.stringify(key)}`});
    } else if (typeof field !== 'string') {
      findings.push({file: CONFIG_FILE, reason: `${key} must be a string`});
    } else {
      config[key as (typeof KEYS)[number]] = field;
    }
  }
  return {config, findings};
}

export const messageOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);
