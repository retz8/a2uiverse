/**
 * The join fixture (task-7.9 decisions 1, 6): a merged view whose rows each carry a list of one
 * source's matching entries, every entry an object with its own match claim against the row, and
 * a repaint that changes a matched field. One row's offers are held by a fact, the other's by
 * judgment alone; one sort declaration orders the list inside every row.
 *
 * The storefronts are the synthesis fixture's, under their own listings: Northlight lists two
 * offers per camera. Shared by the synthetic beat and the tests, so the sequence has one author.
 */
import {
  SHOP_A,
  SHOP_A_NAME,
  SHOP_B,
  SHOP_B_NAME,
  type ShopAItem,
  type ShopBProduct,
  type SynthesisDocument,
} from './synthesisFixture';

export const JOIN_ITEMS: ShopAItem[] = [
  {id: 'lumen-x100', name: 'Lumen X100', price: 1299, inStock: true},
  {id: 'verity-a7', name: 'Verity A7', price: 1849, inStock: false},
];

export const JOIN_PRODUCTS: ShopBProduct[] = [
  {sku: 'lumen-x100', title: 'Lumen X100', price: 1349, available: 0},
  {sku: 'lumen-x100-kit', title: 'Lumen X100 kit', price: 1499, available: 3},
  {sku: 'verity-a7', title: 'Verity A7 body', price: 1799, available: 2},
  {sku: 'verity-a7-lens', title: 'Verity A7 with 35mm lens', price: 2199, available: 1},
];

/** The listing Northlight retitles, and what it becomes: the fact that held it fails. */
export const RETITLED_SKU = 'lumen-x100';
export const RETITLED_TITLE = 'Northlight Classic 100';

/** Northlight's list after the repaint: one matched title changed, every key as it was. */
export const JOIN_PRODUCTS_RETITLED: ShopBProduct[] = JOIN_PRODUCTS.map(product =>
  product.sku === RETITLED_SKU ? {...product, title: RETITLED_TITLE} : product,
);

const ref = (surface: string, pointer: string) => ({surface, pointer});
const value = (surface: string, pointer: string) => ({op: 'value', args: [ref(surface, pointer)]});

type Relation = 'contains' | 'judged';

/** One offer of a camera: Northlight's values, claimed against the row's camera by its title. */
function offer(id: string, sku: string, name: string, relation: Relation) {
  const title = ref(SHOP_B, `/products[sku="${sku}"]/title`);
  const camera = ref(SHOP_A, `/items[id="${id}"]/name`);
  return {
    title: value(SHOP_B, `/products[sku="${sku}"]/title`),
    price: value(SHOP_B, `/products[sku="${sku}"]/price`),
    // `contains(a, b)`: b's words unbroken inside a's — the title names the camera.
    match: {[name]: {op: relation, args: [title, camera]}},
  };
}

function joinRow(id: string, skus: string[], name: string, relation: Relation) {
  return {
    name: value(SHOP_A, `/items[id="${id}"]/name`),
    priceA: value(SHOP_A, `/items[id="${id}"]/price`),
    offers: skus.map(sku => offer(id, sku, name, relation)),
    offerCount: {op: 'count', args: skus.map(sku => ref(SHOP_B, `/products[sku="${sku}"]/sku`))},
  };
}

export const JOIN_DOCUMENT: SynthesisDocument = {
  tree: {
    components: [
      {id: 'root', component: 'Column', children: ['head', 'sort-offers', 'rows']},
      {
        id: 'head',
        component: 'Row',
        justify: 'spaceBetween',
        align: 'center',
        children: ['heading', 'sort-rows'],
      },
      {id: 'heading', component: 'Text', variant: 'h5', text: 'Cameras and their offers'},
      {id: 'sort-rows', component: 'SortControl', sort: {path: '/sorts/0'}},
      {id: 'sort-offers', component: 'SortControl', sort: {path: '/sorts/1'}},
      {
        id: 'rows',
        component: 'Table',
        columns: ['Camera', SHOP_A_NAME, `${SHOP_B_NAME} offers`, 'Offers'],
        children: {path: '/rows', componentId: 'row'},
      },
      {id: 'row', component: 'TableRow', children: ['c-name', 'c-a', 'c-offers', 'c-count']},
      {id: 'c-name', component: 'DerivedValue', cell: {path: 'name'}},
      {id: 'c-a', component: 'DerivedValue', cell: {path: 'priceA'}, format: {kind: 'number'}},
      {id: 'c-offers', component: 'Column', children: {path: 'offers', componentId: 'offer'}},
      {id: 'offer', component: 'Row', children: ['o-title', 'o-price']},
      {id: 'o-title', component: 'DerivedValue', cell: {path: 'title'}},
      {id: 'o-price', component: 'DerivedValue', cell: {path: 'price'}, format: {kind: 'number'}},
      {id: 'c-count', component: 'DerivedValue', cell: {path: 'offerCount'}},
    ],
  },
  dataModel: {
    rows: [
      joinRow('lumen-x100', ['lumen-x100', 'lumen-x100-kit'], 'title names the camera', 'contains'),
      joinRow('verity-a7', ['verity-a7', 'verity-a7-lens'], 'same camera', 'judged'),
    ],
  } as SynthesisDocument['dataModel'],
  sorts: [
    {
      path: '/rows',
      options: [{key: '/priceA', label: SHOP_A_NAME}],
      key: '/priceA',
      direction: 'asc',
    },
    {
      path: '/rows/*/offers',
      options: [{key: '/price', label: 'Offer price'}],
      key: '/price',
      direction: 'asc',
    },
  ],
};
