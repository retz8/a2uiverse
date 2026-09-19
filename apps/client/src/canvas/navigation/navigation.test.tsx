/**
 * Navigation from a merged cell (task-7.7 decisions 2–6): a storefront fragment rendered through
 * its decorated catalog, the binding index filled by what mounted, and landing resolved against
 * it — the exact binding, the row by degradation, the list, the boundary, the slot.
 */
import {afterEach, describe, expect, test, vi} from 'vitest';
import {act, cleanup, render} from '@testing-library/react';
import {flushSync} from 'react-dom';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import type {CellTarget} from '@a2uiverse/shell-catalog';
import {CATALOG_ID as SHOP_A_CATALOG_ID} from 'shop-a-catalog';
import {CatalogProvider, SurfaceFrame} from '../../catalogs/CatalogContext';
import {resolveCatalogs} from '../../catalogs/resolver';
import {listCatalogs} from '../../orchestratorApi';
import {FragmentBoundary} from '../composition/FragmentBoundary';
import {createBindingIndex, NODE_ATTR, NODE_END_ATTR} from './bindingIndex';
import {BindingIndexContext} from './decorateCatalog';
import {createNavigator, resolveLanding, RING_CLASS, RING_MS, SCROLL_SETTLE_MS} from './landing';

const CATALOGS = resolveCatalogs(await listCatalogs());
const SURFACE = 'shop-a:list';

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;

const ITEMS = [
  {id: 'lumen-x100', name: 'Lumen X100', price: 1299, stock: 4},
  {id: 'verity-a7', name: 'Verity A7', price: 1849, stock: 0},
];

function mountStorefront({boundary = true} = {}) {
  const processor = new MessageProcessor<ReactComponentImplementation>(
    CATALOGS.map(c => c.catalog),
  );
  processor.processMessages([
    msg({createSurface: {surfaceId: SURFACE, catalogId: SHOP_A_CATALOG_ID}}),
    msg({
      updateComponents: {
        surfaceId: SURFACE,
        components: [
          {id: 'root', component: 'Column', children: ['h', 'list']},
          {id: 'h', component: 'Text', text: 'Aperture & Co'},
          {id: 'list', component: 'Column', children: {path: '/items', componentId: 'row'}},
          {id: 'row', component: 'Row', children: ['row-name', 'row-price', 'row-again']},
          {id: 'row-name', component: 'Text', text: {path: 'name'}},
          {id: 'row-price', component: 'Text', text: {path: 'price'}},
          {id: 'row-again', component: 'Text', text: {path: 'name'}},
        ],
      },
    }),
    msg({updateDataModel: {surfaceId: SURFACE, value: {items: ITEMS, shop: {name: 'Aperture'}}}}),
  ]);
  const index = createBindingIndex(flushSync);
  const surface = processor.model.getSurface(SURFACE)!;
  const frame = <SurfaceFrame surface={surface} />;
  const view = render(
    <CatalogProvider catalogs={CATALOGS}>
      <BindingIndexContext.Provider value={index}>
        <div data-slot="shop-a">
          {boundary ? (
            <FragmentBoundary source="shop-a" surfaceId={SURFACE}>
              {frame}
            </FragmentBoundary>
          ) : null}
        </div>
      </BindingIndexContext.Provider>
    </CatalogProvider>,
  );
  return {index, processor, ...view};
}

const target = (pointer: string): CellTarget => ({app: 'shop-a', surface: SURFACE, pointer});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('the binding index', () => {
  test('a property binding lands on the element that renders it, the first in document order', () => {
    const {index} = mountStorefront();
    const landing = resolveLanding(index, target('/items[id="verity-a7"]/name'));
    expect(landing?.kind).toBe('bound');
    expect(landing?.element).toHaveTextContent('Verity A7');
    expect(landing?.element.hasAttribute(NODE_ATTR)).toBe(false);
    // At rest a vendor's DOM is the vendor's alone: the markers lasted one synchronous read.
    expect(document.querySelectorAll(`[${NODE_ATTR}], [${NODE_END_ATTR}]`)).toHaveLength(0);
    const names = [...document.querySelectorAll('*')].filter(
      el => el.textContent === 'Verity A7' && el.children.length === 0,
    );
    expect(names.length).toBeGreaterThan(1);
    expect(landing?.element.contains(names[0]!)).toBe(true);
  });

  test('a field the fragment does not render lands on its row, the template instance', () => {
    const {index} = mountStorefront();
    const landing = resolveLanding(index, target('/items[id="verity-a7"]/stock'));
    expect(landing?.kind).toBe('bound');
    expect(landing?.element).toHaveTextContent('Verity A71849Verity A7');
  });

  test('an element that left the partition lands on the list that owns the template', () => {
    const {index} = mountStorefront();
    const landing = resolveLanding(index, target('/items[id="gone"]/name'));
    expect(landing?.kind).toBe('bound');
    expect(landing?.element).toHaveTextContent('Lumen X100');
    expect(landing?.element).toHaveTextContent('Verity A7');
    expect(landing?.element).not.toHaveTextContent('Aperture & Co');
  });

  test('nothing bound under any prefix lands on the fragment boundary', () => {
    const {index} = mountStorefront();
    const landing = resolveLanding(index, target('/shop/name'));
    expect(landing?.kind).toBe('boundary');
    expect(landing?.element).toHaveAttribute('data-surface', SURFACE);
  });

  test('no fragment mounted lands on the source’s slot; no slot lands nowhere', () => {
    const {index} = mountStorefront({boundary: false});
    expect(resolveLanding(index, target('/items[id="verity-a7"]/name'))).toMatchObject({
      kind: 'slot',
    });
    expect(resolveLanding(index, {...target('/items'), app: 'nobody', surface: 'nobody:x'})).toBe(
      undefined,
    );
  });

  test('a repaint that reorders under the key lands on the element where it is now', () => {
    const {index, processor} = mountStorefront();
    act(() => {
      processor.processMessages([
        msg({updateDataModel: {surfaceId: SURFACE, value: {items: [...ITEMS].reverse()}}}),
      ]);
    });
    const landing = resolveLanding(index, target('/items[id="verity-a7"]/price'));
    expect(landing?.element).toHaveTextContent('1849');
  });

  test('a component that unmounts leaves the index', () => {
    const {index, unmount} = mountStorefront();
    unmount();
    expect(index.modelOf(SURFACE)).toBeUndefined();
  });
});

describe('landing', () => {
  test('focus moves to the element itself through a tabindex it sheds on blur, under a ring', () => {
    vi.useFakeTimers();
    const {index} = mountStorefront();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const navigator = createNavigator(index);

    // Focus waits for the scroll to end; nothing scrolls here, so for the settle timer.
    navigator.navigate(target('/items[id="lumen-x100"]/price'));
    expect(document.querySelectorAll(`.${RING_CLASS}`)).toHaveLength(1);
    vi.advanceTimersByTime(SCROLL_SETTLE_MS);
    const landed = document.activeElement as HTMLElement;
    expect(landed).toHaveTextContent('1299');
    expect(landed).toHaveAttribute('tabindex', '-1');
    expect(document.querySelectorAll(`.${RING_CLASS}`)).toHaveLength(1);

    // A second navigation replaces the ring and takes the focus along.
    navigator.navigate(target('/items[id="verity-a7"]/price'));
    vi.advanceTimersByTime(SCROLL_SETTLE_MS);
    expect(landed).not.toHaveAttribute('tabindex');
    expect(document.activeElement).toHaveTextContent('1849');
    expect(document.querySelectorAll(`.${RING_CLASS}`)).toHaveLength(1);

    vi.advanceTimersByTime(RING_MS);
    expect(document.querySelectorAll(`.${RING_CLASS}`)).toHaveLength(0);

    navigator.navigate({app: 'nobody', surface: 'nobody:x', pointer: '/x'});
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
