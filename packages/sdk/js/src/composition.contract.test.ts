/** Asserts this projection against the normative contract (`packages/sdk/contracts`). Drift is a red build. */
import {readFileSync} from 'node:fs';
import {expect, test} from 'vitest';
import {
  COMPOSITION_EXTENSION_URI,
  SLOT_ARCHETYPES,
  SLOT_REQUEST_FIELDS,
  STAMP_FIELDS,
  STAMP_KEY,
  SURFACE_NS_SEPARATOR,
  namespaceSurfaceId,
  parseSurfaceId,
  readSlotRequest,
  readStamp,
} from './composition';

const contract = JSON.parse(
  readFileSync(new URL('../../contracts/composition.v0.1.json', import.meta.url), 'utf8'),
) as {
  extensionUri: string;
  stampKey: string;
  surfaceIdSeparator: string;
  slotArchetypes: string[];
  shapes: Record<string, {required: string[]; optional: string[]}>;
};

test('constants match the contract', () => {
  expect(COMPOSITION_EXTENSION_URI).toBe(contract.extensionUri);
  expect(STAMP_KEY).toBe(contract.stampKey);
  expect(SURFACE_NS_SEPARATOR).toBe(contract.surfaceIdSeparator);
  expect([...SLOT_ARCHETYPES]).toEqual(contract.slotArchetypes);
});

test('shape fields match the contract', () => {
  const slotRequest = contract.shapes.slotRequest;
  expect([...SLOT_REQUEST_FIELDS].sort()).toEqual(
    [...slotRequest.required, ...slotRequest.optional].sort(),
  );
  const stamp = contract.shapes.compositionStamp;
  expect([...STAMP_FIELDS].sort()).toEqual([...stamp.required, ...stamp.optional].sort());
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
  expect(readStamp({[STAMP_KEY]: {source: 'github', slot: 'slot-github'}})).toEqual({
    source: 'github',
    slot: 'slot-github',
  });
  expect(readStamp(undefined)).toBeUndefined();
  expect(readStamp({})).toBeUndefined();
  expect(readStamp({[STAMP_KEY]: 'github'})).toBeUndefined();
  expect(readStamp({[STAMP_KEY]: {slot: 'slot-github'}})).toBeUndefined();
});

test('readSlotRequest accepts a well-shaped request and rejects malformed metadata', () => {
  expect(
    readSlotRequest({[COMPOSITION_EXTENSION_URI]: {archetype: 'panel', budget: 'medium'}}),
  ).toEqual({
    archetype: 'panel',
    budget: 'medium',
  });
  expect(readSlotRequest(undefined)).toBeUndefined();
  expect(readSlotRequest({[COMPOSITION_EXTENSION_URI]: {archetype: 'panel'}})).toBeUndefined();
});
