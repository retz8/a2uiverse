/**
 * The synthesis session over a real MessageProcessor: intake, the data-model subscriptions that
 * re-run the evaluator, the sort write-back at /sorts, the sticky user choice across
 * re-synthesis, rejection, and retirement.
 */
import {beforeEach, describe, expect, test, vi} from 'vitest';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import {CATALOG_ID, createCatalog, OPERATORS, RELATIONS} from '@a2uiverse/shell-catalog';
import type {CellObject} from '@a2uiverse/shell-catalog';
import type {SynthesisPayload} from '@a2uiverse/sdk';
import {
  DOCUMENT,
  type SynthesisDocument,
  PAYLOAD,
  SHOP_A,
  SHOP_A_ITEMS,
  SHOP_A_REVERSED,
  SHOP_B,
  SHOP_B_PRODUCTS,
  shopAMessages,
  shopBMessages,
  SYNTHESIS_SOURCE,
  SYNTHESIS_SURFACE,
  synthesisMessages,
} from '../../beats/synthesisFixture';
import {
  JOIN_DOCUMENT,
  JOIN_ITEMS,
  JOIN_PRODUCTS,
  JOIN_PRODUCTS_RETITLED,
  RETITLED_TITLE,
} from '../../beats/joinFixture';
import type {EvaluatedModel} from './bindingEvaluator';
import {applyA2uiMessages} from '../../a2ui/applyMessages';
import {createSynthesisSession, SORTS_PATH, type SynthesisFailure} from './synthesisSession';

const CATALOG = createCatalog({onShellAction: () => {}});

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;

const target = {surfaceId: SYNTHESIS_SURFACE, source: SYNTHESIS_SOURCE};

/** Subscription-driven evaluations coalesce to a microtask; intake is synchronous. */
const settled = () => Promise.resolve();

type Row = Record<'name' | 'priceA' | 'priceB' | 'best', CellObject>;

let processor: MessageProcessor<ReactComponentImplementation>;
let failures: SynthesisFailure[];
let session: ReturnType<typeof createSynthesisSession>;

const model = () =>
  processor.model.getSurface(SYNTHESIS_SURFACE)!.dataModel.get('/') as EvaluatedModel;
const rows = () => model().rows as Row[];
const names = () => rows().map(r => r.name.value);
const best = () => rows().map(r => r.best);
const sorts = () => processor.model.getSurface(SYNTHESIS_SURFACE)!.dataModel;

/** Both storefronts painted. */
function paintStorefronts() {
  processor.processMessages(shopAMessages(CATALOG_ID));
  processor.processMessages(shopBMessages(CATALOG_ID));
}

/** The synthesis paint (a repeat create is a repaint), then the payload accepted — the runner's order. */
function paintSynthesis(
  document: SynthesisDocument = DOCUMENT,
  payload: SynthesisPayload = PAYLOAD,
) {
  applyA2uiMessages(processor, synthesisMessages(document, CATALOG_ID));
  session.accept(target, payload);
}

beforeEach(() => {
  processor = new MessageProcessor([CATALOG]);
  failures = [];
  session = createSynthesisSession({
    processor,
    functions: CATALOG.functions,
    operators: OPERATORS,
    relations: RELATIONS,
    onInvalid: f => failures.push(f),
  });
});

describe('intake', () => {
  test('accepting the payload writes the evaluated model, declarations at /sorts, before anything renders', () => {
    paintStorefronts();
    paintSynthesis();
    expect(session.payload).toEqual(PAYLOAD);
    expect(names()).toEqual(['Lumen X100', 'Verity A7']);
    expect(best().map(c => c.value)).toEqual([1299, 1799]);
    expect(model().sorts).toEqual(DOCUMENT.sorts);
    expect(sorts().get('/sorts/0')).toMatchObject({path: '/rows', key: '/best'});
  });

  test('an invalid payload is reported against the synthesis surface and its slot, and nothing is held', () => {
    paintStorefronts();
    processor.processMessages(synthesisMessages(DOCUMENT, CATALOG_ID));
    session.accept(target, {...PAYLOAD, sorts: [{...PAYLOAD.sorts[0]!, key: '/rating'}]});
    expect(failures).toEqual([
      {
        surfaceId: SYNTHESIS_SURFACE,
        source: SYNTHESIS_SOURCE,
        path: '/sorts/0',
        message: expect.stringContaining('/rating'),
      },
    ]);
    expect(session.payload).toBeUndefined();
    expect(processor.model.getSurface(SYNTHESIS_SURFACE)!.dataModel.get('/rows')).toBeUndefined();
  });
});

describe('re-evaluation', () => {
  test("a vendor's data-model update re-evaluates through the subscription", async () => {
    paintStorefronts();
    paintSynthesis();
    processor.processMessages([
      msg({updateDataModel: {surfaceId: SHOP_A, path: '/items/0/price', value: 1200}}),
    ]);
    await settled();
    expect(best()[0]).toMatchObject({value: 1200, contributed: 2});
  });

  test('a two-way edit inside a vendor fragment re-evaluates the same way', async () => {
    paintStorefronts();
    paintSynthesis();
    processor.model.getSurface(SHOP_B)!.dataModel.set('/products/0/price', 1500);
    await settled();
    expect(best().find(c => c.value === 1500)).toBeDefined();
  });

  test('a drill-down makes refs absent, free; the list returning reconnects them', async () => {
    paintStorefronts();
    paintSynthesis();
    processor.model.getSurface(SHOP_B)!.dataModel.set('/', {detail: {sku: 'lumen-x100'}});
    await settled();
    expect(best()[0]).toMatchObject({value: 1299, contributed: 1, of: 2, absent: [SHOP_B]});
    processor.model.getSurface(SHOP_B)!.dataModel.set('/', {products: SHOP_B_PRODUCTS});
    await settled();
    expect(best()[0]).toMatchObject({value: 1299, contributed: 2, of: 2, absent: []});
  });

  test('held, a drill-down leaves the last values standing; released, the view follows what is on screen (task-9.9 decision 23)', async () => {
    paintStorefronts();
    paintSynthesis();
    const before = best()[0];
    session.hold();
    processor.model.getSurface(SHOP_B)!.dataModel.set('/', {detail: {sku: 'lumen-x100'}});
    await settled();
    expect(best()[0]).toEqual(before);
    session.release();
    expect(best()[0]).toMatchObject({contributed: 1, of: 2, absent: [SHOP_B]});
  });

  test('a payload accepted while held lands at once', async () => {
    paintStorefronts();
    paintSynthesis();
    session.hold();
    processor.model.getSurface(SHOP_B)!.dataModel.set('/', {detail: {sku: 'lumen-x100'}});
    // The re-synthesis over the drill-down arrives before the hold ends.
    expect(session.accept(target, PAYLOAD)).toBe(true);
    expect(best()[0]).toMatchObject({absent: [SHOP_B]});
    session.release();
  });

  test('an unchanged output is not rewritten', async () => {
    paintStorefronts();
    paintSynthesis();
    const set = vi.spyOn(processor.model.getSurface(SYNTHESIS_SURFACE)!.dataModel, 'set');
    processor.model.getSurface(SHOP_A)!.dataModel.set('/items/0/name', 'Lumen X100');
    await settled();
    expect(set).not.toHaveBeenCalled();
  });

  test('a batch of several data-model writes evaluates once', async () => {
    paintStorefronts();
    paintSynthesis();
    const set = vi.spyOn(processor.model.getSurface(SYNTHESIS_SURFACE)!.dataModel, 'set');
    processor.processMessages([
      msg({updateDataModel: {surfaceId: SHOP_A, path: '/items/0/price', value: 800}}),
      msg({updateDataModel: {surfaceId: SHOP_A, path: '/items/1/price', value: 1800}}),
      msg({updateDataModel: {surfaceId: SHOP_B, path: '/products/0/price', value: 1700}}),
    ]);
    expect(set).not.toHaveBeenCalled();
    await settled();
    expect(set).toHaveBeenCalledTimes(1);
    expect(best().map(c => c.value)).toEqual([800, 1700]);
  });
});

describe('sort', () => {
  test('a sort control writing its declaration back at /sorts/N re-orders', async () => {
    paintStorefronts();
    paintSynthesis();
    sorts().set('/sorts/0', {...model().sorts[0], direction: 'desc'});
    await settled();
    expect(names()).toEqual(['Verity A7', 'Lumen X100']);
    sorts().set('/sorts/0', {...model().sorts[0], key: '/name', direction: 'asc'});
    await settled();
    expect(names()).toEqual(['Lumen X100', 'Verity A7']);
    expect(model().sorts[0]).toMatchObject({key: '/name', direction: 'asc'});
  });

  test("the user's choice sticks through a re-synthesis by array path while its key is an option (task-5.5 decision 5)", () => {
    paintStorefronts();
    paintSynthesis();
    sorts().set('/sorts/0', {...model().sorts[0], direction: 'desc'});
    // Shop A reorders in place; the keyed refs ride it out and the payload is re-sent as is.
    processor.model.getSurface(SHOP_A)!.dataModel.set('/items', SHOP_A_REVERSED);
    paintSynthesis();
    expect(model().sorts[0]).toMatchObject({path: '/rows', key: '/best', direction: 'desc'});
    expect(names()).toEqual(['Verity A7', 'Lumen X100']);
    // A re-synthesis that no longer offers the chosen key takes its own choice.
    const narrowed: SynthesisPayload = {
      ...PAYLOAD,
      sorts: [
        {
          ...PAYLOAD.sorts[0]!,
          options: [{key: '/name', label: 'Camera'}],
          key: '/name',
          direction: 'asc',
        },
      ],
    };
    paintSynthesis(DOCUMENT, narrowed);
    expect(model().sorts[0]).toMatchObject({key: '/name', direction: 'asc'});
  });
});

describe('a reorder under keyed refs (task-5.10 decision 1)', () => {
  test('the vendor list reorders in place: nothing is marked, and the values follow the keys', async () => {
    paintStorefronts();
    paintSynthesis();
    processor.processMessages([
      msg({updateDataModel: {surfaceId: SHOP_A, path: '/items', value: SHOP_A_REVERSED}}),
    ]);
    await settled();
    expect(rows().every(r => Object.values(r).every(c => !('stale' in c)))).toBe(true);
    expect(names()).toEqual(['Lumen X100', 'Verity A7']);
    expect(rows().map(r => r.priceA.value)).toEqual([1299, 1849]);
  });
});

describe('the join fixture (task-7.9 decisions 1, 6)', () => {
  type Offer = Record<'title' | 'price', CellObject>;
  type JoinRow = {name: CellObject; offers: Offer[]; offerCount: CellObject};
  const joinRows = () => model().rows as unknown as JoinRow[];
  const marks = (row: JoinRow) => row.offers.map(o => [o.title.join?.mark, o.price.join?.mark]);

  function paintJoin() {
    processor.processMessages(shopAMessages(CATALOG_ID, JOIN_ITEMS));
    processor.processMessages(shopBMessages(CATALOG_ID, JOIN_PRODUCTS));
    paintSynthesis(JOIN_DOCUMENT, {
      dataModel: JOIN_DOCUMENT.dataModel,
      sorts: JOIN_DOCUMENT.sorts,
    });
  }

  test('a repaint that changes a matched field marks the values it cut off broken, and no others', async () => {
    paintJoin();
    const [lumen, verity] = joinRows();
    expect(marks(lumen!)).toEqual([
      ['none', 'none'],
      ['none', 'none'],
    ]);
    expect(marks(verity!)).toEqual([
      ['guessed', 'guessed'],
      ['guessed', 'guessed'],
    ]);

    processor.processMessages([
      msg({updateDataModel: {surfaceId: SHOP_B, path: '/products', value: JOIN_PRODUCTS_RETITLED}}),
    ]);
    await settled();

    const [after, judged] = joinRows();
    // The retitled offer: both refs still resolve, the fact fails. Its sibling's fact holds.
    expect(after!.offers.map(o => o.title.value)).toEqual([RETITLED_TITLE, 'Lumen X100 kit']);
    expect(marks(after!)).toEqual([
      ['broken', 'broken'],
      ['none', 'none'],
    ]);
    expect(after!.offers[0]!.title.join!.evidence).toMatchObject([
      {name: 'title names the camera', state: 'fails'},
    ]);
    // A row's own values belong to no claim, and judgment never breaks.
    expect(after!.name.join).toBeUndefined();
    expect(marks(judged!)).toEqual([
      ['guessed', 'guessed'],
      ['guessed', 'guessed'],
    ]);
    expect(after!.offerCount).toMatchObject({value: 2, contributed: 2});
  });

  test('one sort declaration orders the list inside every row, by one choice', async () => {
    paintJoin();
    const prices = () => joinRows().map(row => row.offers.map(o => o.price.value));
    expect(prices()).toEqual([
      [1349, 1499],
      [1799, 2199],
    ]);
    sorts().set('/sorts/1', {...model().sorts[1], direction: 'desc'});
    await settled();
    expect(prices()).toEqual([
      [1499, 1349],
      [2199, 1799],
    ]);
    // The rows keep their own order: the other declaration was not touched.
    expect(joinRows().map(row => row.name.value)).toEqual(['Lumen X100', 'Verity A7']);
  });
});

describe('lifetimes', () => {
  test('a vendor surface re-created by a repaint is watched again', async () => {
    paintStorefronts();
    paintSynthesis();
    processor.processMessages([msg({deleteSurface: {surfaceId: SHOP_A}})]);
    await settled();
    expect(best()[0]).toMatchObject({contributed: 1, absent: [SHOP_A]});
    processor.processMessages(shopAMessages(CATALOG_ID, SHOP_A_ITEMS));
    await settled();
    expect(best()[0]).toMatchObject({contributed: 2, absent: []});
    processor.model.getSurface(SHOP_A)!.dataModel.set('/items/0/price', 800);
    await settled();
    expect(best()[0]!.value).toBe(800);
  });

  test('retire drops the payload, the user choices and every subscription', async () => {
    paintStorefronts();
    paintSynthesis();
    sorts().set(SORTS_PATH, [{...model().sorts[0], direction: 'desc'}]);
    await settled();
    session.retire();
    expect(session.payload).toBeUndefined();
    const set = vi.spyOn(processor.model.getSurface(SYNTHESIS_SURFACE)!.dataModel, 'set');
    processor.model.getSurface(SHOP_A)!.dataModel.set('/items/0/price', 1);
    await settled();
    expect(set).not.toHaveBeenCalled();
    // A fresh payload starts from its own choice: the turn is over.
    paintSynthesis();
    expect(model().sorts[0]).toMatchObject({direction: 'asc'});
  });
});
