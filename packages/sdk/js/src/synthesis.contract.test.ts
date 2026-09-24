/** Asserts the synthesis half of the projection — the synthesis payload — against the normative contract. */
import {readFileSync} from 'node:fs';
import {expect, test} from 'vitest';
import {COMPOSITION_EXTENSION_URI, STAMP_KEY} from './composition';
import {
  MATCH_KEY,
  readSynthesis,
  SYNTHESIS_KEY,
  SYNTHESIS_SCHEMA,
  type SynthesisPayload,
} from './synthesis';

const contract = JSON.parse(
  readFileSync(new URL('../../contracts/composition.v0.8.json', import.meta.url), 'utf8'),
) as {
  version: string;
  extensionUri: string;
  stampKey: string;
  synthesisKey: string;
  matchKey: string;
  shapes: {
    compositionStamp: {direction: string};
    compositionOperation: {direction: string};
    synthesizeDataModel: {
      direction: string;
      schemas: Record<string, unknown>;
    };
  };
};

test('one version line: file, version, extension URI', () => {
  expect(contract.version).toBe('0.8.0');
  expect(contract.extensionUri).toBe('https://a2uiverse.dev/ext/composition/v0.8');
  expect(COMPOSITION_EXTENSION_URI).toBe(contract.extensionUri);
});

test('the synthesis key matches the contract and is not the stamp key', () => {
  expect(SYNTHESIS_KEY).toBe(contract.synthesisKey);
  expect(SYNTHESIS_KEY).toBe('a2uiverseSynthesis');
  expect(SYNTHESIS_KEY).not.toBe(STAMP_KEY);
});

test('the contract carries the stamp, paintMeta and the synthesis payload orchestrator → client, the parent and the operation back', () => {
  expect(Object.keys(contract.shapes)).toEqual([
    'compositionStamp',
    'canvasParent',
    'compositionOperation',
    'paintMeta',
    'synthesizeDataModel',
  ]);
  expect(contract.shapes.compositionStamp.direction).toBe('orchestrator → client');
  expect(contract.shapes.compositionOperation.direction).toBe('client → orchestrator');
  expect(contract.shapes.synthesizeDataModel.direction).toBe('orchestrator → client');
});

test('the embedded schema is the contract schema, and the contract carries no model-facing shape', () => {
  const {schemas} = contract.shapes.synthesizeDataModel;
  expect(Object.keys(schemas)).toEqual(['synthesis']);
  expect(SYNTHESIS_SCHEMA).toEqual(schemas.synthesis);
});

test('the derived model is recursive: a node is a formula, an object of nodes, or an array of nodes', () => {
  const defs = (SYNTHESIS_SCHEMA as {$defs: Record<string, {oneOf?: unknown[]}>}).$defs;
  expect(defs.node.oneOf).toHaveLength(3);
  expect(JSON.stringify(defs.node)).toContain('#/$defs/node');
});

test('the match key matches the contract', () => {
  expect(MATCH_KEY).toBe(contract.matchKey);
  expect(MATCH_KEY).toBe('match');
});

test('a match claim is a non-empty, flat object of relations, each a formula over exactly two refs', () => {
  const defs = (
    SYNTHESIS_SCHEMA as {
      $defs: Record<string, {properties?: Record<string, unknown>; oneOf?: unknown[]}>;
    }
  ).$defs;
  expect(defs.match).toMatchObject({
    type: 'object',
    minProperties: 1,
    additionalProperties: {$ref: '#/$defs/relation'},
  });
  expect(defs.relation.properties?.args).toMatchObject({minItems: 2, maxItems: 2});
  expect(defs.dataModel.properties?.[MATCH_KEY]).toEqual({$ref: '#/$defs/match'});
  expect(defs.node.oneOf?.[1]).toMatchObject({properties: {[MATCH_KEY]: {$ref: '#/$defs/match'}}});
});

const payload: SynthesisPayload = {
  dataModel: {
    entries: [
      {
        when: {
          op: 'value',
          args: [{surface: 'gmail:inbox', pointer: '/messages[id="m_1"]/receivedAt'}],
        },
        what: {
          op: 'value',
          args: [{surface: 'gmail:inbox', pointer: '/messages[id="m_1"]/subject'}],
        },
      },
    ],
  },
  sorts: [
    {
      path: '/entries',
      options: [{key: '/when', label: 'Time'}],
      key: '/when',
      direction: 'asc',
    },
  ],
};

test('readSynthesis returns the payload under the synthesis key', () => {
  expect(readSynthesis({[STAMP_KEY]: {source: 'shell'}, [SYNTHESIS_KEY]: payload})).toEqual(
    payload,
  );
});

test('readSynthesis rejects absent or malformed metadata', () => {
  expect(readSynthesis(undefined)).toBeUndefined();
  expect(readSynthesis({})).toBeUndefined();
  expect(readSynthesis({[SYNTHESIS_KEY]: 'synthesis'})).toBeUndefined();
  expect(readSynthesis({[SYNTHESIS_KEY]: [payload]})).toBeUndefined();
  const {sorts: _dropped, ...incomplete} = payload;
  void _dropped;
  expect(readSynthesis({[SYNTHESIS_KEY]: incomplete})).toBeUndefined();
});

test('a sort path passes through the enclosing arrays with * (task-7.12)', () => {
  const sort = (SYNTHESIS_SCHEMA as {$defs: {sort: {properties: {path: {description: string}}}}})
    .$defs.sort;
  expect(sort.properties.path.description).toContain('/rows/*/runs');
});
