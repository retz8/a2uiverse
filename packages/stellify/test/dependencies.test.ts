/**
 * The committed build inlines the sdk, the smoke transport and the card package but not their npm
 * dependencies (task-16.5 decision 1; task-20.2 decisions 2, 3; task-20.3 decision 2): this
 * package declares each of them itself, at the version the inlined package declares, so a
 * vendor's install resolves what the inlined code imports — the A2A SDK among them, at its exact
 * pin.
 */
import {readFileSync} from 'node:fs';
import {expect, test} from 'vitest';

const dependencies = (path: string) =>
  (
    JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as {
      dependencies: Record<string, string>;
    }
  ).dependencies;

const stellify = dependencies('../package.json');
/** A workspace sibling is inlined itself, its own npm dependencies checked on its own line. */
const fromNpm = (deps: Record<string, string>) =>
  Object.entries(deps).filter(([, version]) => !version.startsWith('workspace:'));

test.each([
  ['the sdk', '../../sdk/js/package.json'],
  ['the smoke transport', '../../smoke-transport/package.json'],
  ['the card package', '../../card/package.json'],
])("every npm dependency of %s is Stellify's, at its version", (_name, path) => {
  const inlined = fromNpm(dependencies(path));
  expect(inlined.length).toBeGreaterThan(0);
  for (const [name, version] of inlined) expect(stellify[name], name).toBe(version);
});

test('the A2A SDK is pinned at exactly 1.3.0', () => {
  expect(stellify['@a2a-js/sdk']).toBe('1.3.0');
});

test('the committed build keeps the A2A SDK external and inlines the three workspace packages', () => {
  const built = ['index.js', 'cli.js', 'shared.js']
    .map(file => readFileSync(new URL(`../dist/${file}`, import.meta.url), 'utf8'))
    .join('\n');
  expect(built).toMatch(/from "@a2a-js\/sdk\/client"/);
  expect(built).toMatch(/from "@a2a-js\/sdk\/compat\/v0_3\/client"/);
  expect(built).not.toMatch(/from "@a2uiverse\//);
});
