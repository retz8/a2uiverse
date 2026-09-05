// @vitest-environment node
/**
 * The React-free face (task-5.4 decision 5): the same components as the rendering catalog,
 * usable by a headless MessageProcessor in a process with no DOM.
 */
import {readFileSync} from 'node:fs';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import {expect, test} from 'vitest';
import {CATALOG_ID} from './catalog-id';
import {SCHEMA_CATALOG} from './schema';

const schema = JSON.parse(readFileSync('catalogs/v0.9.1/catalog.json', 'utf8')) as {
  components: Record<string, unknown>;
  functions: Record<string, unknown>;
};

test('runs where there is no DOM', () => {
  expect(typeof document).toBe('undefined');
  expect(SCHEMA_CATALOG.id).toBe(CATALOG_ID);
});

test('declares exactly the schema’s components and every schema function', () => {
  expect([...SCHEMA_CATALOG.components.keys()].sort()).toEqual(
    Object.keys(schema.components).sort(),
  );
  for (const name of Object.keys(schema.functions)) {
    expect(SCHEMA_CATALOG.functions.has(name), `function ${name}`).toBe(true);
  }
});

function processorWith(components: Array<Record<string, unknown>>): () => void {
  const processor = new MessageProcessor([SCHEMA_CATALOG]);
  return () =>
    processor.processMessages([
      {version: 'v0.9', createSurface: {surfaceId: 's', catalogId: CATALOG_ID}},
      {version: 'v0.9', updateComponents: {surfaceId: 's', components}},
    ] as never);
}

test('a headless processor accepts a merged-view tree and rejects a bad prop', () => {
  expect(
    processorWith([
      {id: 'root', component: 'Column', children: ['sort', 'rows']},
      {id: 'sort', component: 'SortControl', sort: {path: '/sorts/0'}},
      {id: 'rows', component: 'Column', children: {path: '/rows', componentId: 'row'}},
      {id: 'row', component: 'Row', children: ['cell']},
      {id: 'cell', component: 'DerivedValue', cell: {path: 'best'}, format: {kind: 'number'}},
    ]),
  ).not.toThrow();
  expect(processorWith([{id: 'root', component: 'DerivedValue', cell: 'a literal'}])).toThrow(
    /DerivedValue/,
  );
  expect(processorWith([{id: 'root', component: 'Text', text: 'x', variant: 'huge'}])).toThrow(
    /Text/,
  );
});

test('the guidance doc ships beside the schema', () => {
  const guidance = readFileSync('docs/guidance.md', 'utf8');
  expect(guidance).toContain('DerivedValue');
  expect(guidance).toContain('/sorts/N');
});
