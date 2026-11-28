// @vitest-environment node
/**
 * The React-free face (task-5.4 decision 5): the same components as the rendering catalog,
 * usable by a headless MessageProcessor in a process with no DOM.
 */
import {readFileSync} from 'node:fs';
import {MessageProcessor} from '@a2ui/web_core/v1_0';
import {expect, test} from 'vitest';
import {CATALOG_ID} from './catalog-id';
import {SCHEMA_CATALOG} from './schema';

const schema = JSON.parse(readFileSync('catalogs/v1.0/catalog.json', 'utf8')) as {
  components: Record<string, unknown>;
  functions: Record<string, unknown>;
};

test('runs where there is no DOM', () => {
  expect(typeof document).toBe('undefined');
  expect(SCHEMA_CATALOG.id).toBe(CATALOG_ID);
});

test('declares exactly the schema’s components and functions', () => {
  expect([...SCHEMA_CATALOG.components.keys()].sort()).toEqual(
    Object.keys(schema.components).sort(),
  );
  // Less the system functions (`@index`), which no catalog document declares.
  expect([...SCHEMA_CATALOG.functions.keys()].filter(name => !name.startsWith('@')).sort()).toEqual(
    Object.keys(schema.functions).sort(),
  );
});

function processorWith(components: Array<Record<string, unknown>>): () => void {
  const processor = new MessageProcessor([SCHEMA_CATALOG]);
  return () =>
    processor.processMessages([
      {version: '1.0', createSurface: {surfaceId: 's', catalogId: CATALOG_ID}},
      {version: '1.0', updateComponents: {surfaceId: 's', components}},
    ] as never);
}

test('a headless processor accepts a merged-view tree and rejects a bad prop', () => {
  expect(
    processorWith([
      {id: 'root', component: 'Column', children: ['sort', 'rows']},
      {id: 'sort', component: 'SortControl', sort: {'@path': '/sorts/0'}},
      {id: 'rows', component: 'Column', children: {path: '/rows', componentId: 'row'}},
      {id: 'row', component: 'Row', children: ['cell']},
      {id: 'cell', component: 'DerivedValue', cell: {'@path': 'best'}, format: {kind: 'number'}},
    ]),
  ).not.toThrow();
  expect(processorWith([{id: 'root', component: 'DerivedValue', cell: 'a literal'}])).toThrow(
    /DerivedValue/,
  );
  expect(processorWith([{id: 'root', component: 'Text', text: 'x', variant: 'huge'}])).toThrow(
    /Text/,
  );
});

test('a headless processor refuses a credential input: no `obscured` TextField (task 12.3)', () => {
  expect(
    processorWith([
      {id: 'root', component: 'TextField', label: 'Name', value: '', variant: 'shortText'},
    ]),
  ).not.toThrow();
  expect(
    processorWith([
      {id: 'root', component: 'TextField', label: 'Password', value: '', variant: 'obscured'},
    ]),
  ).toThrow(/TextField/);
});

test('the two guidance docs ship beside the schema', () => {
  const synthesis = readFileSync('docs/synthesis-guidance.md', 'utf8');
  expect(synthesis).toContain('DerivedValue');
  expect(synthesis).toContain('/sorts/N');
  expect(synthesis).toContain('`match`');
  expect(synthesis).toContain('`judged`');
  const platformUi = readFileSync('docs/platform-ui-guidance.md', 'utf8');
  expect(platformUi).toContain('openStore');
  expect(platformUi).toContain('openAppLibrary');
  expect(platformUi).toContain('openPublish');
});

test('the two guidance docs write v1.0’s forms: `@path` and `@call`, a heading as its markers (task-21.12 decision 8)', () => {
  const synthesis = readFileSync('docs/synthesis-guidance.md', 'utf8');
  const platformUi = readFileSync('docs/platform-ui-guidance.md', 'utf8');
  expect(synthesis).toContain('{"@path": "price"}');
  expect(synthesis).toContain('"##### ');
  expect(platformUi).toContain('{"@path": "name"}');
  expect(platformUi).toContain('{"functionCall": {"@call": "openStore"');
  expect(platformUi).toContain('"### ');
  for (const doc of [synthesis, platformUi]) {
    // A call is written `@call`, never `call`.
    expect(doc).not.toMatch(/"call":/);
    // A heading is a text's markers, never a variant.
    expect(doc).not.toMatch(/`h[1-6]`|"variant": ?"h[1-6]"/);
    // A template's path stays plain.
    expect(doc).toMatch(/\{"path": "\/[a-z]+", "componentId": "[a-z_]+"\}/);
  }
});
