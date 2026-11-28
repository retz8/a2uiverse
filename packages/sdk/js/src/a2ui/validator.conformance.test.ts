/**
 * Upstream's v1.0 validator conformance suite (`a2ui-spec/conformance/core/validator_v1_0.yaml`,
 * pinned) run against the sdk's A2UI validator, every case and every step (task-21.10 decision
 * 23.1). Each step is a payload of its own.
 *
 * A case's catalogs are read as upstream's own runner reads them,
 * `dart/a2ui_core/test/conformance/validator_conformance_test.dart` at the pinned commit: several
 * documents each under its own id; one document under its own id and under every catalog id the
 * case's `createSurface` messages name — but an id naming itself unknown, unregistered or
 * nonexistent — or under `standard` when nothing names one; no document, the basic catalog the
 * same way.
 *
 * An expected error is matched by category and message, the message in any case. Upstream's
 * integrity and recursion errors are kinds of validation error, so a `ValidationError` expected is
 * met by a finding of any of the three. `details` is not asserted: it carries the field path and
 * code a Pydantic model reports.
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

const cases = parse(read('conformance/core/validator_v1_0.yaml')) as Case[];
const basic = JSON.parse(read('catalogs/basic/v1/catalog.json')) as A2uiCatalogSchema;

const unknownById = (id: string) => /unknown|unregistered|nonexistent/.test(id);

/** The catalog ids a case's `createSurface` messages name. */
function idsNamed(testCase: Case): Set<string> {
  const ids = new Set<string>();
  for (const step of testCase.steps) {
    for (const message of step.messages) {
      const id = (message as {createSurface?: {catalogId?: unknown}}).createSurface?.catalogId;
      if (typeof id === 'string' && !unknownById(id)) ids.add(id);
    }
  }
  return ids;
}

function catalogsOf(testCase: Case): A2uiCatalogSchema[] {
  const documents = testCase.catalogPaths
    ? testCase.catalogPaths.map(path => JSON.parse(read(path)) as A2uiCatalogSchema)
    : testCase.catalog
      ? [testCase.catalog]
      : [];
  if (documents.length > 1) return documents;
  const document = documents[0] ?? basic;
  const ids = idsNamed(testCase);
  if (typeof document.catalogId === 'string') ids.add(document.catalogId);
  if (ids.size === 0) ids.add('standard');
  return [...ids].map(catalogId => ({...document, catalogId}));
}

const VALIDATION_KINDS = ['ValidationError', 'IntegrityError', 'RecursionError'];

function matches(findings: A2uiFinding[], {category, message}: Expected): boolean {
  return findings.some(
    f =>
      (category === undefined ||
        f.category === category ||
        (category === 'ValidationError' && VALIDATION_KINDS.includes(f.category))) &&
      (message === undefined || f.message.toLowerCase().includes(message.toLowerCase())),
  );
}

describe('conformance core/validator_v1_0.yaml', () => {
  test('the suite carries its 50 cases, all at 1.0', () => {
    expect(cases).toHaveLength(50);
    expect(new Set(cases.map(c => String(c.protocolVersion)))).toEqual(new Set(['1.0']));
  });

  for (const testCase of cases) {
    test(testCase.name, () => {
      const validator = createA2uiValidator({catalogs: catalogsOf(testCase)});
      testCase.steps.forEach((step, index) => {
        const findings = validator.validate(step.messages);
        const label = `${testCase.name} step ${index}: ${JSON.stringify(findings)}`;
        if (step.expectError === undefined) expect(findings, label).toEqual([]);
        else expect(matches(findings, step.expectError), label).toBe(true);
      });
    });
  }
});
