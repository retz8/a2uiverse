/**
 * Intake (task-5.5 decision 6): the sdk's validator for the shape, the client for the operators —
 * and for their place: a match claim is written in the relations, and a relation nowhere else
 * (task-7.5 decision 5).
 */
import {describe, expect, test} from 'vitest';
import {OPERATORS, RELATIONS} from '@a2uiverse/shell-catalog';
import {PAYLOAD} from '../../beats/synthesisFixture';
import {validatePayload} from './intake';

describe('validatePayload', () => {
  test('the example payload passes and is returned as the sdk typed it', () => {
    expect(validatePayload(PAYLOAD, OPERATORS, RELATIONS)).toEqual({ok: true, payload: PAYLOAD});
  });

  test('a contract violation is reported by the sdk’s path and message', () => {
    const scalar = {...PAYLOAD, dataModel: {rows: [{name: 'literal'}]}};
    expect(validatePayload(scalar, OPERATORS, RELATIONS)).toMatchObject({
      ok: false,
      path: expect.stringMatching(/^\/dataModel\/rows/),
      message: expect.any(String),
    });
    const badSort = {...PAYLOAD, sorts: [{...PAYLOAD.sorts[0]!, key: '/rating'}]};
    expect(validatePayload(badSort, OPERATORS, RELATIONS)).toMatchObject({
      ok: false,
      path: '/sorts/0',
    });
    expect(validatePayload({dataModel: PAYLOAD.dataModel}, OPERATORS, RELATIONS)).toMatchObject({
      ok: false,
      path: '/',
    });
  });

  test('an operator the shell catalog does not declare is reported with the leaf’s path', () => {
    const rows = structuredClone(PAYLOAD.dataModel.rows) as unknown as Array<{best: {op: string}}>;
    rows[0]!.best.op = 'median';
    expect(validatePayload({...PAYLOAD, dataModel: {rows}}, OPERATORS, RELATIONS)).toEqual({
      ok: false,
      path: '/dataModel/rows/0/best/op',
      message: 'unknown operator: median',
    });
  });

  describe('relations live only in match', () => {
    const claimed = (op: string) => {
      const rows = structuredClone(PAYLOAD.dataModel.rows) as unknown as Array<
        Record<string, unknown> & {best: {args: unknown[]}}
      >;
      const [a, b] = rows[0]!.best.args;
      rows[0]!.match = {'same camera': {op, args: [a, b]}};
      return {...PAYLOAD, dataModel: {rows}};
    };

    test('a match claim written in relations passes', () => {
      for (const relation of RELATIONS) {
        expect(validatePayload(claimed(relation), OPERATORS, RELATIONS).ok).toBe(true);
      }
    });

    test('an operator inside a match claim is reported with the relation’s path', () => {
      expect(validatePayload(claimed('min'), OPERATORS, RELATIONS)).toEqual({
        ok: false,
        path: '/dataModel/rows/0/match/same camera/op',
        message: 'not a relation: min',
      });
    });

    test('a relation outside a match claim is reported with the leaf’s path', () => {
      const rows = structuredClone(PAYLOAD.dataModel.rows) as unknown as Array<{
        best: {op: string};
      }>;
      rows[0]!.best.op = 'equal';
      expect(validatePayload({...PAYLOAD, dataModel: {rows}}, OPERATORS, RELATIONS)).toEqual({
        ok: false,
        path: '/dataModel/rows/0/best/op',
        message: 'a relation outside match: equal',
      });
    });
  });

  test('whether a ref resolves is not validation', () => {
    const rows = structuredClone(PAYLOAD.dataModel.rows) as unknown as Array<{
      best: {args: {surface: string; pointer: string}[]};
    }>;
    rows[0]!.best.args[0]!.pointer = '/items[id="nowhere"]/price';
    rows[0]!.best.args[1]!.surface = 'shop-c:list';
    expect(validatePayload({...PAYLOAD, dataModel: {rows}}, OPERATORS, RELATIONS).ok).toBe(true);
  });
});
