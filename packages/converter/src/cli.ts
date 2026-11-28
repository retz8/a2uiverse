#!/usr/bin/env node
/**
 * The converter's command line (task-21.11 decisions 2, 6 and 12).
 *
 *   a2ui-convert [--write] [--repo a2uiverse|a2uiverse-apps] [--platform <dir>] [--apps <dir>] [--json <file>] [<path>...]
 *
 * Reads the given paths of `--repo`, or every recorded file of the repo — of both repos when no
 * `--repo` is given — and reports what converting each would change and what it could not place.
 * Without `--write` nothing is written. With it, a file is written only when it has no stop, every
 * catalog it paints in has a map and a v1.0 document, and each of its paints holds the verdict it
 * had before the flip, as `scripts/recorded-verdicts.json` keeps them.
 */
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import type {A2uiCatalogSchema} from '@a2uiverse/sdk';
import {loadCatalogMaps, type CatalogMap, type DocumentPlace} from './catalogMap.js';
import {convertRecorded, type Conversion, type KnownCatalog} from './convert.js';
import {isIdentifier} from './identifier.js';
import {
  placeOfCatalogId,
  recordedFiles,
  TEMPLATE_CATALOG_ID,
  type RecordedFile,
} from './inventory.js';
import {readCatalogShape, type CatalogShape, type Position} from './positions.js';
import {Repos} from './repos.js';
import {carriesA2ui, judgeConverted, type RecordedVerdict} from './validate.js';

type Repo = DocumentPlace['repo'];

const args = process.argv.slice(2);
const flag = (name: string) => {
  const at = args.indexOf(name);
  if (at === -1) return undefined;
  const value = args[at + 1];
  args.splice(at, 2);
  return value;
};
const write = args.includes('--write');
if (write) args.splice(args.indexOf('--write'), 1);
const only = flag('--repo') as Repo | undefined;
const json = flag('--json');
const platform = resolve(flag('--platform') ?? fileURLToPath(new URL('../../..', import.meta.url)));
const apps = resolve(
  flag('--apps') ?? process.env.A2UIVERSE_AGENTS_DIR ?? `${platform}/../a2uiverse-apps`,
);
if (args.some(arg => arg.startsWith('--')))
  throw new Error(`unknown flag: ${args.find(a => a.startsWith('--'))}`);
if (args.length > 0 && !only)
  throw new Error('paths are read within one repo: name it with --repo');

const repos = new Repos({a2uiverse: platform, 'a2uiverse-apps': apps});
const maps = loadCatalogMaps();
const byNewId = new Map<string, CatalogMap>([...maps.values()].map(map => [map.to.catalogId, map]));

interface VerdictList {
  files: {repo: Repo; path: string; surfaces: RecordedVerdict[]}[];
}
const verdicts = JSON.parse(
  repos.read({repo: 'a2uiverse', path: 'scripts/recorded-verdicts.json'}),
) as VerdictList;

const shapes = new Map<
  string,
  {catalogId: string; shape: CatalogShape; document: Record<string, unknown>}
>();
function oldCatalog(place: DocumentPlace) {
  const key = `${place.repo}:${place.path}`;
  if (!shapes.has(key)) {
    const document = JSON.parse(repos.readOld(place)) as Record<string, unknown>;
    shapes.set(key, {
      catalogId: String(document.catalogId),
      shape: readCatalogShape(document),
      document,
    });
  }
  return shapes.get(key)!;
}

const newDocuments = new Map<string, A2uiCatalogSchema>();
function newCatalog(catalogId: string): A2uiCatalogSchema | undefined {
  const map = byNewId.get(catalogId);
  if (!map) return undefined;
  if (!newDocuments.has(catalogId)) newDocuments.set(catalogId, JSON.parse(repos.read(map.to)));
  return newDocuments.get(catalogId);
}

/** Every position in a catalog's shape that does not settle, by where it is. */
function unsettledIn(shape: CatalogShape): string[] {
  const out: string[] = [];
  const walk = (position: Position) => {
    if (position.kind === 'unsettled') out.push(position.why);
    if (position.kind === 'object') {
      Object.values(position.properties).forEach(walk);
      if (position.rest) walk(position.rest);
    }
    if (position.kind === 'array') walk(position.items);
  };
  for (const component of Object.values(shape.components))
    Object.values(component.properties).forEach(walk);
  for (const fn of Object.values(shape.functions)) Object.values(fn.args).forEach(walk);
  return [...new Set(out)];
}

interface FileReport {
  repo: Repo;
  path: string;
  changes: Conversion['changes'];
  renamed: number;
  stops: string[];
  misfits: string[];
  dataStrings: string[];
  written?: boolean;
  parity?: string[];
}

const targets: RecordedFile[] = [];
for (const repo of (only ? [only] : ['a2uiverse', 'a2uiverse-apps']) as Repo[]) {
  const inventory = recordedFiles(repo, repos.tracked(repo));
  if (args.length === 0) targets.push(...inventory);
  for (const path of args) targets.push(inventory.find(file => file.path === path) ?? {repo, path});
}

const reports: FileReport[] = [];
const catalogsSeen = new Map<string, DocumentPlace>();

for (const file of targets) {
  const text = repos.read(file);
  const recorded = JSON.parse(text) as unknown;
  if (!carriesA2ui(recorded)) continue;
  const own = file.own ? oldCatalog(file.own) : undefined;

  const catalogOf = (catalogId: string): KnownCatalog | undefined => {
    const map = catalogId === TEMPLATE_CATALOG_ID ? undefined : maps.get(catalogId);
    const place =
      map?.from ?? (catalogId === TEMPLATE_CATALOG_ID ? file.own : placeOfCatalogId(catalogId));
    if (!place) return undefined;
    catalogsSeen.set(`${catalogId}|${place.repo}:${place.path}`, place);
    return {shape: oldCatalog(place).shape, ...(map ? {map} : {})};
  };
  const conversion = convertRecorded(recorded, {
    catalogOf,
    ...(own ? {defaultCatalogId: own.catalogId} : {}),
  });
  const report: FileReport = {
    repo: file.repo,
    path: file.path,
    changes: conversion.changes,
    renamed: Object.keys(conversion.renamed).length,
    stops: conversion.stops,
    misfits: conversion.misfits,
    dataStrings: conversion.dataStrings,
  };
  if (write) {
    report.written = false;
    if (conversion.stops.length === 0) {
      const held = verdicts.files.find(f => f.repo === file.repo && f.path === file.path)?.surfaces;
      const defaultNew = own ? newCatalog(maps.get(own.catalogId)?.to.catalogId ?? '') : undefined;
      const judged = judgeConverted(conversion.value, newCatalog, defaultNew, held ?? []);
      report.parity = judged.flatMap(p =>
        p.parity ? [`${p.surface} paint ${p.paint}: ${p.parity}`] : [],
      );
      if (report.parity.length === 0) {
        const indent = /\n( +)\S/.exec(text)?.[1]?.length ?? 2;
        repos.write(
          file,
          `${JSON.stringify(conversion.value, null, indent)}${text.endsWith('\n') ? '\n' : ''}`,
        );
        report.written = true;
      }
    }
  }
  reports.push(report);
}

// What each catalog's map must say: the names the identifier rule refuses, and the positions its
// document leaves unsettled.
const catalogs = [...catalogsSeen].map(([key, place]) => {
  const catalogId = key.slice(0, key.indexOf('|'));
  const {shape, document} = oldCatalog(place);
  const components = (document.components ?? {}) as Record<string, unknown>;
  const refusedComponents = Object.keys(components).filter(name => !isIdentifier(name));
  const refusedProperties = Object.entries(shape.components).flatMap(([name, component]) =>
    Object.keys(component.properties)
      .filter(key => key !== '*' && !isIdentifier(key))
      .map(key => `${name}.${key}`),
  );
  return {
    catalogId,
    document: `${place.repo}:${place.path}`,
    map: maps.get(catalogId)?.name ?? null,
    refusedComponents,
    refusedProperties,
    unsettled: unsettledIn(shape),
  };
});

const sum = (pick: (r: FileReport) => number) => reports.reduce((n, r) => n + pick(r), 0);
for (const report of reports) {
  const changed = Object.entries(report.changes)
    .map(([k, n]) => `${k} ${n}`)
    .join(', ');
  const state =
    report.written === undefined ? '' : report.written ? ' — written' : ' — not written';
  console.log(`${report.repo}:${report.path}${state}`);
  console.log(`  would change: ${changed || 'nothing'}; ids renamed: ${report.renamed}`);
  for (const stop of report.stops) console.log(`  stop: ${stop}`);
  for (const misfit of report.misfits) console.log(`  left as written: ${misfit}`);
  for (const data of report.dataStrings) console.log(`  data: ${data}`);
  for (const parity of report.parity ?? []) console.log(`  verdict: ${parity}`);
}
console.log('');
for (const catalog of catalogs) {
  console.log(`${catalog.catalogId} (${catalog.document}) — map: ${catalog.map ?? 'none'}`);
  if (catalog.refusedComponents.length)
    console.log(
      `  component names refused: ${catalog.refusedComponents.length} — ${catalog.refusedComponents.join(', ')}`,
    );
  if (catalog.refusedProperties.length)
    console.log(`  property names refused: ${catalog.refusedProperties.join(', ')}`);
  for (const why of catalog.unsettled) console.log(`  unsettled: ${why}`);
}
console.log('');
console.log(
  `${reports.length} files; ${sum(r => (r.stops.length ? 1 : 0))} with a stop; ` +
    `${sum(r => r.renamed)} id renames; ${sum(r => r.misfits.length)} values left as written; ` +
    `${sum(r => r.dataStrings.length)} data strings equal to a renamed id` +
    (write ? `; ${sum(r => (r.written ? 1 : 0))} written` : '; nothing written'),
);
if (json) writeFileSync(json, `${JSON.stringify({files: reports, catalogs}, null, 2)}\n`);
if (write && reports.some(r => !r.written)) process.exitCode = 1;
