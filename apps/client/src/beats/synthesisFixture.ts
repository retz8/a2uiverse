/**
 * The synthesis fixture the client is proven against (task-5.5 decision 7): the camera comparison
 * the Synthesizer's prompt teaches — two storefronts under two shapes, keyed refs — as the beat's
 * sources and paint. The client's own copy of it (task-6.3 decision 11 applied to this fixture):
 * the example lives with its author in the orchestrator. Shared by the synthetic beat and the
 * tests, so the event sequence has one author.
 *
 * Since task 5.10 there is one ref form, so there is one document: the by-hand positional
 * variants that drove the stale path are gone with the mechanism they exercised.
 */
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import type {A2uiComponent, SynthesisPayload} from '@a2uiverse/sdk';

/** A merged view as the orchestrator paints it: the model's tree, and the payload beside it. */
export interface SynthesisDocument extends SynthesisPayload {
  tree: {components: A2uiComponent[]};
}

const SHOP_A_SURFACE = 'shop-a:list';
const SHOP_B_SURFACE = 'shop-b:list';

const ref = (surface: string, pointer: string) => ({surface, pointer});
const value = (surface: string, pointer: string) => ({op: 'value', args: [ref(surface, pointer)]});

function comparisonRow(id: string) {
  return {
    name: value(SHOP_A_SURFACE, `/items[id="${id}"]/name`),
    priceA: value(SHOP_A_SURFACE, `/items[id="${id}"]/price`),
    priceB: value(SHOP_B_SURFACE, `/products[sku="${id}"]/price`),
    best: {
      op: 'min',
      args: [
        ref(SHOP_A_SURFACE, `/items[id="${id}"]/price`),
        ref(SHOP_B_SURFACE, `/products[sku="${id}"]/price`),
      ],
    },
  };
}

/** The same cameras in two stores, under two shapes; a row per camera, best price first. */
const CAMERA_COMPARISON = {
  name: 'camera-comparison',
  intent: 'compare camera prices across both stores',
  request:
    'One row per camera both stores list, with each store’s price side by side and the best of the two; best price first.',
  sources: [
    {
      surface: SHOP_A_SURFACE,
      appId: 'shop-a',
      displayName: 'Aperture & Co',
      data: {
        items: [
          {id: 'lumen-x100', name: 'Lumen X100', price: 1299, inStock: true},
          {id: 'verity-a7', name: 'Verity A7', price: 1849, inStock: false},
          {id: 'lumen-z6', name: 'Lumen Z6', price: 1599, inStock: true},
        ],
      },
    },
    {
      surface: SHOP_B_SURFACE,
      appId: 'shop-b',
      displayName: 'Northlight',
      data: {
        products: [
          {sku: 'verity-a7', title: 'Verity A7 body', price: 1799, available: 2},
          {sku: 'lumen-x100', title: 'Lumen X100', price: 1349, available: 0},
          {sku: 'orbit-gm3', title: 'Orbit GM3', price: 2099, available: 1},
        ],
      },
    },
  ],
  output: {
    tree: {
      components: [
        {id: 'root', component: 'Column', children: ['head', 'rows']},
        {
          id: 'head',
          component: 'Row',
          justify: 'spaceBetween',
          align: 'center',
          children: ['heading', 'sort'],
        },
        {id: 'heading', component: 'Text', variant: 'h5', text: 'Cameras in both stores'},
        {id: 'sort', component: 'SortControl', sort: {path: '/sorts/0'}},
        {
          id: 'rows',
          component: 'Table',
          columns: ['Camera', 'Aperture & Co', 'Northlight', 'Best price'],
          children: {path: '/rows', componentId: 'row'},
        },
        {id: 'row', component: 'TableRow', children: ['c-name', 'c-a', 'c-b', 'c-best']},
        {id: 'c-name', component: 'DerivedValue', cell: {path: 'name'}},
        {id: 'c-a', component: 'DerivedValue', cell: {path: 'priceA'}, format: {kind: 'number'}},
        {id: 'c-b', component: 'DerivedValue', cell: {path: 'priceB'}, format: {kind: 'number'}},
        {id: 'c-best', component: 'DerivedValue', cell: {path: 'best'}, format: {kind: 'number'}},
      ],
    },
    dataModel: {
      rows: [comparisonRow('lumen-x100'), comparisonRow('verity-a7')],
    },
    sorts: [
      {
        path: '/rows',
        options: [
          {key: '/best', label: 'Best price'},
          {key: '/name', label: 'Camera'},
        ],
        key: '/best',
        direction: 'asc',
      },
    ],
    note: 'Lumen Z6 (Aperture & Co only) and Orbit GM3 (Northlight only) are left out: one store each, nothing to compare.',
  },
};

export const SYNTHESIS_SURFACE = 'shell:synthesis';
/** The source whose slot the merged view fills: the shell's own. */
export const SYNTHESIS_SOURCE = 'shell';

const [shopA, shopB] = CAMERA_COMPARISON.sources;
export const SHOP_A = shopA!.surface;
export const SHOP_B = shopB!.surface;
export const SHOP_A_NAME = shopA!.displayName;
export const SHOP_B_NAME = shopB!.displayName;

export interface ShopAItem {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
}
export interface ShopBProduct {
  sku: string;
  title: string;
  price: number;
  available: number;
}

export const SHOP_A_ITEMS = (shopA!.data as {items: ShopAItem[]}).items;
export const SHOP_B_PRODUCTS = (shopB!.data as {products: ShopBProduct[]}).products;

/** The example's document: keyed refs, two cameras both stores list, best price first. */
export const DOCUMENT: SynthesisDocument = CAMERA_COMPARISON.output as SynthesisDocument;

/** The first synthesis' client-facing half. */
export const PAYLOAD: SynthesisPayload = {dataModel: DOCUMENT.dataModel, sorts: DOCUMENT.sorts};

/** Shop A's list reversed in place — a reorder the keyed refs ride out unchanged. */
export const SHOP_A_REVERSED: ShopAItem[] = [...SHOP_A_ITEMS].reverse();

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;

/** Shop A's fragment: a heading over its `items`, each named and priced. */
export function shopAMessages(
  catalogId: string,
  items: readonly ShopAItem[] = SHOP_A_ITEMS,
): A2uiMessage[] {
  return listMessages(SHOP_A, catalogId, SHOP_A_NAME, 'items', 'name', {items: clone(items)});
}

/** Shop B's fragment: a heading over its `products`, each titled and priced. */
export function shopBMessages(
  catalogId: string,
  products: readonly ShopBProduct[] = SHOP_B_PRODUCTS,
): A2uiMessage[] {
  return listMessages(SHOP_B, catalogId, SHOP_B_NAME, 'products', 'title', {
    products: clone(products),
  });
}

// A copy: the data model stores by reference, and a fixture must not be edited in place.
const clone = <T>(rows: readonly T[]): T[] => rows.map(row => ({...row}));

function listMessages(
  surfaceId: string,
  catalogId: string,
  title: string,
  list: string,
  nameField: string,
  data: unknown,
): A2uiMessage[] {
  return [
    msg({createSurface: {surfaceId, catalogId}}),
    msg({
      updateComponents: {
        surfaceId,
        components: [
          {id: 'root', component: 'Column', children: ['h', 'list']},
          {id: 'h', component: 'Text', text: title},
          {id: 'list', component: 'Column', children: {path: `/${list}`, componentId: 'row'}},
          {id: 'row', component: 'Row', children: ['row-name', 'row-price']},
          {id: 'row-name', component: 'Text', text: {path: nameField}},
          {id: 'row-price', component: 'Text', text: {path: 'price'}},
        ],
      },
    }),
    msg({updateDataModel: {surfaceId, value: data}}),
  ];
}

/** The synthesis surface's paint: create against the shell catalog, then the model's tree verbatim. */
export function synthesisMessages(document: SynthesisDocument, catalogId: string): A2uiMessage[] {
  return [
    msg({createSurface: {surfaceId: SYNTHESIS_SURFACE, catalogId}}),
    msg({
      updateComponents: {
        surfaceId: SYNTHESIS_SURFACE,
        components: structuredClone(document.tree.components),
      },
    }),
  ];
}
