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
