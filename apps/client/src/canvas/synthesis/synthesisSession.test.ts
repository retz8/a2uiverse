/**
 * The synthesis session over a real MessageProcessor: intake, the data-model subscriptions that
 * re-run the evaluator, the sort write-back, stale from generations, the sticky user sort across
 * re-synthesis, rejection, and retirement.
 */
import {beforeEach, describe, expect, test, vi} from 'vitest';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import {CATALOG, CATALOG_ID, OPERATORS} from '@a2uiverse/shell-catalog';
import {
  REWIRING,
  SHOP_A,
  SHOP_A_ITEMS,
  SHOP_B,
  SHOP_B_ITEMS,
  storefrontMessages,
  SYNTHESIS_SLOT,
  SYNTHESIS_SURFACE,
  synthesisMessages,
  WIRING,
} from '../../beats/synthesisFixture';
import type {SynthesisModel} from './bindingEvaluator';
import {applyA2uiMessages} from '../../a2ui/applyMessages';
import {createSynthesisSession, type SynthesisFailure} from './synthesisSession';

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;

const target = {surfaceId: SYNTHESIS_SURFACE, slot: SYNTHESIS_SLOT};

/** Subscription-driven evaluations coalesce to a microtask; intake is synchronous. */
const settled = () => Promise.resolve();

let processor: MessageProcessor<ReactComponentImplementation>;
let failures: SynthesisFailure[];
let session: ReturnType<typeof createSynthesisSession>;

const model = () =>
  processor.model.getSurface(SYNTHESIS_SURFACE)!.dataModel.get('/') as SynthesisModel;
const names = () => model().entities.map(e => e.name.value);
const best = () => model().entities.map(e => e.best_price);

/** Both storefronts painted, generations noted as their stamps would carry them. */
function paintStorefronts() {
  session.noteGenerations({[SHOP_A]: 1});
  processor.processMessages(storefrontMessages(SHOP_A, CATALOG_ID, 'Shop A', SHOP_A_ITEMS));
  session.noteGenerations({[SHOP_B]: 1});
  processor.processMessages(storefrontMessages(SHOP_B, CATALOG_ID, 'Shop B', SHOP_B_ITEMS));
}

/** The synthesis paint (a repeat create is a repaint), then the wiring accepted — the runner's order. */
function paintSynthesis(wiring = WIRING) {
  applyA2uiMessages(processor, synthesisMessages(wiring, CATALOG_ID));
  session.accept(target, wiring);
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
  test('accepting the wiring writes the evaluated model before anything renders', () => {
    paintStorefronts();
    paintSynthesis();
    expect(session.wiring).toEqual(WIRING);
    expect(names()).toEqual(['X100', 'Z6']);
    expect(best().map(c => c.value)).toEqual([899, 1899]);
    expect(model().sort).toEqual({field: 'best_price', direction: 'asc', fields: WIRING.fields});
  });

  test('an invalid wiring is reported against the synthesis surface and its slot, and nothing is held', () => {
    paintStorefronts();
    processor.processMessages(synthesisMessages(WIRING, CATALOG_ID));
    session.accept(target, {...WIRING, sort: {field: 'rating', direction: 'asc'}});
    expect(failures).toEqual([
      {
        surfaceId: SYNTHESIS_SURFACE,
        slot: SYNTHESIS_SLOT,
        path: '/sort/field',
        message: expect.any(String),
      },
    ]);
    expect(session.wiring).toBeUndefined();
    expect(
      processor.model.getSurface(SYNTHESIS_SURFACE)!.dataModel.get('/entities'),
    ).toBeUndefined();
  });
});

describe('re-evaluation', () => {
  test("a vendor's data-model update re-evaluates through the subscription", async () => {
    paintStorefronts();
    paintSynthesis();
    processor.processMessages([
      msg({updateDataModel: {surfaceId: SHOP_A, path: '/items/0/price', value: 850}}),
    ]);
    await settled();
    expect(best()[0]).toMatchObject({value: 850, contributed: 2});
  });

  test('a two-way edit inside a vendor fragment re-evaluates the same way', async () => {
    paintStorefronts();
    paintSynthesis();
    processor.model.getSurface(SHOP_B)!.dataModel.set('/items/1/price', 1500);
    await settled();
    expect(best().find(c => c.value === 1500)).toBeDefined();
  });

  test('a drill-down makes refs absent, free; the list returning reconnects them', async () => {
    paintStorefronts();
    paintSynthesis();
    processor.model.getSurface(SHOP_B)!.dataModel.set('/', {detail: {name: 'X100'}});
    await settled();
    expect(best()[0]).toEqual({value: 949, contributed: 1, of: 2, absent: [SHOP_B]});
    processor.model.getSurface(SHOP_B)!.dataModel.set('/', {items: SHOP_B_ITEMS});
    await settled();
    expect(best()[0]).toEqual({value: 899, contributed: 2, of: 2, absent: []});
  });

  test('an unchanged output is not rewritten', async () => {
    paintStorefronts();
    paintSynthesis();
    const set = vi.spyOn(processor.model.getSurface(SYNTHESIS_SURFACE)!.dataModel, 'set');
    processor.model.getSurface(SHOP_A)!.dataModel.set('/items/0/name', 'X100');
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
      msg({updateDataModel: {surfaceId: SHOP_B, path: '/items/1/price', value: 1700}}),
    ]);
    expect(set).not.toHaveBeenCalled();
    await settled();
    expect(set).toHaveBeenCalledTimes(1);
    expect(best().map(c => c.value)).toEqual([800, 1700]);
  });
});

describe('sort', () => {
  test('the sort control writing /sort re-orders, with no generation touched', async () => {
    paintStorefronts();
    paintSynthesis();
    const synthesis = processor.model.getSurface(SYNTHESIS_SURFACE)!.dataModel;
    synthesis.set('/sort', {...model().sort, direction: 'desc'});
    await settled();
    expect(names()).toEqual(['Z6', 'X100']);
    expect(session.generations).toEqual({[SHOP_A]: 1, [SHOP_B]: 1});
    synthesis.set('/sort', {...model().sort, field: 'name', direction: 'asc'});
    await settled();
    expect(names()).toEqual(['X100', 'Z6']);
    expect(model().sort.field).toBe('name');
  });

  test("the user's sort sticks through a re-synthesis while its field exists", () => {
    paintStorefronts();
    paintSynthesis();
    processor.model.getSurface(SYNTHESIS_SURFACE)!.dataModel.set('/sort', {
      ...model().sort,
      direction: 'desc',
    });
    // Shop A reorders in place; the re-synthesis re-points the join.
    processor.model.getSurface(SHOP_A)!.dataModel.set('/items', [...SHOP_A_ITEMS].reverse());
    session.noteGenerations({[SHOP_A]: 2});
    paintSynthesis(REWIRING);
    expect(model().sort).toMatchObject({field: 'best_price', direction: 'desc'});
    expect(names()).toEqual(['Z6', 'X100']);
  });
});

describe('stale', () => {
  test('a bump on the stamp marks every cell with a ref into that surface, before any data lands', () => {
    paintStorefronts();
    paintSynthesis();
    session.noteGenerations({[SHOP_A]: 2});
    const entity = model().entities[0];
    expect(entity.shopA_price.stale).toBe(true);
    expect(entity.best_price.stale).toBe(true);
    expect(entity.shopB_price.stale).toBeUndefined();
  });

  test('the in-place reorder: bump, stale, the vendor data lands, then the new wiring clears it', async () => {
    paintStorefronts();
    paintSynthesis();
    session.noteGenerations({[SHOP_A]: 2});
    processor.processMessages([
      msg({
        updateDataModel: {surfaceId: SHOP_A, path: '/items', value: [...SHOP_A_ITEMS].reverse()},
      }),
    ]);
    await settled();
    // Stale, and — under the old wiring — silently re-pointed: exactly the hazard.
    expect(model().entities.every(e => e.best_price.stale)).toBe(true);
    paintSynthesis(REWIRING);
    expect(model().entities.every(e => e.best_price.stale === undefined)).toBe(true);
    expect(names()).toEqual(['X100', 'Z6']);
    expect(best().map(c => c.value)).toEqual([899, 1899]);
  });
});

describe('lifetimes', () => {
  test('a vendor surface re-created by a repaint is watched again', async () => {
    paintStorefronts();
    paintSynthesis();
    processor.processMessages([msg({deleteSurface: {surfaceId: SHOP_A}})]);
    await settled();
    expect(best()[0]).toMatchObject({contributed: 1, absent: [SHOP_A]});
    processor.processMessages(storefrontMessages(SHOP_A, CATALOG_ID, 'Shop A', SHOP_A_ITEMS));
    await settled();
    expect(best()[0]).toMatchObject({contributed: 2, absent: []});
    processor.model.getSurface(SHOP_A)!.dataModel.set('/items/0/price', 800);
    await settled();
    expect(best()[0].value).toBe(800);
  });

  test('retire drops the wiring, the generations, the user sort and every subscription', async () => {
    paintStorefronts();
    paintSynthesis();
    session.retire();
    expect(session.wiring).toBeUndefined();
    expect(session.generations).toEqual({});
    const set = vi.spyOn(processor.model.getSurface(SYNTHESIS_SURFACE)!.dataModel, 'set');
    processor.model.getSurface(SHOP_A)!.dataModel.set('/items/0/price', 1);
    await settled();
    expect(set).not.toHaveBeenCalled();
  });
});
