/** Asserts this projection against the normative contract (`packages/sdk/contracts`). Drift is a red build. */
import {readFileSync} from 'node:fs';
import {expect, test} from 'vitest';
import {
  COMPOSITION_EXTENSION_URI,
  OPERATION_FIELDS,
  OPERATION_KINDS,
  STAMP_FIELDS,
  STAMP_KEY,
  SURFACE_NS_SEPARATOR,
  namespaceSurfaceId,
  operationData,
  parseSurfaceId,
  readOperation,
  readStamp,
} from './composition';

const contract = JSON.parse(
  readFileSync(new URL('../../contracts/composition.v0.7.json', import.meta.url), 'utf8'),
) as {
  extensionUri: string;
  stampKey: string;
  surfaceIdSeparator: string;
  shapes: Record<
    string,
    {direction: string; required?: string[]; optional?: string[]; kinds?: string[]}
  >;
};

test('constants match the contract', () => {
  expect(COMPOSITION_EXTENSION_URI).toBe(contract.extensionUri);
  expect(STAMP_KEY).toBe(contract.stampKey);
  expect(SURFACE_NS_SEPARATOR).toBe(contract.surfaceIdSeparator);
});

test('shape fields match the contract', () => {
  const stamp = contract.shapes.compositionStamp;
  expect([...STAMP_FIELDS].sort()).toEqual([...stamp.required!, ...stamp.optional!].sort());
});

test('the operation matches the contract: its fields and its kinds', () => {
  const operation = contract.shapes.compositionOperation!;
  expect(operation.direction).toBe('client → orchestrator');
  expect([...OPERATION_FIELDS].sort()).toEqual(
    [...operation.required!, ...operation.optional!].sort(),
  );
  expect([...OPERATION_KINDS]).toEqual(operation.kinds);
});

test('the contract carries no vendor-facing shape', () => {
  expect(Object.keys(contract.shapes)).toEqual([
    'compositionStamp',
    'compositionOperation',
    'synthesizeDataModel',
  ]);
  for (const shape of Object.values(contract.shapes)) {
    expect(['orchestrator → client', 'client → orchestrator']).toContain(shape.direction);
  }
});

test('an operation round-trips through its data part', () => {
  const data = operationData({kind: 'include', sources: ['github', 'circleci']}, 'v0.9');
  expect(data).toEqual({
    version: 'v0.9',
    operation: {kind: 'include', sources: ['github', 'circleci']},
  });
  expect(readOperation(data)).toEqual({kind: 'include', sources: ['github', 'circleci']});
  expect(readOperation(operationData({kind: 'retry', sources: ['gmail']}, 'v0.9'))).toEqual({
    kind: 'retry',
    sources: ['gmail'],
  });
  expect(readOperation(operationData({kind: 'tryAgain', sources: []}, 'v0.9'))).toEqual({
    kind: 'tryAgain',
    sources: [],
  });
});

test('readOperation refuses a malformed press: the kind, the sources, and how many the kind names', () => {
  const read = (operation: unknown, version: unknown = 'v0.9') =>
    readOperation({version, operation});
  expect(readOperation({operation: {kind: 'retry', sources: ['a']}})).toBeUndefined();
  expect(read('retry')).toBeUndefined();
  expect(read({kind: 'refresh', sources: []})).toBeUndefined();
  expect(read({kind: 'include', sources: 'github'})).toBeUndefined();
  expect(read({kind: 'include', sources: [1]})).toBeUndefined();
  expect(read({kind: 'include', sources: []})).toBeUndefined();
  expect(read({kind: 'include', sources: ['a', 'a']})).toBeUndefined();
  expect(read({kind: 'retry', sources: ['a', 'b']})).toBeUndefined();
  expect(read({kind: 'retry', sources: ['']})).toBeUndefined();
  expect(read({kind: 'tryAgain', sources: ['a']})).toBeUndefined();
});

test('surface id namespacing round-trips', () => {
  expect(namespaceSurfaceId('github', 'pr-list')).toBe('github:pr-list');
  expect(parseSurfaceId('github:pr-list')).toEqual({appId: 'github', surfaceId: 'pr-list'});
  expect(parseSurfaceId('gmail:chat:1')).toEqual({appId: 'gmail', surfaceId: 'chat:1'});
  expect(parseSurfaceId('un-namespaced')).toBeUndefined();
  expect(parseSurfaceId(':pr-list')).toBeUndefined();
  expect(parseSurfaceId('github:')).toBeUndefined();
});

test('readStamp accepts a stamped event and rejects malformed metadata', () => {
  expect(readStamp({[STAMP_KEY]: {source: 'github', role: 'fragment'}})).toEqual({
    source: 'github',
    role: 'fragment',
  });
  expect(readStamp(undefined)).toBeUndefined();
  expect(readStamp({})).toBeUndefined();
  expect(readStamp({[STAMP_KEY]: 'github'})).toBeUndefined();
  expect(readStamp({[STAMP_KEY]: {role: 'fragment'}})).toBeUndefined();
});

test('the stamp carries no generations', () => {
  const stamp = contract.shapes.compositionStamp;
  expect([...stamp.required!, ...stamp.optional!]).not.toContain('generations');
  expect(STAMP_FIELDS).not.toContain('generations');
});
