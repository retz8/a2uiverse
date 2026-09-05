/**
 * The synthesis fixture the client is proven against (task-5.5 decision 7): the sdk's camera
 * comparison example — two storefronts under two shapes, keyed refs, the document the prompt
 * teaches and the orchestrator validates — as the beat's sources and paint. Shared by the
 * synthetic beat and the tests, so the event sequence has one author.
 *
 * Beside it, the same document re-pointed by hand onto positions: what a model that found no
 * key would write, and the only kind of ref a reorder can silently re-point. It drives the
 * stale and re-synthesis cases the keyed document cannot.
 */
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import {CAMERA_COMPARISON, isDecline, type Synthesis, type SynthesisPayload} from '@a2uiverse/sdk';

if (isDecline(CAMERA_COMPARISON.output)) throw new Error('the example is a decline');

export const SYNTHESIS_SURFACE = 'shell:synthesis';
export const SYNTHESIS_SLOT = 'slot-shell';

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
export const DOCUMENT: Synthesis = CAMERA_COMPARISON.output;

const payloadOf = (
  document: Synthesis,
  computedAgainst: Record<string, number>,
): SynthesisPayload => ({
  dataModel: document.dataModel,
  sorts: document.sorts,
  computedAgainst,
});

/** The first synthesis' client-facing half, both stores at their first generation. */
export const PAYLOAD: SynthesisPayload = payloadOf(DOCUMENT, {[SHOP_A]: 1, [SHOP_B]: 1});

/**
 * The document with every ref re-pointed by hand onto the position its key sits at in the given
 * lists: `/items[id="x"]` becomes `/items/<i>`, `/products[sku="x"]` becomes `/products/<j>`.
 */
export function indexed(
  document: Synthesis,
  items: readonly ShopAItem[] = SHOP_A_ITEMS,
  products: readonly ShopBProduct[] = SHOP_B_PRODUCTS,
): Synthesis {
  const repoint = (pointer: string): string =>
    pointer
      .replace(/^\/items\[id="([^"]+)"\]/, (_, id) => `/items/${items.findIndex(i => i.id === id)}`)
      .replace(
        /^\/products\[sku="([^"]+)"\]/,
        (_, sku) => `/products/${products.findIndex(p => p.sku === sku)}`,
      );
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (typeof node === 'object' && node !== null) {
      const record = node as Record<string, unknown>;
      if (typeof record.op === 'string' && Array.isArray(record.args)) {
        return {
          op: record.op,
          args: (record.args as {surface: string; pointer: string}[]).map(ref => ({
            ...ref,
            pointer: repoint(ref.pointer),
          })),
        };
      }
      return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, walk(v)]));
    }
    return node;
  };
  return {...document, dataModel: walk(document.dataModel) as Synthesis['dataModel']};
}

/** The keyed document as index refs, against the lists as first painted. */
export const INDEXED_DOCUMENT: Synthesis = indexed(DOCUMENT);
export const INDEXED_PAYLOAD: SynthesisPayload = payloadOf(INDEXED_DOCUMENT, {
  [SHOP_A]: 1,
  [SHOP_B]: 1,
});

/** Shop A's list reversed in place — the one change that re-points an index ref. */
export const SHOP_A_REVERSED: ShopAItem[] = [...SHOP_A_ITEMS].reverse();

/** After the reorder: generation 2, the index refs re-pointed onto the new positions. */
export const REPOINTED_DOCUMENT: Synthesis = indexed(DOCUMENT, SHOP_A_REVERSED);
export const REPOINTED_PAYLOAD: SynthesisPayload = payloadOf(REPOINTED_DOCUMENT, {
  [SHOP_A]: 2,
  [SHOP_B]: 1,
});

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
export function synthesisMessages(document: Synthesis, catalogId: string): A2uiMessage[] {
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
