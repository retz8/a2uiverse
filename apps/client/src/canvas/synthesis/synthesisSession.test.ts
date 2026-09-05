/**
 * The synthesis session over a real MessageProcessor: intake, the data-model subscriptions that
 * re-run the evaluator, the sort write-back at /sorts, stale from generations, the sticky user
 * choice across re-synthesis, rejection, and retirement.
 */
import {beforeEach, describe, expect, test, vi} from 'vitest';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import {CATALOG, CATALOG_ID, OPERATORS} from '@a2uiverse/shell-catalog';
import type {CellObject} from '@a2uiverse/shell-catalog';
import type {Synthesis, SynthesisPayload} from '@a2uiverse/sdk';
import {
  DOCUMENT,
  PAYLOAD,
  SHOP_A,
  SHOP_A_ITEMS,
  SHOP_A_REVERSED,
  SHOP_B,
  SHOP_B_PRODUCTS,
  shopAMessages,
  shopBMessages,
  SYNTHESIS_SLOT,
  SYNTHESIS_SURFACE,
  synthesisMessages,
} from '../../beats/synthesisFixture';
import type {EvaluatedModel} from './bindingEvaluator';
import {applyA2uiMessages} from '../../a2ui/applyMessages';
import {createSynthesisSession, SORTS_PATH, type SynthesisFailure} from './synthesisSession';

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;

const target = {surfaceId: SYNTHESIS_SURFACE, slot: SYNTHESIS_SLOT};

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
function paintSynthesis(document: Synthesis = DOCUMENT, payload: SynthesisPayload = PAYLOAD) {
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
        slot: SYNTHESIS_SLOT,
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
    expect(best()[0]).toEqual({value: 1299, contributed: 1, of: 2, absent: [SHOP_B]});
    processor.model.getSurface(SHOP_B)!.dataModel.set('/', {products: SHOP_B_PRODUCTS});
    await settled();
    expect(best()[0]).toEqual({value: 1299, contributed: 2, of: 2, absent: []});
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

  test('retire drops the payload, the generations, the user choices and every subscription', async () => {
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
