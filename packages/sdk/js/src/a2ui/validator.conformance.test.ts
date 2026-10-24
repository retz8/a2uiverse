/**
 * Upstream's v0.9 validator conformance suite (`a2ui-spec/conformance/core/validator_v0_9.yaml`,
 * pinned) run against the sdk's A2UI validator. Each case names its catalog — a path into the
 * spec copy, or the catalog inline — and each step is a payload of its own.
 *
 * An expected error is matched by category and message. Upstream's integrity and recursion errors
 * are kinds of validation error, so a `ValidationError` expected is met by a finding of any of the
 * three. `details` is not asserted: it carries the field path and code a Pydantic model reports.
 */
import {readFileSync} from 'node:fs';
import {describe, expect, test} from 'vitest';
import {parse} from 'yaml';
import type {A2uiCatalogSchema, A2uiFinding} from './types';
import {createA2uiValidator} from './validator';

const spec = new URL('../../../a2ui-spec/', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, spec), 'utf8');

interface Expected {
  category?: string;
  message?: string;
}
interface Step {
  messages: unknown[];
  expectError?: Expected;
}
interface Case {
  name: string;
  protocolVersion: string;
  catalogPaths?: string[];
  catalog?: A2uiCatalogSchema;
  steps: Step[];
}

const cases = parse(read('conformance/core/validator_v0_9.yaml')) as Case[];

const catalogOf = (testCase: Case): A2uiCatalogSchema =>
  testCase.catalog ?? (JSON.parse(read(testCase.catalogPaths![0]!)) as A2uiCatalogSchema);

const VALIDATION_KINDS = ['ValidationError', 'IntegrityError', 'RecursionError'];

function matches(findings: A2uiFinding[], {category, message}: Expected): boolean {
  return findings.some(
    f =>
      (category === undefined ||
        f.category === category ||
        (category === 'ValidationError' && VALIDATION_KINDS.includes(f.category))) &&
      (message === undefined || f.message.includes(message)),
  );
}

describe('conformance core/validator_v0_9.yaml', () => {
  test('the suite carries its cases', () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  for (const testCase of cases) {
    test(testCase.name, () => {
      const validator = createA2uiValidator({catalog: catalogOf(testCase)});
      testCase.steps.forEach((step, index) => {
        const findings = validator.validate(step.messages);
        const label = `${testCase.name} step ${index}: ${JSON.stringify(findings)}`;
        if (step.expectError === undefined) expect(findings, label).toEqual([]);
        else expect(matches(findings, step.expectError), label).toBe(true);
      });
    });
  }
});
