/**
 * Upstream's validator conformance suite (`a2ui-spec/conformance/core/validator.yaml`, pinned) run
 * against the sdk's A2UI validator. Each case names its own spec schemas and catalog; each step is
 * an independent payload. Cases for v0.8 are skipped: the sdk implements v0.9 and later.
 *
 * An expected error is matched by category and message. `details` is not asserted: it carries the
 * field path and code a Pydantic model reports. Messages the suite spells the way Python's JSON
 * Schema library reports them are widened to this validator's wording, as upstream's Dart harness
 * does for its own.
 */
import {readFileSync} from 'node:fs';
import {describe, expect, test} from 'vitest';
import {parse} from 'yaml';
import type {A2uiCatalogSchema, A2uiFinding} from './types';
import {createA2uiValidator} from './validator';

const conformance = new URL('../../../a2ui-spec/conformance/', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, conformance), 'utf8');

type Expected = string | {category?: string; message?: string};
interface Step {
  payload: unknown[];
  expect_error?: Expected;
}
interface Case extends Partial<Step> {
  name: string;
  catalog: {
    version: string;
    s2c_schema?: string | object;
    common_types_schema?: string | object;
    catalog_schema: string | A2uiCatalogSchema;
  };
  steps?: Step[];
}

const cases = parse(read('core/validator.yaml')) as Case[];

const document = <T>(value: string | T): T =>
  typeof value === 'string' ? (JSON.parse(read(value)) as T) : value;

/** The suite's Python wording, widened to the equivalent this validator reports. */
function align(pattern: string): RegExp {
  const typeMismatch = /^.* is not of type '(\w+)'$/.exec(pattern);
  if (typeMismatch) return new RegExp(`(${pattern}|must be ${typeMismatch[1]})`);
  return new RegExp(pattern);
}

function matches(findings: A2uiFinding[], expected: Expected): boolean {
  const {category, message} = typeof expected === 'string' ? {message: expected} : expected;
  return findings.some(
    f =>
      (category === undefined || f.category === category) &&
      (message === undefined || align(message).test(f.message)),
  );
}

describe('conformance core/validator.yaml', () => {
  test('the suite carries v0.9 cases', () => {
    expect(cases.filter(c => c.catalog.version === '0.9').length).toBeGreaterThan(0);
  });

  for (const testCase of cases) {
    const skip = testCase.catalog.version !== '0.9';
    test.skipIf(skip)(testCase.name, () => {
      const validator = createA2uiValidator({
        catalog: document(testCase.catalog.catalog_schema),
        serverToClient: document(testCase.catalog.s2c_schema!),
        commonTypes: document(testCase.catalog.common_types_schema!),
      });
      const steps = testCase.steps ?? [testCase as Step];
      steps.forEach((step, index) => {
        const findings = validator.validate(step.payload);
        const expected = step.expect_error ?? (testCase.steps ? undefined : testCase.expect_error);
        const label = `${testCase.name} step ${index}: ${JSON.stringify(findings)}`;
        if (expected === undefined) expect(findings, label).toEqual([]);
        else expect(matches(findings, expected), label).toBe(true);
      });
    });
  }
});
