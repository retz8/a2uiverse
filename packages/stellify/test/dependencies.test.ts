/**
 * The committed build inlines the sdk but not its npm dependencies (task-16.5 decision 1): this
 * package declares each of them itself, at the version the sdk declares, so a vendor's install
 * resolves what the inlined sdk imports.
 */
import {readFileSync} from 'node:fs';
import {expect, test} from 'vitest';

const dependencies = (path: string) =>
  (
    JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as {
      dependencies: Record<string, string>;
    }
  ).dependencies;

test("every dependency of the sdk is Stellify's, at the sdk's version", () => {
  const sdk = dependencies('../../sdk/js/package.json');
  const stellify = dependencies('../package.json');
  expect(Object.keys(sdk).length).toBeGreaterThan(0);
  for (const [name, version] of Object.entries(sdk)) expect(stellify[name], name).toBe(version);
});
