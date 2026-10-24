/**
 * Navigation from a merged cell (task-7.7 decisions 2–6; task-16.7 decision 3): a storefront
 * fragment in a themed catalog — upstream's basic components beside a React component of its own —
 * its boundary registered in the binding index, and landing resolved against what the page holds —
 * the exact binding, the row by degradation, the list, the boundary, the slot.
 */
import {afterEach, describe, expect, test, vi} from 'vitest';
import {z} from 'zod';
import {act, cleanup, render, waitFor} from '@testing-library/react';
import {Catalog, DynamicStringSchema, MessageProcessor} from '@a2ui/web_core/v0_9';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import {basicCatalog} from '@a2ui/web_core/v0_9/basic_catalog';
import {createComponentImplementation, type ReactCatalogComponent} from '@a2ui/react/v0_9';
import type {CellTarget} from '@a2uiverse/shell-catalog';
import {CatalogProvider, SurfaceFrame} from '../../catalogs/CatalogContext';
import {clientCatalogs, resolveCatalog} from '../../catalogs/clientCatalogs';
import {FragmentBoundary} from '../composition/FragmentBoundary';
import {BindingIndexContext, createBindingIndex} from './bindingIndex';
import {createNavigator, resolveLanding, RING_CLASS, RING_MS, SCROLL_SETTLE_MS} from './landing';

/** The storefront's own component: a React one, beside the basic catalog's custom elements. */
const PriceTag = createComponentImplementation(
  {name: 'PriceTag', schema: z.object({amount: DynamicStringSchema})},
  ({props}) => <strong className="price-tag">{String(props.amount)}</strong>,
);
const SHOP_A = resolveCatalog(
  new Catalog<ReactCatalogComponent>(
    'urn:catalog:shop-a',
    basicCatalog.protocolVersion,
    [...basicCatalog.components.values(), PriceTag],
    [...basicCatalog.functions.values()],
  ),
  undefined,
  'sha256-shop-a',
);
const CATALOGS = [...clientCatalogs(), SHOP_A];
const SURFACE = 'shop-a:list';

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;

const ITEMS = [
  {id: 'lumen-x100', name: 'Lumen X100', price: 1299, stock: 4},
  {id: 'verity-a7', name: 'Verity A7', price: 1849, stock: 0},
];

async function mountStorefront({boundary = true} = {}) {
  const processor = new MessageProcessor<ReactCatalogComponent>(CATALOGS.map(c => c.catalog));
  processor.processMessages([
    msg({createSurface: {surfaceId: SURFACE, catalogId: SHOP_A.id}}),
    msg({
      updateComponents: {
        surfaceId: SURFACE,
        components: [
          {id: 'root', component: 'Column', children: ['h', 'list']},
          {id: 'h', component: 'Text', text: 'Aperture & Co'},
          {id: 'list', component: 'Column', children: {path: '/items', componentId: 'row'}},
          {id: 'row', component: 'Row', children: ['row-name', 'row-price', 'row-again']},
          {id: 'row-name', component: 'Text', text: {path: 'name'}},
          {id: 'row-price', component: 'PriceTag', amount: {path: 'price'}},
          {id: 'row-again', component: 'Text', text: {path: 'name'}},
        ],
      },
    }),
    msg({updateDataModel: {surfaceId: SURFACE, value: {items: ITEMS, shop: {name: 'Aperture'}}}}),
  ]);
  const index = createBindingIndex();
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
  // The basic catalog's custom elements draw after they are connected.
  if (boundary)
    await waitFor(() => expect(view.container.querySelectorAll('.price-tag')).toHaveLength(2));
  return {index, processor, ...view};
}

const target = (pointer: string): CellTarget => ({app: 'shop-a', surface: SURFACE, pointer});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('the binding index', () => {
  test('a basic component bound to the path is landed on, the first in document order', async () => {
    const {index} = await mountStorefront();
    const landing = resolveLanding(index, target('/items[id="verity-a7"]/name'));
    expect(landing?.kind).toBe('bound');
    expect(landing?.element).toHaveTextContent(/^Verity A7$/);
    const names = [...document.querySelectorAll('*')].filter(
      el => el.textContent === 'Verity A7' && el.children.length === 0,
    );
    expect(names.length).toBeGreaterThan(1);
    expect(landing?.element.contains(names[0]!)).toBe(true);
  });

  test('a React component bound to the path is landed on, on the element it draws', async () => {
    const {index} = await mountStorefront();
    const landing = resolveLanding(index, target('/items[id="verity-a7"]/price'));
    expect(landing?.kind).toBe('bound');
    expect(landing?.element).toHaveClass('price-tag');
    expect(landing?.element).toHaveTextContent('1849');
  });

  test('a field the fragment does not render lands on its row, the template instance', async () => {
    const {index} = await mountStorefront();
    const landing = resolveLanding(index, target('/items[id="verity-a7"]/stock'));
    expect(landing?.kind).toBe('bound');
    expect(landing?.element).toHaveTextContent('Verity A71849Verity A7');
  });

  test('an element that left the partition lands on the list that owns the template', async () => {
    const {index} = await mountStorefront();
    const landing = resolveLanding(index, target('/items[id="gone"]/name'));
    expect(landing?.kind).toBe('bound');
    expect(landing?.element).toHaveTextContent('Lumen X100');
    expect(landing?.element).toHaveTextContent('Verity A7');
    expect(landing?.element).not.toHaveTextContent('Aperture & Co');
  });

  test('nothing bound under any prefix lands on the fragment boundary', async () => {
    const {index} = await mountStorefront();
    const landing = resolveLanding(index, target('/shop/name'));
    expect(landing?.kind).toBe('boundary');
    expect(landing?.element).toHaveAttribute('data-surface', SURFACE);
  });

  test('no fragment mounted lands on the source’s slot; no slot lands nowhere', async () => {
    const {index} = await mountStorefront({boundary: false});
    expect(resolveLanding(index, target('/items[id="verity-a7"]/name'))).toMatchObject({
      kind: 'slot',
    });
    expect(resolveLanding(index, {...target('/items'), app: 'nobody', surface: 'nobody:x'})).toBe(
      undefined,
    );
  });

  test('a repaint that reorders under the key lands on the element where it is now', async () => {
    const {index, processor, container} = await mountStorefront();
    await act(async () => {
      processor.processMessages([
        msg({updateDataModel: {surfaceId: SURFACE, value: {items: [...ITEMS].reverse()}}}),
      ]);
    });
    await waitFor(() => expect(container.querySelector('.price-tag')).toHaveTextContent('1849'));
    const landing = resolveLanding(index, target('/items[id="verity-a7"]/price'));
    expect(landing?.element).toHaveTextContent('1849');
  });

  test('a boundary that unmounts leaves the index', async () => {
    const {index, unmount} = await mountStorefront();
    expect(index.modelOf(SURFACE)).toMatchObject({shop: {name: 'Aperture'}});
    unmount();
    expect(index.modelOf(SURFACE)).toBeUndefined();
  });
});

describe('landing', () => {
  test('focus moves to the element itself through a tabindex it sheds on blur, under a ring', async () => {
    const {index} = await mountStorefront();
    vi.useFakeTimers();
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
