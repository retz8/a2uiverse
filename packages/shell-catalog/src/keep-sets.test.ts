// @vitest-environment node
/**
 * The two keep-sets (task-6.3 decision 5) prune the catalog cleanly, and each pruned catalog is the
 * vocabulary of its surface: what its author may write validates, and what belongs to the other
 * surface does not.
 */
import {readFileSync} from 'node:fs';
import {createA2uiValidator, pruneCatalog, type A2uiCatalogSchema} from '@a2uiverse/sdk';
import {describe, expect, test} from 'vitest';
import {LAYOUT_SURFACE_KEEP_SET, SYNTHESIS_SURFACE_KEEP_SET} from './keep-sets';

const catalog = JSON.parse(
  readFileSync('catalogs/v0.9.1/catalog.json', 'utf8'),
) as A2uiCatalogSchema;

const paint = (components: unknown[]) => [
  {version: 'v0.9', createSurface: {surfaceId: 's', catalogId: 'c'}},
  {version: 'v0.9', updateComponents: {surfaceId: 's', components}},
];

const messages = (validator: ReturnType<typeof createA2uiValidator>, components: unknown[]) =>
  validator.validate(paint(components)).map(f => f.message);

describe('the synthesis surface keep-set', () => {
  const pruned = pruneCatalog(catalog, SYNTHESIS_SURFACE_KEEP_SET);
  const validator = createA2uiValidator({catalog: pruned});

  test('keeps the merged view’s components and the formula operators, nothing else', () => {
    expect(Object.keys(pruned.components!).sort()).toEqual(
      [...SYNTHESIS_SURFACE_KEEP_SET.components].sort(),
    );
    expect(Object.keys(pruned.functions!).sort()).toEqual(
      [...SYNTHESIS_SURFACE_KEEP_SET.functions].sort(),
    );
  });

  test('a merged view validates; a layout primitive, an input and a button do not', () => {
    const view = [
      {id: 'root', component: 'Column', children: ['sort', 'table']},
      {id: 'sort', component: 'SortControl', sort: {path: '/sorts/0'}},
      {
        id: 'table',
        component: 'Table',
        columns: ['Item'],
        children: {path: '/rows', componentId: 'row'},
      },
      {id: 'row', component: 'TableRow', children: ['cell']},
      {id: 'cell', component: 'DerivedValue', cell: {path: 'item'}},
    ];
    expect(messages(validator, view)).toEqual([]);
    for (const name of ['Slot', 'Attribution', 'Frame', 'TextField', 'Button']) {
      expect(messages(validator, [{id: 'root', component: name}])).toEqual([
        `Unknown component type: "${name}"`,
      ]);
    }
  });
});

describe('the layout surface keep-set', () => {
  const pruned = pruneCatalog(catalog, LAYOUT_SURFACE_KEEP_SET);
  const validator = createA2uiValidator({catalog: pruned});

  test('keeps the layout’s components and the shell actions, nothing else', () => {
    expect(Object.keys(pruned.components!).sort()).toEqual(
      [...LAYOUT_SURFACE_KEEP_SET.components].sort(),
    );
    expect(Object.keys(pruned.functions!).sort()).toEqual(
      [...LAYOUT_SURFACE_KEEP_SET.functions].sort(),
    );
  });

  test('slots with the shell’s words and a Store button validate; Attribution, Frame and a formula view do not', () => {
    const layout = [
      {id: 'root', component: 'Column', children: ['heading', 'row', 'store']},
      {id: 'heading', component: 'Text', text: 'Your morning', variant: 'h3'},
      {id: 'row', component: 'Row', children: ['gmail', 'flights']},
      {id: 'gmail', component: 'Slot', source: 'gmail', weight: 2},
      {id: 'flights', component: 'Slot', gap: 'flight booking'},
      {
        id: 'store',
        component: 'Button',
        child: 'store-label',
        action: {functionCall: {call: 'openStore', args: {query: 'flights'}}},
      },
      {id: 'store-label', component: 'Text', text: 'Find an app'},
    ];
    expect(messages(validator, layout)).toEqual([]);
    for (const name of ['Attribution', 'Frame', 'DerivedValue', 'SortControl']) {
      expect(messages(validator, [{id: 'root', component: name}])).toEqual([
        `Unknown component type: "${name}"`,
      ]);
    }
    expect(
      messages(validator, [{id: 'root', component: 'Slot', source: 'gmail', gap: 'flights'}]),
    ).not.toEqual([]);
    const openUrl = [
      {
        id: 'root',
        component: 'Button',
        child: 'l',
        action: {functionCall: {call: 'openUrl', args: {url: 'https://x'}}},
      },
      {id: 'l', component: 'Text', text: 'Go'},
    ];
    expect(messages(validator, openUrl)).toEqual(['Unknown function: "openUrl"']);
  });
});
