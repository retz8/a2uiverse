import {readFileSync} from 'node:fs';
import {describe, expect, test} from 'vitest';
import {pruneCatalog} from './prune';
import type {A2uiCatalogSchema} from './types';
import {createA2uiValidator} from './validator';

const basic = JSON.parse(
  readFileSync(
    new URL('../../../a2ui-spec/specification/v0_9_1/catalogs/basic/catalog.json', import.meta.url),
    'utf8',
  ),
) as A2uiCatalogSchema;

const keep = {components: ['Column', 'Text', 'Button'], functions: ['openUrl']};

describe('pruneCatalog', () => {
  test('keeps exactly the named components and functions, in the catalog’s order', () => {
    const pruned = pruneCatalog(basic, keep);
    expect(Object.keys(pruned.components!)).toEqual(['Text', 'Column', 'Button']);
    expect(Object.keys(pruned.functions!)).toEqual(['openUrl']);
  });

  test('the unions name only what is kept; the entry points and the shared definitions they use stay', () => {
    const pruned = pruneCatalog(basic, keep);
    const refs = (def: string) =>
      (pruned.$defs![def] as {oneOf: {$ref: string}[]}).oneOf.map(branch => branch.$ref);
    expect(refs('anyComponent')).toEqual([
      '#/components/Text',
      '#/components/Column',
      '#/components/Button',
    ]);
    expect(refs('anyFunction')).toEqual(['#/functions/openUrl']);
    expect(Object.keys(pruned.$defs!).sort()).toEqual(
      ['CatalogComponentCommon', 'anyComponent', 'anyFunction', 'theme'].sort(),
    );
  });

  test('a shared definition only dropped entries referenced goes with them', () => {
    const catalog: A2uiCatalogSchema = {
      components: {
        A: {properties: {x: {$ref: '#/$defs/Shared'}}},
        B: {properties: {y: {$ref: '#/$defs/OnlyB'}}},
      },
      functions: {},
      $defs: {
        Shared: {type: 'string'},
        OnlyB: {$ref: '#/$defs/Deeper'},
        Deeper: {type: 'number'},
        anyComponent: {oneOf: [{$ref: '#/components/A'}, {$ref: '#/components/B'}]},
        anyFunction: {oneOf: []},
      },
    };
    const pruned = pruneCatalog(catalog, {components: ['A'], functions: []});
    expect(Object.keys(pruned.$defs!).sort()).toEqual(['Shared', 'anyComponent', 'anyFunction']);
    expect(pruned.$defs!.anyFunction).toEqual({oneOf: [false]});
  });

  test('a name the catalog does not declare is an error', () => {
    expect(() => pruneCatalog(basic, {components: ['Slot'], functions: []})).toThrow(/Slot/);
    expect(() => pruneCatalog(basic, {components: [], functions: ['openStore']})).toThrow(
      /openStore/,
    );
  });

  test('never edits its input', () => {
    const before = JSON.stringify(basic);
    pruneCatalog(basic, keep);
    expect(JSON.stringify(basic)).toBe(before);
  });

  test('the validator over a pruned catalog refuses what was dropped', () => {
    const validator = createA2uiValidator({catalog: pruneCatalog(basic, keep)});
    const paint = (components: unknown[]) => [
      {version: 'v0.9', createSurface: {surfaceId: 's', catalogId: 'c'}},
      {version: 'v0.9', updateComponents: {surfaceId: 's', components}},
    ];
    expect(validator.validate(paint([{id: 'root', component: 'Column', children: []}]))).toEqual(
      [],
    );
    expect(
      validator.validate(paint([{id: 'root', component: 'Image', url: 'https://x/y.png'}])),
    ).toEqual([expect.objectContaining({message: 'Unknown component type: "Image"'})]);
  });
});
