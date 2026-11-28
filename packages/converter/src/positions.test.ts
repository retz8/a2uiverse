/**
 * The protocol's own positions come from its schemas (task-21.11 decision 3): the converter's
 * table of the common types names every `$defs` entry of the pinned v0.9.1 `common_types.json`,
 * each with the properties the schema gives it, and the messages it rewrites carry the fields
 * `server_to_client.json` gives them.
 */
import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {COMMON_POSITIONS} from './positions.js';

const read = (name: string) =>
  JSON.parse(readFileSync(new URL(`../spec/v0_9_1/${name}`, import.meta.url), 'utf8')) as {
    $defs: Record<string, Record<string, unknown>>;
  };
const common = read('common_types.json').$defs;
const messages = read('server_to_client.json').$defs;
const propertiesOf = (schema: unknown) =>
  Object.keys((schema as {properties?: object}).properties ?? {}).sort();

describe('the v0.9.1 common types', () => {
  it('each has a position', () => {
    expect(Object.keys(COMMON_POSITIONS).sort()).toEqual(Object.keys(common).sort());
  });

  it('hold the properties the table reads', () => {
    expect(propertiesOf(common.ComponentCommon)).toEqual(['accessibility', 'id']);
    expect(propertiesOf(common.Checkable)).toEqual(['checks']);
    expect(propertiesOf(common.CheckRule)).toEqual(['condition', 'message']);
    expect(propertiesOf(common.AccessibilityAttributes)).toEqual(['description', 'label']);
    expect(propertiesOf(common.DataBinding)).toEqual(['path']);
    expect(propertiesOf(common.FunctionCall)).toEqual(['args', 'call', 'returnType']);
    const action = common.Action!.oneOf as Record<string, unknown>[];
    expect(action.map(propertiesOf)).toEqual([['event'], ['functionCall']]);
    expect(propertiesOf((action[0]!.properties as Record<string, unknown>).event)).toEqual([
      'context',
      'name',
    ]);
  });
});

describe('the v0.9.1 messages', () => {
  it('carry the fields the converter rewrites or keeps', () => {
    const body = (name: string, key: string) =>
      propertiesOf((messages[name]!.properties as Record<string, unknown>)[key]);
    expect(body('CreateSurfaceMessage', 'createSurface')).toEqual([
      'catalogId',
      'sendDataModel',
      'surfaceId',
      'theme',
    ]);
    expect(body('UpdateComponentsMessage', 'updateComponents')).toEqual([
      'components',
      'surfaceId',
    ]);
    expect(body('UpdateDataModelMessage', 'updateDataModel')).toEqual([
      'path',
      'surfaceId',
      'value',
    ]);
    expect(body('DeleteSurfaceMessage', 'deleteSurface')).toEqual(['surfaceId']);
  });
});
