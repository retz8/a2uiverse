/**
 * Render parity (task-5.9 decision 7): generated from `catalog.json`, for every component and
 * every value of every enum prop, a minimal valid tree renders through the real renderer under
 * the Provider — no error reported on the surface, rendered content inside each component's
 * element, no pending child, and no console error or warning (task-16.6 decision 6).
 * The name-level parity between schema and runtime stays in `catalog.parity.test.ts`.
 */
import {readFileSync} from 'node:fs';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {componentNames, enumProps, sweep, type CatalogSchema} from '../fixture/matrix.js';
import {ICON_NAMES} from './components/icon/index.js';
import {SlotContentContext} from './slot-content.js';
import {componentElements, renderTree} from './testing/render.js';

/** Whether a component's element holds anything it drew. */
const drewContent = (el: Element) =>
  el.childElementCount > 0 || (el.textContent ?? '').trim() !== '';

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
        const {container, errors} = renderTree(sample.components, {
          data: sample.data,
          wrap: withSlotContent,
        });
        expect(errors).toEqual([]);
        const elements = componentElements(container);
        expect(elements.length).toBeGreaterThan(0);
        for (const element of elements) {
          expect(drewContent(element), `${element.tagName.toLowerCase()} drew nothing`).toBe(true);
        }
        // A child the tree names but never defined; the renderer reports it by its text alone.
        expect(container.textContent).not.toContain('[Loading ');
        expect(consoleError.mock.calls).toEqual([]);
        expect(consoleWarn.mock.calls).toEqual([]);
      });
    }
  });
}
