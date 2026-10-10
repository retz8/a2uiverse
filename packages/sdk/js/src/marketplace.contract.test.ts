/** Asserts the marketplace projection against the normative contracts (`packages/sdk/contracts`). Drift is a red build. */
import {readFileSync} from 'node:fs';
import {expect, test} from 'vitest';
import {
  BUILD_MOVE_FIELDS,
  CLAIM_REQUEST_FIELDS,
  CLAIM_RESPONSE_FIELDS,
  INDEX_ENTRY_SCHEMA,
  MARKETPLACE_ROUTES,
  NEW_SCOPES_FIELDS,
  PREVIEW_CAPTURED_BY,
  PREVIEW_SCHEMA,
  PUBLISH_CATALOG_FIELDS,
  PUBLISH_REQUEST_FIELDS,
  PUBLISH_RESPONSE_FIELDS,
  PUBLISHER_NAME_MAX_LENGTH,
  PUBLISHER_NAME_PATTERN,
  PUBLISHER_TOKEN_BYTES,
  PUBLISHER_TOKEN_PATTERN,
  REFUSAL_FIELDS,
  REPORT_REQUEST_FIELDS,
  RESERVED_PUBLISHER_NAMES,
  SEARCH_QUERY_PARAM,
  SEARCH_RESPONSE_FIELDS,
  SEARCH_RESULT_FIELDS,
  UNPUBLISH_REQUEST_FIELDS,
  UPDATE_STATE_DETAILS,
  UPDATE_STATE_FIELDS,
  UPDATE_STATES,
} from './marketplace';
import {SMOKE_GREETING} from './smoke';

const read = (name: string) =>
  JSON.parse(readFileSync(new URL(`../../contracts/${name}`, import.meta.url), 'utf8'));

const contract = read('marketplace.json') as {
  routes: Record<string, string>;
  searchQueryParam: string;
  publisher: {
    pattern: string;
    maxLength: number;
    reserved: string[];
    tokenBytes: number;
    tokenPattern: string;
  };
  smokeTest: {greeting: string};
  entry: {schema: string};
  preview: {schema: string; capturedBy: string[]};
  shapes: Record<
    string,
    {
      required: string[];
      optional?: string[];
      catalog?: string[];
      result?: string[];
      states?: Record<string, {required: string[]; optional: string[]}>;
      buildMove?: string[];
      newScopes?: string[];
    }
  >;
};

test('no version line of its own: the sdk is the version', () => {
  expect(contract).not.toHaveProperty('version');
});

test('the route layout and the search parameter', () => {
  const {rule: _rule, ...routes} = contract.routes;
  expect(routes).toEqual({...MARKETPLACE_ROUTES});
  expect(contract.searchQueryParam).toBe(SEARCH_QUERY_PARAM);
});

test('the publisher: the name grammar, the token form', () => {
  expect(new RegExp(contract.publisher.pattern).source).toBe(PUBLISHER_NAME_PATTERN.source);
  expect(contract.publisher.maxLength).toBe(PUBLISHER_NAME_MAX_LENGTH);
  expect(contract.publisher.reserved).toEqual([...RESERVED_PUBLISHER_NAMES]);
  expect(contract.publisher.tokenBytes).toBe(PUBLISHER_TOKEN_BYTES);
  expect(new RegExp(contract.publisher.tokenPattern).source).toBe(PUBLISHER_TOKEN_PATTERN.source);
});

test('the smoke test’s greeting', () => {
  expect(contract.smokeTest.greeting).toBe(SMOKE_GREETING);
});

test('the index entry and the preview: the schemas beside the contract, equal to the projection', () => {
  expect(contract.entry.schema).toBe('marketplace-entry.schema.json');
  expect(INDEX_ENTRY_SCHEMA).toEqual(read(contract.entry.schema));
  expect(contract.preview.schema).toBe('marketplace-preview.schema.json');
  expect(PREVIEW_SCHEMA).toEqual(read(contract.preview.schema));
  expect(contract.preview.capturedBy).toEqual([...PREVIEW_CAPTURED_BY]);
  for (const schema of [INDEX_ENTRY_SCHEMA, PREVIEW_SCHEMA]) {
    expect(schema.properties).not.toHaveProperty('contract');
  }
});

test('the wire bodies’ fields match the contract', () => {
  const fields = (shape: string) => {
    const s = contract.shapes[shape]!;
    return [...s.required, ...(s.optional ?? [])].sort();
  };
  expect([...CLAIM_REQUEST_FIELDS].sort()).toEqual(fields('claimRequest'));
  expect([...CLAIM_RESPONSE_FIELDS].sort()).toEqual(fields('claimResponse'));
  expect([...PUBLISH_REQUEST_FIELDS].sort()).toEqual(fields('publishRequest'));
  expect([...PUBLISH_CATALOG_FIELDS]).toEqual(contract.shapes.publishRequest!.catalog);
  expect([...PUBLISH_RESPONSE_FIELDS].sort()).toEqual(fields('publishOutcome'));
  expect([...REFUSAL_FIELDS].sort()).toEqual(fields('refusal'));
  expect([...UNPUBLISH_REQUEST_FIELDS].sort()).toEqual(fields('unpublishRequest'));
  expect([...REPORT_REQUEST_FIELDS].sort()).toEqual(fields('reportRequest'));
  expect([...SEARCH_RESPONSE_FIELDS].sort()).toEqual(fields('searchResponse'));
  expect([...SEARCH_RESULT_FIELDS]).toEqual(contract.shapes.searchResponse!.result);
});

test('the update state: the common fields, the eight states in order, each state’s details', () => {
  const shape = contract.shapes.updateState!;
  expect([...UPDATE_STATE_FIELDS]).toEqual(shape.required);
  expect(Object.keys(shape.states!)).toEqual([...UPDATE_STATES]);
  for (const state of UPDATE_STATES) {
    expect(shape.states![state]).toEqual({
      required: [...UPDATE_STATE_DETAILS[state].required],
      optional: [...UPDATE_STATE_DETAILS[state].optional],
    });
  }
  expect([...BUILD_MOVE_FIELDS]).toEqual(shape.buildMove);
  expect([...NEW_SCOPES_FIELDS]).toEqual(shape.newScopes);
});
