/** Asserts this projection against the normative contract (`packages/sdk/contracts`). Drift is a red build. */
import {readFileSync} from 'node:fs';
import {expect, test} from 'vitest';
import {
  COMPOSITION_EXTENSION_URI,
  STAMP_FIELDS,
  STAMP_KEY,
  SURFACE_NS_SEPARATOR,
  namespaceSurfaceId,
  parseSurfaceId,
  readStamp,
} from './composition';

const contract = JSON.parse(
  readFileSync(new URL('../../contracts/composition.v0.6.json', import.meta.url), 'utf8'),
) as {
  extensionUri: string;
  stampKey: string;
  surfaceIdSeparator: string;
  shapes: Record<string, {direction: string; required?: string[]; optional?: string[]}>;
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

test('the contract carries no vendor-facing shape', () => {
  expect(Object.keys(contract.shapes)).toEqual(['compositionStamp', 'synthesizeDataModel']);
  for (const shape of Object.values(contract.shapes)) {
    expect(shape.direction).toBe('orchestrator → client');
  }
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
