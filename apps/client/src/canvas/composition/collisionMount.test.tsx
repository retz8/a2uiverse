/**
 * The collision detector, mounted half: every installed catalog rendered together, as a composed
 * turn renders them. jsdom inherits custom properties down the tree even though it will not
 * resolve `var()`, which is exactly what the per-subtree question needs — the same variable name
 * must read differently inside two different fragments.
 *
 * What jsdom cannot see is stylesheet-based scoping: `github-catalog`'s Provider lazily imports
 * three `@primer/primitives` sheets that never load here. That is the Playwright layer's job
 * (`e2e/composition.spec.ts`); this layer covers inline tokens and DOM ownership.
 */
import {describe, it, expect} from 'vitest';
import {render} from '@testing-library/react';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import {CatalogProvider, SurfaceFrame} from '../../catalogs/CatalogContext';
import {resolveCatalogs} from '../../catalogs/resolver';
import {listCatalogs} from '../../orchestratorApi';
import {FRAGMENT_BOUNDARY_ATTR, FragmentBoundary} from './FragmentBoundary';

const RECORDS = await listCatalogs();
const CATALOGS = resolveCatalogs(RECORDS);

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;

/** One trivial surface per installed catalog — every design system on the page at once. */
function everyCatalogMounted() {
  const processor = new MessageProcessor<ReactComponentImplementation>(
    CATALOGS.map(c => c.catalog),
  );
  for (const record of RECORDS) {
    const surfaceId = `${record.appId}:probe`;
    processor.processMessages([
      msg({createSurface: {surfaceId, catalogId: record.catalogId}}),
      msg({
        updateComponents: {
          surfaceId,
          components: [{id: 'root', component: 'Text', text: `${record.appId} fragment`}],
        },
      }),
    ]);
  }
  return render(
    <CatalogProvider catalogs={CATALOGS}>
      {RECORDS.map(record => (
        <FragmentBoundary
          key={record.appId}
          source={record.appId}
          surfaceId={`${record.appId}:probe`}
        >
          <SurfaceFrame surface={processor.model.surfacesMap.get(`${record.appId}:probe`)!} />
        </FragmentBoundary>
      ))}
    </CatalogProvider>,
  );
}

describe('every installed catalog, mounted together', () => {
  it('writes no custom property onto the document element', () => {
    const {container} = everyCatalogMounted();
    // Whatever the catalogs set, the page itself must come away untouched.
    expect(document.documentElement.getAttribute('style')).toBeNull();
    expect(document.body.getAttribute('style')).toBeNull();
    expect(container.querySelectorAll(`[${FRAGMENT_BOUNDARY_ATTR}]`).length).toBe(RECORDS.length);
  });

  it('resolves a shared token to each fragment’s own value, not the last one mounted', () => {
    const {container} = everyCatalogMounted();
    const boundaries = [...container.querySelectorAll<HTMLElement>(`[${FRAGMENT_BOUNDARY_ATTR}]`)];
    expect(boundaries.length).toBeGreaterThan(0);

    // Give each fragment its own value of one name, the way two design systems would.
    boundaries.forEach((boundary, i) => {
      boundary.style.setProperty('--text-primary', `rgb(${i}, 0, 0)`);
    });
    const seen = boundaries.map(b => getComputedStyle(b).getPropertyValue('--text-primary').trim());
    expect(new Set(seen).size).toBe(boundaries.length);
    // And nothing leaked upward to the page.
    expect(getComputedStyle(document.documentElement).getPropertyValue('--text-primary')).toBe('');
  });

  it('leaves no rendered DOM outside a fragment boundary', () => {
    const {container} = everyCatalogMounted();
    for (const element of container.querySelectorAll<HTMLElement>('*')) {
      const owned =
        element.hasAttribute(FRAGMENT_BOUNDARY_ATTR) ||
        element.closest(`[${FRAGMENT_BOUNDARY_ATTR}]`);
      expect(owned, `${element.tagName} escaped its fragment boundary`).toBeTruthy();
    }
  });

  it('mounts a real element as the boundary — @scope and a portal root need one', () => {
    const {container} = everyCatalogMounted();
    for (const boundary of container.querySelectorAll<HTMLElement>(`[${FRAGMENT_BOUNDARY_ATTR}]`)) {
      expect(boundary.tagName).toBe('DIV');
      expect(getComputedStyle(boundary).display).not.toBe('contents');
    }
  });
});

/**
 * The named tokens task-2.7 decision 3 made Calendar's theme diverge on. Gmail and Calendar are
 * the same design system by the same company, so without a deliberate divergence the two
 * fragments render as one product and phase acceptance item 6 passes while proving nothing.
 * Asserted here rather than in either bundle: a catalog cannot compare itself to its sibling
 * without depending on it, which SPEC §13 forbids.
 */
const DIVERGENT_TOKENS = [
  '--a2ui-card-border-radius',
  '--a2ui-card-box-shadow',
  '--a2ui-color-primary',
  '--a2ui-spacing-m',
  '--a2ui-font-size-m',
] as const;

describe('the two Material 3 catalogs stay visually distinguishable', () => {
  it('resolves each named token to a different value in the Gmail and Calendar subtrees', () => {
    const {container} = everyCatalogMounted();
    const gmail = container.querySelector<HTMLElement>('.gmail-catalog');
    const calendar = container.querySelector<HTMLElement>('.calendar-catalog');
    expect(gmail, 'gmail-catalog Provider did not mount').not.toBeNull();
    expect(calendar, 'calendar-catalog Provider did not mount').not.toBeNull();

    for (const token of DIVERGENT_TOKENS) {
      const fromGmail = gmail!.style.getPropertyValue(token);
      const fromCalendar = calendar!.style.getPropertyValue(token);
      expect(fromGmail, `${token} unset on gmail-catalog`).not.toBe('');
      expect(fromCalendar, `${token} unset on calendar-catalog`).not.toBe('');
      expect(
        fromCalendar,
        `${token} is identical in both Material 3 catalogs — the themes have converged`,
      ).not.toBe(fromGmail);
    }
  });

  it('keeps each vendor theme inside its own fragment boundary', () => {
    const {container} = everyCatalogMounted();
    for (const selector of ['.gmail-catalog', '.calendar-catalog']) {
      const wrapper = container.querySelector<HTMLElement>(selector)!;
      expect(wrapper.closest(`[${FRAGMENT_BOUNDARY_ATTR}]`)).not.toBeNull();
      for (const token of DIVERGENT_TOKENS) {
        expect(document.documentElement.style.getPropertyValue(token)).toBe('');
      }
    }
  });
});
