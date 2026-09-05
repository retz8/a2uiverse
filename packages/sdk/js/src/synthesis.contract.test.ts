/** Asserts the synthesis half of the projection — the synthesize data model — against the normative contract. */
import {readFileSync} from 'node:fs';
import {expect, test} from 'vitest';
import {COMPOSITION_EXTENSION_URI, STAMP_KEY} from './composition';
import {
  readSynthesis,
  SYNTHESIS_KEY,
  SYNTHESIS_SCHEMA,
  SYNTHESIZE_DATA_MODEL_SCHEMA,
  type SynthesisPayload,
} from './synthesis';

const contract = JSON.parse(
  readFileSync(new URL('../../contracts/composition.v0.3.json', import.meta.url), 'utf8'),
) as {
  version: string;
  extensionUri: string;
  stampKey: string;
  synthesisKey: string;
  shapes: {
    compositionStamp: {direction: string};
    synthesizeDataModel: {
      direction: string;
      a2uiVersion: string;
      schemas: {synthesizeDataModel: unknown; synthesis: unknown};
    };
  };
};

test('one version line: file, version, extension URI', () => {
  expect(contract.version).toBe('0.3.0');
  expect(contract.extensionUri).toBe('https://a2uiverse.dev/ext/composition/v0.3');
  expect(COMPOSITION_EXTENSION_URI).toBe(contract.extensionUri);
});

test('the synthesis key matches the contract and is not the stamp key', () => {
  expect(SYNTHESIS_KEY).toBe(contract.synthesisKey);
  expect(SYNTHESIS_KEY).toBe('a2uiverseSynthesis');
  expect(SYNTHESIS_KEY).not.toBe(STAMP_KEY);
});

test('the contract carries the stamp and the synthesize data model, both orchestrator → client', () => {
  expect(Object.keys(contract.shapes)).toEqual(['compositionStamp', 'synthesizeDataModel']);
  expect(contract.shapes.compositionStamp.direction).toBe('orchestrator → client');
  expect(contract.shapes.synthesizeDataModel.direction).toBe('orchestrator → client');
  expect(contract.shapes.synthesizeDataModel.a2uiVersion).toBe('v0.9');
});

test('the embedded schemas are the contract schemas', () => {
  const {schemas} = contract.shapes.synthesizeDataModel;
  expect(SYNTHESIZE_DATA_MODEL_SCHEMA).toEqual(schemas.synthesizeDataModel);
  expect(SYNTHESIS_SCHEMA).toEqual(schemas.synthesis);
});

test('the model-facing schema is a oneOf of a synthesis and a decline', () => {
  const output = SYNTHESIZE_DATA_MODEL_SCHEMA as {oneOf: {required: string[]}[]};
  expect(output.oneOf.map(branch => [...branch.required].sort())).toEqual([
    ['dataModel', 'note', 'sorts', 'tree'],
    ['declined', 'reason'],
  ]);
});

test('the derived model is recursive: a node is a formula, an object of nodes, or an array of nodes', () => {
  const defs = (SYNTHESIZE_DATA_MODEL_SCHEMA as {$defs: Record<string, {oneOf?: unknown[]}>}).$defs;
  expect(defs.node.oneOf).toHaveLength(3);
  expect(JSON.stringify(defs.node)).toContain('#/$defs/node');
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
  computedAgainst: {'gmail:inbox': 1},
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
  const {computedAgainst: _dropped, ...noEnvelope} = payload;
  void _dropped;
  expect(readSynthesis({[SYNTHESIS_KEY]: noEnvelope})).toBeUndefined();
});
