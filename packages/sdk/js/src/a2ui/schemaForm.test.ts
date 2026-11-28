/**
 * The schema-form check (task-21.10 decisions 10 and 23.2): every example of upstream's v1 basic
 * catalog, at the pinned commit, passes it and the validator; the check refuses the three forms
 * the release accepts and the v1.0 schema does not.
 */
import {readdirSync, readFileSync} from 'node:fs';
import {describe, expect, test} from 'vitest';
import {createSchemaFormCheck} from './schemaForm';
import type {A2uiCatalogSchema} from './types';
import {createA2uiValidator} from './validator';

const spec = new URL('../../../a2ui-spec/', import.meta.url);
const examples = new URL('catalogs/basic/v1/examples/', spec);
const basic = JSON.parse(
  readFileSync(new URL('catalogs/basic/v1/catalog.json', spec), 'utf8'),
) as A2uiCatalogSchema;
const BASIC = basic.catalogId as string;

const check = createSchemaFormCheck({catalog: basic});
const validator = createA2uiValidator({catalogs: [basic]});

const files = readdirSync(examples).filter(name => name.endsWith('.json'));

describe("upstream's v1 basic catalog examples", () => {
  test('the pinned copy holds them', () => {
    expect(files).toHaveLength(43);
  });

  for (const file of files) {
    test(file, () => {
      const {messages} = JSON.parse(readFileSync(new URL(file, examples), 'utf8')) as {
        messages: unknown[];
      };
      expect(check.agentToRenderer(messages)).toEqual([]);
      expect(validator.validate(messages)).toEqual([]);
    });
  }
});

describe('the three forms the release accepts and the schema does not', () => {
  const create = {version: '1.0', createSurface: {surfaceId: 's', catalogId: BASIC}};
  const text = (value: unknown) => ({
    version: '1.0',
    updateComponents: {surfaceId: 's', components: [{id: 'root', component: 'Text', text: value}]},
  });

  test('a binding written path', () => {
    const paint = [create, text({path: '/name'})];
    expect(validator.validate(paint)).toEqual([]);
    expect(check.agentToRenderer(paint)).toEqual([
      expect.objectContaining({path: '/1/updateComponents/components/0/text'}),
    ]);
    expect(check.agentToRenderer([create, text({'@path': '/name'})])).toEqual([]);
  });

  test('a call written call', () => {
    const paint = [create, text({call: 'formatString', args: {value: 'x'}})];
    expect(validator.validate(paint)).toEqual([]);
    expect(check.agentToRenderer(paint)).toEqual([
      expect.objectContaining({path: '/1/updateComponents/components/0/text'}),
    ]);
    expect(
      check.agentToRenderer([create, text({'@call': 'formatString', args: {value: 'x'}})]),
    ).toEqual([]);
  });

  test('an updateDataModel with no value', () => {
    const update = {version: '1.0', updateDataModel: {surfaceId: 's', path: '/a'}};
    expect(validator.validate([create, update])).toEqual([]);
    expect(check.agentToRenderer([create, update])).toEqual([
      {
        category: 'ValidationError',
        path: '/1/updateDataModel',
        message: 'must have required property \'value\' ("value")',
      },
    ]);
    const deletion = {version: '1.0', updateDataModel: {surfaceId: 's', path: '/a', value: null}};
    expect(check.agentToRenderer([create, deletion])).toEqual([]);
  });
});

describe('the envelope', () => {
  test('a message stamped otherwise, or carrying no one operation, is refused', () => {
    expect(check.agentToRenderer({version: 'v0.9', deleteSurface: {surfaceId: 's'}})).toEqual([
      expect.objectContaining({path: '/0/version'}),
    ]);
    expect(check.agentToRenderer({version: '1.0'})).toEqual([
      expect.objectContaining({path: '/0', message: expect.stringMatching(/^a message carries/)}),
    ]);
  });

  test('a renderer-to-agent action holds; a v0.9 one does not', () => {
    const action = {
      name: 'open',
      surfaceId: 's',
      sourceComponentId: 'go',
      timestamp: '2026-11-28T10:00:00Z',
      context: {},
    };
    expect(check.rendererToAgent({version: '1.0', action})).toEqual([]);
    expect(check.rendererToAgent({version: 'v0.9', action})).not.toEqual([]);
  });
});
