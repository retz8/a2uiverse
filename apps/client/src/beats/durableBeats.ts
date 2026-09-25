/**
 * Phase 9's synthetic beats (task-9.8 decisions 1–3): every durable-composition case as an authored
 * session of several canvases, over Phase 8's three storefronts joined on the camera — Aperture &
 * Co the home source. A beat names the canvas each action, press, view and close acts on by the
 * ordinal of the question that opened it; a question asked while a turn still streams runs beside
 * it on its clock.
 *
 * A drill-down inside a fragment is a new paint of that store — the list re-created as one camera,
 * titled — so it is a step in that store's history with a way back; the merged view re-synthesized
 * over it rides the action's stream, as the orchestrator's walk puts it there.
 */
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import type {CompositionOperation} from '@a2uiverse/sdk';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import type {BeatBatch, BeatFixture, BeatTurn} from './beatFixtures';
import {
  FIELDSTONE_WORDS,
  firstPaint,
  fragment,
  merge,
  NAMES,
  PAINTS,
  press,
  repaint,
  retry,
  type Layout,
  type Store,
  utterance,
} from './lateFailureBeats';
import {listMessages, SHOP_A, SHOP_A_ITEMS, SHOP_B, SHOP_B_PRODUCTS} from './synthesisFixture';

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;

const base = {
  model: 'synthetic',
  recordedAt: '2026-09-25T00:00:00Z',
  contextId: 'ctx-synthetic-durable',
  chainedFrom: null,
};

const beat = (name: string, number: number, title: string, turns: BeatTurn[]): BeatFixture => ({
  ...base,
  name: `synthetic-${name}`,
  beat: number,
  title,
  prompt: turns[0]!.prompt,
  turns,
});

export const SHIPPING = 'which of my cameras ship this week?';

/** The stores' list paints, each titled by its store: what a way back is named by. */
const titled = (store: Store): A2uiMessage[] => {
  const messages = PAINTS[store]();
  const create = (messages[0] as unknown as {createSurface: {surfaceId: string}}).createSurface;
  return [msg({paintMeta: {surfaceId: create.surfaceId, title: NAMES[store]}}), ...messages];
};

const MERGED_ALL: Layout = {merge: {merged: ['shop-a', 'shop-b', 'shop-c']}};

/** A question answered whole: the layout, the three stores, the merged view over them. */
const landed = (from = 0): BeatBatch[] => [
  {...firstPaint(), offsetMs: from},
  fragment(from + 400, 'shop-a', titled('shop-a')),
  fragment(from + 600, 'shop-b', titled('shop-b')),
  fragment(from + 800, 'shop-c', titled('shop-c')),
  merge(from + 2600, ['shop-b', 'shop-c']),
  repaint(from + 2600, MERGED_ALL),
];

/** The reader opens a camera in a store: that store repainted as the one camera, titled. */
function opened(store: 'shop-a' | 'shop-b', offsetMs: number): BeatBatch {
  const item = SHOP_A_ITEMS.find(i => i.id === 'lumen-x100')!;
  const product = SHOP_B_PRODUCTS.find(p => p.sku === 'lumen-x100')!;
  const [surfaceId, list, nameField, rows, title] =
    store === 'shop-a'
      ? [SHOP_A, 'items', 'name', [item], item.name]
      : [SHOP_B, 'products', 'title', [product], product.title];
  return fragment(offsetMs, store, [
    msg({paintMeta: {surfaceId, title}}),
    ...listMessages(surfaceId, SHELL_CATALOG_ID, title, list, nameField, {
      [list]: rows.map(row => ({...row})),
    }),
  ]);
}

/** The reader's action inside `store`'s fragment on `canvas`: its paint, then the merge's walk. */
function openCamera(name: string, canvas: number, store: 'shop-a' | 'shop-b'): BeatTurn {
  const surfaceId = store === 'shop-a' ? SHOP_A : SHOP_B;
  return {
    taskId: `${name}-open-${store}`,
    kind: 'surface-action',
    prompt: '',
    action: {
      name: 'open-camera',
      context: {cameraId: 'lumen-x100'},
      surfaceId,
      sourceComponentId: 'row',
      timestamp: '2026-09-25T00:00:00Z',
    },
    canvas,
    batches: [
      opened(store, 300),
      merge(1800, ['shop-b', 'shop-c'], undefined, ['lumen-x100']),
      repaint(1800, MERGED_ALL),
    ],
    outcome: 'completed',
    durationMs: 1800,
  };
}

const event = (kind: 'view' | 'close', canvas: number, atMs: number): BeatTurn => ({
  taskId: null,
  kind,
  prompt: '',
  action: null,
  canvas,
  atMs,
  batches: [],
  outcome: 'completed',
  durationMs: 0,
});

const step = (source: Store, to: number): CompositionOperation => ({
  kind: 'step',
  sources: [source],
  step: to,
});

/** Far enough that a paced replay never reaches it while a page is looked at. */
const HELD_MS = 10 * 60 * 1000;

/**
 * A tab finishing in the background: the cameras question asked, its home store straggling; the
 * shipping question asked from it while it loads, which opens live; then the first canvas viewed
 * again, its merge landed while the reader was elsewhere.
 */
export const BACKGROUND_TAB_BEAT = beat(
  'background-tab',
  150,
  'A tab finishing in the background',
  [
    utterance('background-tab', [
      firstPaint(),
      fragment(400, 'shop-b', titled('shop-b')),
      fragment(700, 'shop-c', titled('shop-c')),
      fragment(6000, 'shop-a', titled('shop-a')),
      merge(8000, ['shop-b', 'shop-c']),
      repaint(8000, MERGED_ALL),
    ]),
    {...utterance('background-tab-shipping', landed(), SHIPPING), atMs: 1500},
    event('view', 0, 9000),
  ],
);

/** The same, resting while the first canvas still loads behind the live one. */
export const BACKGROUND_RUNNING_BEAT: BeatFixture = {
  ...BACKGROUND_TAB_BEAT,
  name: 'synthetic-background-tab-running',
  beat: 160,
  title: 'A tab still loading in the background',
  turns: BACKGROUND_TAB_BEAT.turns
    .filter(turn => turn.kind !== 'view')
    .map((turn, i) =>
      i === 0
        ? {
            ...turn,
            batches: turn.batches.map(b => (b.offsetMs >= 6000 ? {...b, offsetMs: HELD_MS} : b)),
          }
        : turn,
    ),
};

const FIELDSTONE_FAILED = {
  state: 'failed' as const,
  failure: {cause: 'vendor' as const, message: FIELDSTONE_WORDS},
};
const MERGED_AB: Layout = {merge: {merged: ['shop-a', 'shop-b']}, 'shop-c': FIELDSTONE_FAILED};

/**
 * An action and a press in a past canvas: the cameras question with Fieldstone failing fast, then
 * the shipping question; back on the first canvas, a camera opened in Aperture & Co and Retry
 * pressed on Fieldstone — both landing in it, no new entry.
 */
export const PAST_ACTION_BEAT = beat('past-action', 151, 'An action and a press in a past canvas', [
  utterance('past-action', [
    firstPaint(),
    repaint(200, {'shop-c': FIELDSTONE_FAILED}),
    fragment(400, 'shop-a', titled('shop-a')),
    fragment(700, 'shop-b', titled('shop-b')),
    merge(2600, ['shop-b']),
    repaint(2600, MERGED_AB),
  ]),
  utterance('past-action-shipping', landed(), SHIPPING),
  event('view', 0, 3000),
  {
    ...openCamera('past-action', 0, 'shop-a'),
    batches: [
      opened('shop-a', 300),
      merge(1800, ['shop-b'], undefined, ['lumen-x100']),
      repaint(1800, MERGED_AB),
    ],
  },
  {
    ...press('past-action', retry('shop-c'), 2500, [
      repaint(10, {merge: {merged: ['shop-a', 'shop-b']}}),
      fragment(400, 'shop-c', titled('shop-c')),
      repaint(420, {merge: {merged: ['shop-a', 'shop-b'], working: {sources: ['shop-c']}}}),
      merge(2400, ['shop-b', 'shop-c'], undefined, ['lumen-x100']),
      repaint(2400, MERGED_ALL),
    ]),
    canvas: 0,
  },
]);

const FIELDSTONE_ONLY: Layout = {merge: false, stores: ['shop-c']};

/**
 * "Ask this again now", and a question asked from a view: the cameras question, then the shipping
 * question; the cameras question asked again from the first canvas, then "only Fieldstone" asked
 * from it — two children of the first canvas, which stands.
 */
export const ASK_AGAIN_BEAT = beat(
  'ask-again',
  152,
  '“Ask this again now”, and a question asked from a view',
  [
    utterance('ask-again', landed()),
    utterance('ask-again-shipping', landed(), SHIPPING),
    {...utterance('ask-again-again', landed()), askedFrom: 0},
    {
      ...utterance(
        'ask-again-fieldstone',
        [firstPaint(FIELDSTONE_ONLY), fragment(400, 'shop-c', titled('shop-c'))],
        'only Fieldstone',
      ),
      askedFrom: 0,
    },
  ],
);

const SIDE_BY_SIDE = 'put Aperture & Co and Northlight side by side';
const AB: Layout = {merge: false, stores: ['shop-a', 'shop-b']};
const ABC: Layout = {merge: false};
const A_ONLY: Layout = {merge: false, stores: ['shop-a']};
const AB_MERGED: Layout = {stores: ['shop-a', 'shop-b']};

/** A layout's stores arriving in turn, with no merged view. */
const laidOut = (layout: Layout): BeatBatch[] => [
  firstPaint(layout),
  ...(layout.stores ?? (['shop-a', 'shop-b', 'shop-c'] as const)).map((store, i) =>
    fragment(400 + 200 * i, store, titled(store)),
  ),
];

/**
 * Add a source, drop one, and compare these: two stores side by side, then Fieldstone added,
 * Northlight dropped and the two compared — each asked from the side-by-side canvas, which stands.
 */
export const ADD_DROP_BEAT = beat('add-drop', 153, 'Add a source, drop one, and compare these', [
  utterance('add-drop', laidOut(AB), SIDE_BY_SIDE),
  {...utterance('add-drop-add', laidOut(ABC), 'add Fieldstone to this'), askedFrom: 0},
  {...utterance('add-drop-drop', laidOut(A_ONLY), 'without Northlight'), askedFrom: 0},
  {
    ...utterance(
      'add-drop-compare',
      [
        ...laidOut(AB_MERGED),
        merge(2600, ['shop-b'], ['shop-a', 'shop-b']),
        repaint(2600, {...AB_MERGED, merge: {merged: ['shop-a', 'shop-b']}}),
      ],
      'compare these',
    ),
    askedFrom: 0,
  },
]);

/**
 * A step back with the wiring restored: a camera opened in Aperture & Co, the merged view
 * re-synthesized over it; Back on Aperture & Co returns its list and the view remembered over it,
 * the step's stream silent — no call.
 */
export const STEP_SEEN_BEAT = beat('step-seen', 154, 'A step back with the wiring restored', [
  utterance('step-seen', landed()),
  openCamera('step-seen', 0, 'shop-a'),
  {...press('step-seen', step('shop-a', 0), 2500, []), canvas: 0},
]);

/**
 * An unseen combination falling to the walk: a camera opened in Aperture & Co, then in Northlight;
 * Back on Aperture & Co lands on a combination never merged, so the merge line works until the
 * step's stream brings the view the walk made.
 */
export const STEP_UNSEEN_BEAT = beat(
  'step-unseen',
  155,
  'An unseen combination falling to the walk',
  [
    utterance('step-unseen', landed()),
    openCamera('step-unseen', 0, 'shop-a'),
    openCamera('step-unseen', 0, 'shop-b'),
    {
      ...press('step-unseen', step('shop-a', 0), 2500, [
        merge(2000, ['shop-b', 'shop-c'], undefined, ['lumen-x100', 'verity-a7']),
        repaint(2000, MERGED_ALL),
      ]),
      canvas: 0,
    },
  ],
);

/** The same, resting while the walk works: the merge line working, the step's answer held. */
export const STEP_UNSEEN_WORKING_BEAT: BeatFixture = {
  ...STEP_UNSEEN_BEAT,
  name: 'synthetic-step-unseen-working',
  beat: 165,
  title: 'An unseen combination, the walk working',
  turns: STEP_UNSEEN_BEAT.turns.map(turn =>
    turn.kind === 'press'
      ? {...turn, batches: turn.batches.map(b => ({...b, offsetMs: HELD_MS}))}
      : turn,
  ),
};

/**
 * Closing a loading canvas: the shipping question answered, then the cameras question asked and
 * closed from the trail while it loads — its turn ends, the answered canvas live again.
 */
export const CLOSE_LOADING_BEAT = beat('close-loading', 156, 'Closing a loading canvas', [
  utterance('close-loading-shipping', landed(), SHIPPING),
  utterance('close-loading', [
    firstPaint(),
    fragment(400, 'shop-a', titled('shop-a')),
    fragment(700, 'shop-b', titled('shop-b')),
    fragment(6000, 'shop-c', titled('shop-c')),
    merge(8000, ['shop-b', 'shop-c']),
    repaint(8000, MERGED_ALL),
  ]),
  event('close', 1, 1500),
]);

/** Phase 9's synthetic beats, each played to its end. */
export const DURABLE_BEATS: readonly BeatFixture[] = [
  BACKGROUND_TAB_BEAT,
  PAST_ACTION_BEAT,
  ASK_AGAIN_BEAT,
  ADD_DROP_BEAT,
  STEP_SEEN_BEAT,
  STEP_UNSEEN_BEAT,
  CLOSE_LOADING_BEAT,
];

/** The cases resting mid-way: a tab still loading behind the live one, and the walk working. */
export const DURABLE_RESTING: readonly BeatFixture[] = [
  BACKGROUND_RUNNING_BEAT,
  STEP_UNSEEN_WORKING_BEAT,
];
