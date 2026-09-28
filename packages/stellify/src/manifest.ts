/** The catalog package's `package.json`: its name and version for the descriptor, and the built entry it names. */
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {Finding} from './types.js';

export interface Manifest {
  name: string;
  version: string;
  /** The entry `exports["."]` (then `main`) names, relative to the package root; undefined when neither does. */
  entry?: string;
}

const strip = (path: string): string => path.replace(/^\.\//, '');

/** `exports["."]` in its string, conditions-object, or nested-conditions form; the `import` then `default` conditions. */
function entryOf(exports: unknown, main: unknown): string | undefined {
  const dot =
    typeof exports === 'string'
      ? exports
      : typeof exports === 'object' && exports !== null && '.' in exports
        ? (exports as Record<string, unknown>)['.']
        : exports;
  const pick = (value: unknown): string | undefined => {
    if (typeof value === 'string') return value;
    if (typeof value !== 'object' || value === null) return undefined;
    const record = value as Record<string, unknown>;
    return pick(record.import) ?? pick(record.default);
  };
  const entry = pick(dot) ?? (typeof main === 'string' ? main : undefined);
  return entry === undefined ? undefined : strip(entry);
}

export function readManifest(packageDir: string): {manifest?: Manifest; findings: Finding[]} {
  const path = join(packageDir, 'package.json');
  if (!existsSync(path))
    return {findings: [{file: 'package.json', reason: 'no package.json here'}]};
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  } catch (error) {
    return {findings: [{file: 'package.json', reason: `not JSON: ${(error as Error).message}`}]};
  }
  const findings: Finding[] = [];
  if (typeof json.name !== 'string' || json.name === '')
    findings.push({file: 'package.json', reason: 'no name'});
  if (typeof json.version !== 'string' || json.version === '')
    findings.push({file: 'package.json', reason: 'no version'});
  if (findings.length > 0) return {findings};
  return {
    manifest: {
      name: json.name as string,
      version: json.version as string,
      entry: entryOf(json.exports, json.main),
    },
    findings,
  };
}
