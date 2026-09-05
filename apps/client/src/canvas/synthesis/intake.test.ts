/** Intake (task-5.5 decision 6): the sdk's validator for the shape, the client for the operators. */
import {describe, expect, test} from 'vitest';
import {OPERATORS} from '@a2uiverse/shell-catalog';
import {PAYLOAD} from '../../beats/synthesisFixture';
import {validatePayload} from './intake';

describe('validatePayload', () => {
  test('the example payload passes and is returned as the sdk typed it', () => {
    expect(validatePayload(PAYLOAD, OPERATORS)).toEqual({ok: true, payload: PAYLOAD});
  });

  test('a contract violation is reported by the sdk’s path and message', () => {
    const scalar = {...PAYLOAD, dataModel: {rows: [{name: 'literal'}]}};
    expect(validatePayload(scalar, OPERATORS)).toMatchObject({
      ok: false,
      path: expect.stringMatching(/^\/dataModel\/rows/),
      message: expect.any(String),
    });
    const badSort = {...PAYLOAD, sorts: [{...PAYLOAD.sorts[0]!, key: '/rating'}]};
    expect(validatePayload(badSort, OPERATORS)).toMatchObject({ok: false, path: '/sorts/0'});
    expect(validatePayload({dataModel: PAYLOAD.dataModel}, OPERATORS)).toMatchObject({
      ok: false,
      path: '/',
    });
  });

  test('an operator the shell catalog does not declare is reported with the leaf’s path', () => {
    const rows = structuredClone(PAYLOAD.dataModel.rows) as unknown as Array<{best: {op: string}}>;
    rows[0]!.best.op = 'median';
    expect(validatePayload({...PAYLOAD, dataModel: {rows}}, OPERATORS)).toEqual({
      ok: false,
      path: '/dataModel/rows/0/best/op',
      message: 'unknown operator: median',
    });
  });

  test('whether a ref resolves is not validation', () => {
    const rows = structuredClone(PAYLOAD.dataModel.rows) as unknown as Array<{
      best: {args: {surface: string; pointer: string}[]};
    }>;
    rows[0]!.best.args[0]!.pointer = '/items[id="nowhere"]/price';
    rows[0]!.best.args[1]!.surface = 'shop-c:list';
    expect(validatePayload({...PAYLOAD, dataModel: {rows}}, OPERATORS).ok).toBe(true);
  });
});
