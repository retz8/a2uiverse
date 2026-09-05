/**
 * Render parity (task-5.9 decision 7): generated from `catalog.json`, for every component and
 * every value of every enum prop, a minimal valid tree renders through the real renderer under
 * the Provider — no validation error, no console error or warning, and a rendered element.
 * The name-level parity between schema and runtime stays in `catalog.parity.test.ts`.
 */
import {readFileSync} from 'node:fs';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {componentNames, enumProps, sweep, type CatalogSchema} from '../fixture/matrix.js';
import {ICON_NAMES} from './components/icon/index.js';
import {SlotContentContext} from './slot-content.js';
import {renderTree, renderedElements} from './testing/render.js';

const schema = JSON.parse(readFileSync('catalogs/v0.9.1/catalog.json', 'utf8')) as CatalogSchema;

// A slot always has content to rest on here, so `collapsed` — which rightly renders nothing when
// there is none — still yields an element for the sweep to find.
const withSlotContent = (node: React.ReactNode) => (
  <SlotContentContext.Provider value={() => <em>fragment</em>}>{node}</SlotContentContext.Provider>
);

let consoleError: ReturnType<typeof vi.spyOn>;
let consoleWarn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
  consoleWarn.mockRestore();
});

test('the sweep covers every component the schema declares, with every enum value', () => {
  const names = componentNames(schema);
  expect(names).toContain('Text');
  expect(names).toContain('SortControl');
  // The icon table is keyed by exactly the schema's names — no name unmapped, none invented.
  const iconNames = enumProps(schema, 'Icon').find(p => p.prop === 'name')!.values;
  expect([...ICON_NAMES].sort()).toEqual([...iconNames].sort());
  expect(sweep(schema, 'Icon').filter(c => c.prop === 'name')).toHaveLength(iconNames.length);
});

for (const name of componentNames(schema)) {
  describe(name, () => {
    for (const {label, sample} of sweep(schema, name)) {
      test(`${label} renders on Radix with no error`, () => {
        const {container} = renderTree(sample.components, {
          data: sample.data,
          wrap: withSlotContent,
        });
        expect(container.querySelector('[data-a2ui-placeholder]')).toBeNull();
        expect(renderedElements(container).length).toBeGreaterThan(0);
        expect(consoleError.mock.calls).toEqual([]);
        expect(consoleWarn.mock.calls).toEqual([]);
      });
    }
  });
}
