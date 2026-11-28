/**
 * The entitlement rule (task-21.10 decisions 7 and 23.4): a paint naming a catalog outside the
 * entitlement in each of the four places is found there, the place and the catalog named.
 */
import {describe, expect, test} from 'vitest';
import type {A2uiCatalogSchema} from './a2ui/types';
import {catalogsNamed, catalogsOutside, describeCatalogOutside} from './entitlementRule';

const IN = 'https://vendor.example/catalog.json';
const OUT = 'https://other.example/catalog.json';
const entitlement = [IN];

/** A catalog whose `Table` declares a `catalogId` property of its own, and whose `Text` does not. */
const vendor: A2uiCatalogSchema = {
  catalogId: IN,
  components: {
    Text: {type: 'object', properties: {component: {const: 'Text'}, text: {type: 'string'}}},
    Table: {
      type: 'object',
      allOf: [{$ref: '#/$defs/Sourced'}, {properties: {component: {const: 'Table'}}}],
    },
  },
  $defs: {Sourced: {properties: {catalogId: {type: 'string'}}}},
};
const schemaFor = (id: string) => (id === IN ? vendor : undefined);

const create = (catalogId?: string) => ({
  version: '1.0',
  createSurface: {surfaceId: 's', ...(catalogId !== undefined ? {catalogId} : {})},
});
const update = (...components: unknown[]) => ({
  version: '1.0',
  updateComponents: {surfaceId: 's', components},
});

describe('the four places', () => {
  test("createSurface's catalogId", () => {
    expect(catalogsOutside([create(OUT)], entitlement)).toEqual([
      {place: 'createSurface', catalogId: OUT, path: '/0/createSurface/catalogId', surfaceId: 's'},
    ]);
  });

  test("a component's @catalogId, in an update and in a createSurface", () => {
    const text = {id: 'root', component: 'Text', text: 'x', '@catalogId': OUT};
    expect(catalogsOutside([create(IN), update(text)], entitlement)).toEqual([
      {
        place: 'component',
        catalogId: OUT,
        path: '/1/updateComponents/components/0/@catalogId',
        surfaceId: 's',
      },
    ]);
    expect(
      catalogsOutside(
        [{version: '1.0', createSurface: {surfaceId: 's', catalogId: IN, components: [text]}}],
        entitlement,
      ).map(o => o.path),
    ).toEqual(['/0/createSurface/components/0/@catalogId']);
  });

  test("a component's bare catalogId, read when its schema declares no property of that name", () => {
    const text = {id: 'root', component: 'Text', text: 'x', catalogId: OUT};
    expect(catalogsOutside([create(IN), update(text)], entitlement, {schemaFor})).toEqual([
      {
        place: 'bareComponent',
        catalogId: OUT,
        path: '/1/updateComponents/components/0/catalogId',
        surfaceId: 's',
      },
    ]);
    const table = {id: 'root', component: 'Table', catalogId: OUT};
    expect(catalogsOutside([create(IN), update(table)], entitlement, {schemaFor})).toEqual([]);
    // A default the checker does not hold reads every bare catalogId as the component's.
    expect(catalogsOutside([create(IN), update(table)], entitlement).map(o => o.place)).toEqual([
      'bareComponent',
    ]);
  });

  test("a bare catalogId on a surface created in an earlier event, read by the surface's default the caller names", () => {
    const table = {id: 'root', component: 'Table', catalogId: OUT};
    const surfaceCatalog = (id: string) => (id === 's' ? IN : undefined);
    expect(catalogsOutside([update(table)], entitlement, {schemaFor, surfaceCatalog})).toEqual([]);
    // A create in the messages is read before the caller's record.
    expect(
      catalogsOutside([create(), update(table)], entitlement, {schemaFor, surfaceCatalog}).map(
        o => o.place,
      ),
    ).toEqual(['bareComponent']);
  });

  test("a function call's catalogId: in a property, in an action, in callRendererFunction", () => {
    const call = {'@call': 'formatString', catalogId: OUT, args: {value: 'x'}};
    const text = {id: 'root', component: 'Text', text: call};
    const button = {
      id: 'go',
      component: 'Button',
      child: 'root',
      action: {functionCall: {'@call': 'openUrl', catalogId: OUT, args: {url: 'https://x'}}},
    };
    const rendererCall = {
      version: '1.0',
      callRendererFunction: {surfaceId: 's', functionCallId: 'c1', callFunction: call},
    };
    expect(catalogsOutside([create(IN), update(text, button), rendererCall], entitlement)).toEqual([
      {
        place: 'functionCall',
        catalogId: OUT,
        path: '/1/updateComponents/components/0/text/catalogId',
        surfaceId: 's',
      },
      {
        place: 'functionCall',
        catalogId: OUT,
        path: '/1/updateComponents/components/1/action/functionCall/catalogId',
        surfaceId: 's',
      },
      {
        place: 'functionCall',
        catalogId: OUT,
        path: '/2/callRendererFunction/callFunction/catalogId',
        surfaceId: 's',
      },
    ]);
  });

  test('each finding names the place and the catalog', () => {
    const [outside] = catalogsOutside([create(OUT)], entitlement);
    expect(describeCatalogOutside(outside!)).toBe(
      `its createSurface names catalog "${OUT}", outside its entitlement (/0/createSurface/catalogId)`,
    );
  });
});

describe('inside', () => {
  test('a paint naming only entitled catalogs, or none, is inside', () => {
    const call = {'@call': 'formatString', catalogId: IN, args: {value: 'x'}};
    expect(
      catalogsOutside(
        [create(IN), update({id: 'root', component: 'Text', text: call, '@catalogId': IN})],
        entitlement,
      ),
    ).toEqual([]);
    expect(catalogsOutside([create(), update({id: 'root', component: 'Text'})], [])).toEqual([]);
  });

  test('a call written call, not @call, names no catalog to this rule', () => {
    const text = {id: 'root', component: 'Text', text: {call: 'x', catalogId: OUT}};
    expect(catalogsNamed([create(IN), update(text)]).map(n => n.place)).toEqual(['createSurface']);
  });
});
