/**
 * The synthesis fixture the client is proven against before the mock storefronts exist (task
 * 4.5 decision 14): two storefronts over one product shape, the wiring Gemini produced live
 * against them (the 4.4 handoff), the re-synthesis after an in-place reorder, and the derived
 * tree exactly as the orchestrator's synthesis painter generates it. Shared by the synthetic
 * beat and the tests, so the event sequence has one author.
 */
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import type {SynthesisWiring} from '@a2uiverse/sdk';

export const SHOP_A = 'shop-a:list';
export const SHOP_B = 'shop-b:list';
export const SYNTHESIS_SURFACE = 'shell:synthesis';
export const SYNTHESIS_SLOT = 'slot-shell';

export const SHOP_A_ITEMS = [
  {name: 'X100', price: 949},
  {name: 'Z6', price: 1899},
];
export const SHOP_B_ITEMS = [
  {name: 'X100', price: 899},
  {name: 'Z6', price: 1999},
];

const FIELDS = [
  {name: 'name', label: 'Camera Model'},
  {name: 'shopA_price', label: 'Shop A Price'},
  {name: 'shopB_price', label: 'Shop B Price'},
  {name: 'best_price', label: 'Best Price'},
];

/** One entity: shop A's item at `a`, shop B's at `b`, joined by index. */
function entity(a: number, b: number): SynthesisWiring['entities'][number] {
  return {
    cells: [
      {op: 'value', args: [{surface: SHOP_A, pointer: `/items/${a}/name`}]},
      {op: 'value', args: [{surface: SHOP_A, pointer: `/items/${a}/price`}]},
      {op: 'value', args: [{surface: SHOP_B, pointer: `/items/${b}/price`}]},
      {
        op: 'min',
        args: [
          {surface: SHOP_A, pointer: `/items/${a}/price`},
          {surface: SHOP_B, pointer: `/items/${b}/price`},
        ],
      },
    ],
  };
}

/** The first synthesis: both lists in the same order, so entities join at equal indices. */
export const WIRING: SynthesisWiring = {
  fields: FIELDS,
  entities: [entity(0, 0), entity(1, 1)],
  sort: {field: 'best_price', direction: 'asc'},
  computedAgainst: {[SHOP_A]: 1, [SHOP_B]: 1},
};

/** After shop A reorders its list in place: generation 2, the join re-pointed. */
export const REWIRING: SynthesisWiring = {
  fields: FIELDS,
  entities: [entity(1, 0), entity(0, 1)],
  sort: {field: 'best_price', direction: 'asc'},
  computedAgainst: {[SHOP_A]: 2, [SHOP_B]: 1},
};

type Component = {id: string; component: string; [prop: string]: unknown};

/**
 * The derived tree (task-4.4 decision 1), byte-for-byte the orchestrator's: sort control over
 * `/sort`, a header of labels, a template over `/entities` whose row is one DerivedValue per
 * field, bound by one relative path each.
 */
export function synthesisComponents(wiring: SynthesisWiring): Component[] {
  const header = wiring.fields.map<Component>(f => ({
    id: `head-${f.name}`,
    component: 'Text',
    text: f.label,
  }));
  const cells = wiring.fields.map<Component>(f => ({
    id: `cell-${f.name}`,
    component: 'DerivedValue',
    cell: {path: f.name},
  }));
  return [
    {id: 'root', component: 'Column', children: ['sort', 'header', 'list']},
    {id: 'sort', component: 'SortControl', sort: {path: '/sort'}},
    {id: 'header', component: 'Row', children: header.map(c => c.id)},
    ...header,
    {id: 'list', component: 'Column', children: {path: '/entities', componentId: 'entity'}},
    {id: 'entity', component: 'Row', children: cells.map(c => c.id)},
    ...cells,
  ];
}

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;

/** A storefront's fragment: a heading over its list, with the list in its data model. */
export function storefrontMessages(
  surfaceId: string,
  catalogId: string,
  title: string,
  items: readonly {name: string; price: number}[],
): A2uiMessage[] {
  return [
    msg({createSurface: {surfaceId, catalogId}}),
    msg({
      updateComponents: {
        surfaceId,
        components: [
          {id: 'root', component: 'Column', children: ['h', 'list']},
          {id: 'h', component: 'Text', text: title},
          {id: 'list', component: 'Column', children: {path: '/items', componentId: 'item'}},
          {id: 'item', component: 'Row', children: ['item-name', 'item-price']},
          {id: 'item-name', component: 'Text', text: {path: 'name'}},
          {id: 'item-price', component: 'Text', text: {path: 'price'}},
        ],
      },
    }),
    // A copy: the data model stores by reference, and a fixture must not be edited in place.
    msg({updateDataModel: {surfaceId, value: {items: items.map(item => ({...item}))}}}),
  ];
}

/** The synthesis surface's paint: create against the shell catalog, then the derived tree. */
export function synthesisMessages(wiring: SynthesisWiring, catalogId: string): A2uiMessage[] {
  return [
    msg({createSurface: {surfaceId: SYNTHESIS_SURFACE, catalogId}}),
    msg({
      updateComponents: {surfaceId: SYNTHESIS_SURFACE, components: synthesisComponents(wiring)},
    }),
  ];
}
