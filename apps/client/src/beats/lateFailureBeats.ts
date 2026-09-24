/**
 * Phase 8's synthetic beats (task-8.6 decision 3): every late-arrival and failure case as an
 * authored stream, over three storefronts joined on the camera — Aperture & Co the home source
 * whose cameras are the merged view's rows, Northlight's listings and Fieldstone's offers attached
 * to them. The stores paint in the shell catalog for control, as the synthesis beat's do.
 *
 * The shell's repaints carry the facts the orchestrator paints (tasks 8.3, 8.4): a failed slot's
 * cause and the vendor's words, a collapse's cause or the decline's reason, the merge's source
 * set, the sources waiting for Include, a call a press caused, the last one failed, the retried
 * sources. Each stream follows the order the recorded beats 10–18 show; a press is a stream of its
 * own beside the turn, fired at its time through the press handler.
 */
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import type {A2uiComponent, CompositionOperation} from '@a2uiverse/sdk';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import type {BeatBatch, BeatFixture, BeatTurn} from './beatFixtures';
import {
  listMessages,
  SHOP_A,
  SHOP_A_NAME,
  SHOP_B,
  SHOP_B_NAME,
  shopAMessages,
  shopBMessages,
  synthesisMessages,
  type SynthesisDocument,
} from './synthesisFixture';

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;

const base = {
  model: 'synthetic',
  recordedAt: '2026-09-23T00:00:00Z',
  contextId: 'ctx-synthetic-late-failure',
  chainedFrom: null,
};

export const SHOP_C = 'shop-c:list';
export const SHOP_C_NAME = 'Fieldstone';

type Store = 'shop-a' | 'shop-b' | 'shop-c';
/** The sources attached to the home source's rows. */
type Attached = 'shop-b' | 'shop-c';

const NAMES: Record<Store, string> = {
  'shop-a': SHOP_A_NAME,
  'shop-b': SHOP_B_NAME,
  'shop-c': SHOP_C_NAME,
};
const NOUNS: Record<Store, string> = {
  'shop-a': 'cameras',
  'shop-b': 'listings',
  'shop-c': 'offers',
};

/** Fieldstone's fragment: a heading over its `offers`, each labelled and priced. */
function shopCMessages(): A2uiMessage[] {
  return listMessages(SHOP_C, SHELL_CATALOG_ID, SHOP_C_NAME, 'offers', 'label', {
    offers: [
      {code: 'lumen-x100', label: 'Lumen X100 kit', price: 1279},
      {code: 'verity-a7', label: 'Verity A7', price: 1899},
      {code: 'orbit-gm3', label: 'Orbit GM3', price: 2149},
    ],
  });
}

/** Half of Fieldstone's fragment: the surface and its tree, the data the broken stream never sent. */
function shopCHalfDrawn(): A2uiMessage[] {
  return shopCMessages().slice(0, 2);
}

/** Fieldstone's fragment with a component the catalog rejects: `children` must name components. */
function shopCInvalid(): A2uiMessage[] {
  const [create, update, data] = shopCMessages();
  const components = (
    update as unknown as {updateComponents: {components: Array<Record<string, unknown>>}}
  ).updateComponents.components.map(c => (c.id === 'row' ? {...c, children: 42} : c));
  return [create!, msg({updateComponents: {surfaceId: SHOP_C, components}}), data!];
}

const ref = (surface: string, pointer: string) => ({surface, pointer});
const value = (surface: string, pointer: string) => ({op: 'value', args: [ref(surface, pointer)]});
const PRICE: Record<Store, (id: string) => ReturnType<typeof ref>> = {
  'shop-a': id => ref(SHOP_A, `/items[id="${id}"]/price`),
  'shop-b': id => ref(SHOP_B, `/products[sku="${id}"]/price`),
  'shop-c': id => ref(SHOP_C, `/offers[code="${id}"]/price`),
};

export const MERGED_COLUMNS = ['Camera', SHOP_A_NAME, SHOP_B_NAME, SHOP_C_NAME, 'Best price'];
const COLUMN_SOURCES: Array<Store | null> = ['shop-a', 'shop-a', 'shop-b', 'shop-c', null];

/**
 * The merged view over the home source and the attached sources in `over`: a row per camera, each
 * store's price, the best of them. A column marked to a source the merge landed without keeps its
 * place — its cell the Synthesizer's dash, drawn reserved by the client from the slot's state.
 */
export function mergedView(over: readonly Attached[]): SynthesisDocument {
  const joined: Store[] = ['shop-a', ...over];
  const row = (id: string) => ({
    name: value(SHOP_A, `/items[id="${id}"]/name`),
    ...Object.fromEntries(
      joined.map(store => [`price-${store}`, {op: 'value', args: [PRICE[store](id)]}]),
    ),
    best: {op: 'min', args: joined.map(store => PRICE[store](id))},
  });
  const cell = (store: Store): A2uiComponent =>
    joined.includes(store)
      ? {
          id: `c-${store}`,
          component: 'DerivedValue',
          cell: {path: `price-${store}`},
          format: {kind: 'number'},
        }
      : {id: `c-${store}`, component: 'Text', text: '—'};
  return {
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
        {id: 'heading', component: 'Text', variant: 'h5', text: 'Cameras across three stores'},
        {id: 'sort', component: 'SortControl', sort: {path: '/sorts/0'}},
        {
          id: 'rows',
          component: 'Table',
          columns: MERGED_COLUMNS,
          columnSources: COLUMN_SOURCES,
          children: {path: '/rows', componentId: 'row'},
        },
        {
          id: 'row',
          component: 'TableRow',
          children: ['c-name', 'c-shop-a', 'c-shop-b', 'c-shop-c', 'c-best'],
        },
        {id: 'c-name', component: 'DerivedValue', cell: {path: 'name'}},
        cell('shop-a'),
        cell('shop-b'),
        cell('shop-c'),
        {id: 'c-best', component: 'DerivedValue', cell: {path: 'best'}, format: {kind: 'number'}},
      ],
    },
    dataModel: {rows: [row('lumen-x100'), row('verity-a7')]},
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
  };
}

/** A vendor slot as painted: its state, and its failure once failed. */
interface VendorSlot {
  state?: 'pending' | 'failed';
  failure?: {cause: 'vendor' | 'unreachable' | 'timeout' | 'invalid'; message?: string};
}

/** The merged view's slot as painted: its state and the facts the lines are drawn from. */
interface MergeSlot {
  state?: 'pending' | 'collapsed';
  declined?: {reason: string};
  collapse?: {
    cause: 'home' | 'few' | 'unmade';
    home?: string;
    answered?: string[];
    failed?: Store[];
  };
  merged?: Store[];
  late?: Store[];
  working?: {sources: Store[]};
  callFailed?: {kind: 'include' | 'update'; sources: Store[]};
  retrying?: Store[];
}

type Layout = {merge?: MergeSlot} & Partial<Record<Store, VendorSlot>>;

const STORES: Store[] = ['shop-a', 'shop-b', 'shop-c'];

/**
 * The layout surface as the shell painter emits it (task-6.4; tasks 8.3, 8.4): the merged view's
 * slot over a row of the three stores, each wrapped in its attribution.
 */
function layoutComponents(layout: Layout): Array<Record<string, unknown>> {
  const merge = layout.merge ?? {};
  return [
    {id: 'root', component: 'Column', children: ['merged', 'stores']},
    {
      id: 'merged',
      component: 'Slot',
      source: 'shell',
      state: merge.state ?? 'pending',
      label: 'Synthesis',
      content: 'shell',
      columns: MERGED_COLUMNS,
      columnSources: COLUMN_SOURCES,
      join: {home: 'shop-a', nouns: NOUNS},
      ...(merge.declined ? {declined: merge.declined} : {}),
      ...(merge.collapse ? {collapse: merge.collapse} : {}),
      ...(merge.merged ? {merged: merge.merged} : {}),
      ...(merge.late?.length ? {late: merge.late} : {}),
      ...(merge.working ? {working: merge.working} : {}),
      ...(merge.callFailed ? {callFailed: merge.callFailed} : {}),
      ...(merge.retrying?.length ? {retrying: merge.retrying} : {}),
    },
    {id: 'stores', component: 'Row', children: STORES.map(s => `attribution-${s}`)},
    ...STORES.flatMap(store => {
      const slot = layout[store] ?? {};
      return [
        {
          id: `attribution-${store}`,
          component: 'Attribution',
          displayName: NAMES[store],
          appId: store,
          child: store,
          weight: 1,
        },
        {
          id: store,
          component: 'Slot',
          source: store,
          weight: 1,
          state: slot.state ?? 'pending',
          label: NAMES[store],
          // As the painter writes it: the source's name and the join's noun for it.
          noun: `${NAMES[store]} ${NOUNS[store]}`,
          ...(slot.state === 'failed' && slot.failure ? {failure: slot.failure} : {}),
        },
      ];
    }),
  ];
}

const SHELL = {source: 'shell', role: 'shell'} as const;

/** The hub's first paint: the whole layout, every slot pending, the merged view reserved. */
const firstPaint = (): BeatBatch => ({
  offsetMs: 0,
  stamp: SHELL,
  messages: [
    msg({createSurface: {surfaceId: 'shell:main', catalogId: SHELL_CATALOG_ID}}),
    msg({updateComponents: {surfaceId: 'shell:main', components: layoutComponents({})}}),
  ],
  texts: [],
});

/** A shell repaint: the whole tree again, the states and facts as they now stand. */
const repaint = (offsetMs: number, layout: Layout): BeatBatch => ({
  offsetMs,
  stamp: SHELL,
  messages: [
    msg({updateComponents: {surfaceId: 'shell:main', components: layoutComponents(layout)}}),
  ],
  texts: [],
});

const PAINTS: Record<Store, () => A2uiMessage[]> = {
  'shop-a': () => shopAMessages(SHELL_CATALOG_ID),
  'shop-b': () => shopBMessages(SHELL_CATALOG_ID),
  'shop-c': shopCMessages,
};

/** A store's fragment filling its slot. */
const fragment = (offsetMs: number, store: Store, messages = PAINTS[store]()): BeatBatch => ({
  offsetMs,
  stamp: {source: store, role: 'fragment'},
  messages,
  texts: [],
});

/** The merged view claiming its slot, its payload beside the stamp. */
const merge = (offsetMs: number, over: readonly Attached[]): BeatBatch => {
  const document = mergedView(over);
  return {
    offsetMs,
    stamp: {source: 'shell', role: 'fragment'},
    messages: synthesisMessages(document, SHELL_CATALOG_ID),
    synthesis: {dataModel: document.dataModel, sorts: document.sorts},
    texts: [],
  };
};

const QUESTION = 'which of my cameras is cheapest across the three stores?';

const utterance = (name: string, batches: BeatBatch[]): BeatTurn => ({
  taskId: name,
  kind: 'utterance',
  prompt: QUESTION,
  action: null,
  batches,
  outcome: 'completed',
  durationMs: batches.at(-1)?.offsetMs ?? 0,
});

const press = (
  name: string,
  operation: CompositionOperation,
  atMs: number,
  batches: BeatBatch[],
): BeatTurn => ({
  taskId: `${name}-${operation.kind}`,
  kind: 'press',
  prompt: '',
  action: null,
  operation,
  atMs,
  batches,
  outcome: 'completed',
  durationMs: batches.at(-1)?.offsetMs ?? 0,
});

const beat = (name: string, number: number, title: string, turns: BeatTurn[]): BeatFixture => ({
  ...base,
  name: `synthetic-${name}`,
  beat: number,
  title,
  prompt: QUESTION,
  turns,
});

const FIELDSTONE_WORDS = 'Fieldstone’s catalogue is being updated. Try again in a minute.';
const retry = (source: Store): CompositionOperation => ({kind: 'retry', sources: [source]});
const include = (...sources: Store[]): CompositionOperation => ({kind: 'include', sources});
const TRY_AGAIN: CompositionOperation = {kind: 'tryAgain', sources: []};

/** A fast failure, then Retry: Fieldstone's vendor fails at once; its retry is folded in on arrival. */
export const FAST_FAILURE_BEAT = beat('fast-failure', 120, 'A fast failure, then Retry', [
  utterance('fast-failure', [
    firstPaint(),
    repaint(200, {
      'shop-c': {state: 'failed', failure: {cause: 'vendor', message: FIELDSTONE_WORDS}},
    }),
    fragment(400, 'shop-a'),
    fragment(700, 'shop-b'),
    merge(2600, ['shop-b']),
    repaint(2600, {
      merge: {merged: ['shop-a', 'shop-b']},
      'shop-c': {state: 'failed', failure: {cause: 'vendor', message: FIELDSTONE_WORDS}},
    }),
  ]),
  press('fast-failure', retry('shop-c'), 4000, [
    repaint(10, {merge: {merged: ['shop-a', 'shop-b']}}),
    fragment(400, 'shop-c'),
    repaint(420, {merge: {merged: ['shop-a', 'shop-b'], working: {sources: ['shop-c']}}}),
    merge(2400, ['shop-b', 'shop-c']),
    repaint(2400, {merge: {merged: ['shop-a', 'shop-b', 'shop-c']}}),
  ]),
]);

/** A late arrival, then Include: Fieldstone lands while the merge is made, and waits for the press. */
export const LATE_INCLUDE_BEAT = beat('late-include', 121, 'A late arrival, then Include', [
  utterance('late-include', [
    firstPaint(),
    fragment(400, 'shop-a'),
    fragment(700, 'shop-b'),
    fragment(2200, 'shop-c'),
    merge(2600, ['shop-b']),
    repaint(2600, {merge: {merged: ['shop-a', 'shop-b'], late: ['shop-c']}}),
  ]),
  press('late-include', include('shop-c'), 4000, [
    repaint(10, {merge: {merged: ['shop-a', 'shop-b'], working: {sources: ['shop-c']}}}),
    merge(2000, ['shop-b', 'shop-c']),
    repaint(2000, {merge: {merged: ['shop-a', 'shop-b', 'shop-c']}}),
  ]),
]);

/** The home source straggling: the reserved merge waits for Aperture & Co, then merges on arrival. */
export const HOME_STRAGGLING_BEAT = beat('home-straggling', 122, 'The home source straggling', [
  utterance('home-straggling', [
    firstPaint(),
    fragment(400, 'shop-b'),
    fragment(700, 'shop-c'),
    fragment(4000, 'shop-a'),
    merge(6000, ['shop-b', 'shop-c']),
    repaint(6000, {merge: {merged: ['shop-a', 'shop-b', 'shop-c']}}),
  ]),
]);

const MERGED_AB: Layout['merge'] = {merged: ['shop-a', 'shop-b']};
const TIMED_OUT: VendorSlot = {state: 'failed', failure: {cause: 'timeout'}};

/**
 * An answer held past the cap, drawn by Retry: Fieldstone is failed at the hard cap, its answer
 * comes later and is held; Retry draws it at once and folds it in.
 */
export const HELD_RETRY_BEAT = beat(
  'held-retry',
  123,
  'An answer held past the cap, drawn by Retry',
  [
    utterance('held-retry', [
      firstPaint(),
      fragment(400, 'shop-a'),
      fragment(700, 'shop-b'),
      merge(2600, ['shop-b']),
      repaint(2600, {merge: MERGED_AB}),
      repaint(4000, {merge: MERGED_AB, 'shop-c': TIMED_OUT}),
    ]),
    press('held-retry', retry('shop-c'), 7000, [
      repaint(10, {merge: MERGED_AB}),
      fragment(12, 'shop-c'),
      repaint(20, {merge: {...MERGED_AB, working: {sources: ['shop-c']}}}),
      merge(2000, ['shop-b', 'shop-c']),
      repaint(2000, {merge: {merged: ['shop-a', 'shop-b', 'shop-c']}}),
    ]),
  ],
);

/**
 * The Retry race: Fieldstone's capped dispatch still runs when Retry sends the request again; the
 * re-dispatch answers first and fills the slot, the capped one is cancelled.
 */
export const RETRY_RACE_BEAT = beat('retry-race', 124, 'Retry racing a capped dispatch', [
  utterance('retry-race', [
    firstPaint(),
    fragment(400, 'shop-a'),
    fragment(700, 'shop-b'),
    merge(2600, ['shop-b']),
    repaint(2600, {merge: MERGED_AB}),
    repaint(4000, {merge: MERGED_AB, 'shop-c': TIMED_OUT}),
  ]),
  press('retry-race', retry('shop-c'), 4500, [
    repaint(10, {merge: MERGED_AB}),
    fragment(900, 'shop-c'),
    repaint(920, {merge: {...MERGED_AB, working: {sources: ['shop-c']}}}),
    merge(2900, ['shop-b', 'shop-c']),
    repaint(2900, {merge: {merged: ['shop-a', 'shop-b', 'shop-c']}}),
  ]),
]);

/** A half-drawn fragment failing: Fieldstone's stream breaks mid-paint; its fragment comes off. */
export const HALF_DRAWN_BEAT = beat('half-drawn', 125, 'A half-drawn fragment failing', [
  utterance('half-drawn', [
    firstPaint(),
    fragment(400, 'shop-a'),
    fragment(700, 'shop-b'),
    fragment(900, 'shop-c', shopCHalfDrawn()),
    repaint(1200, {'shop-c': {state: 'failed', failure: {cause: 'unreachable'}}}),
    merge(2600, ['shop-b']),
    repaint(2600, {merge: MERGED_AB, 'shop-c': {state: 'failed', failure: {cause: 'unreachable'}}}),
  ]),
]);

/**
 * A paint the client cannot draw: Fieldstone's tree fails the catalog; the client reports it at
 * the turn's end, and the hub fails the slot and takes Fieldstone out of the merge.
 */
export const INVALID_PAINT_BEAT = beat('invalid-paint', 126, 'A paint the client cannot draw', [
  utterance('invalid-paint', [
    firstPaint(),
    fragment(400, 'shop-a'),
    fragment(700, 'shop-b'),
    fragment(900, 'shop-c', shopCInvalid()),
    merge(2600, ['shop-b', 'shop-c']),
    repaint(2600, {merge: {merged: ['shop-a', 'shop-b', 'shop-c']}}),
  ]),
  {
    taskId: 'invalid-paint-report',
    kind: 'failure-report',
    prompt: '',
    action: null,
    atMs: 2600,
    batches: [
      repaint(20, {merge: MERGED_AB, 'shop-c': {state: 'failed', failure: {cause: 'invalid'}}}),
    ],
    outcome: 'completed',
    durationMs: 20,
  },
]);

/**
 * A failed fold-in: Include's call fails, the landed view is kept, and the late line says so
 * beside the press that tries again.
 */
export const FAILED_FOLD_IN_BEAT = beat('failed-fold-in', 127, 'A failed fold-in', [
  utterance('failed-fold-in', [
    firstPaint(),
    fragment(400, 'shop-a'),
    fragment(700, 'shop-b'),
    fragment(2200, 'shop-c'),
    merge(2600, ['shop-b']),
    repaint(2600, {merge: {...MERGED_AB, late: ['shop-c']}}),
  ]),
  press('failed-fold-in', include('shop-c'), 4000, [
    repaint(10, {merge: {...MERGED_AB, working: {sources: ['shop-c']}}}),
    repaint(2000, {
      merge: {...MERGED_AB, late: ['shop-c'], callFailed: {kind: 'include', sources: ['shop-c']}},
    }),
  ]),
]);

const DECLINE_REASON =
  'Northlight lists these cameras under other names, and nothing ties its listings to your cameras.';
const DECLINED: Layout['merge'] = {state: 'collapsed', declined: {reason: DECLINE_REASON}};

/**
 * A decline, then Include: the Synthesizer finds nothing to join and the merge collapses to its
 * reason; Fieldstone arrives after and is offered under that line; Include makes the merge over
 * every arrived source.
 */
export const INCLUDE_AFTER_DECLINE_BEAT = beat(
  'include-after-decline',
  128,
  'A decline, then Include',
  [
    utterance('include-after-decline', [
      firstPaint(),
      fragment(400, 'shop-a'),
      fragment(700, 'shop-b'),
      repaint(2600, {merge: DECLINED}),
      fragment(3200, 'shop-c'),
      repaint(3200, {merge: {...DECLINED, late: ['shop-c']}}),
    ]),
    press('include-after-decline', include('shop-c'), 4500, [
      repaint(10, {merge: {...DECLINED, working: {sources: ['shop-c']}}}),
      merge(2200, ['shop-b', 'shop-c']),
      repaint(2200, {merge: {merged: ['shop-a', 'shop-b', 'shop-c']}}),
    ]),
  ],
);

const UNMADE: Layout['merge'] = {state: 'collapsed', collapse: {cause: 'unmade'}};

/** Try again: the merged view couldn't be made; the press makes it over every arrived source. */
export const TRY_AGAIN_BEAT = beat(
  'try-again',
  129,
  'The merged view couldn’t be made, then Try again',
  [
    utterance('try-again', [
      firstPaint(),
      fragment(400, 'shop-a'),
      fragment(700, 'shop-b'),
      fragment(900, 'shop-c'),
      repaint(3000, {merge: UNMADE}),
    ]),
    press('try-again', TRY_AGAIN, 4500, [
      repaint(10, {merge: {...UNMADE, working: {sources: []}}}),
      merge(2400, ['shop-b', 'shop-c']),
      repaint(2400, {merge: {merged: ['shop-a', 'shop-b', 'shop-c']}}),
    ]),
  ],
);

const APERTURE_WORDS = 'Aperture & Co could not load your cameras.';
const HOME_FAILED: VendorSlot = {
  state: 'failed',
  failure: {cause: 'vendor', message: APERTURE_WORDS},
};
const HOME_COLLAPSED: Layout['merge'] = {
  state: 'collapsed',
  collapse: {cause: 'home', home: 'Aperture & Co cameras'},
};

/**
 * The home source failing, then Retry: the merge collapses at once with no call; Retry on the home
 * source waits, then brings the merge back — nothing moving until its view lands.
 */
export const HOME_RETRY_BEAT = beat(
  'home-retry',
  130,
  'The home source failing, then Retry bringing the merge back',
  [
    utterance('home-retry', [
      firstPaint(),
      repaint(200, {merge: HOME_COLLAPSED, 'shop-a': HOME_FAILED}),
      fragment(400, 'shop-b'),
      fragment(700, 'shop-c'),
    ]),
    press('home-retry', retry('shop-a'), 2000, [
      repaint(10, {merge: {...HOME_COLLAPSED, retrying: ['shop-a']}}),
      fragment(600, 'shop-a'),
      repaint(620, {merge: {...HOME_COLLAPSED, working: {sources: ['shop-a']}}}),
      merge(2600, ['shop-b', 'shop-c']),
      repaint(2600, {merge: {merged: ['shop-a', 'shop-b', 'shop-c']}}),
    ]),
  ],
);

/** Fewer than two sources arriving: only Aperture & Co answers, and the merge collapses. */
export const TOO_FEW_BEAT = beat('too-few', 131, 'Fewer than two sources arriving', [
  utterance('too-few', [
    firstPaint(),
    repaint(150, {
      'shop-b': {state: 'failed', failure: {cause: 'unreachable'}},
    }),
    fragment(400, 'shop-a'),
    repaint(900, {
      merge: {
        state: 'collapsed',
        collapse: {cause: 'few', answered: [SHOP_A_NAME], failed: ['shop-b', 'shop-c']},
      },
      'shop-b': {state: 'failed', failure: {cause: 'unreachable'}},
      'shop-c': {state: 'failed', failure: {cause: 'vendor', message: FIELDSTONE_WORDS}},
    }),
  ]),
]);

/** Far enough that a paced replay never reaches it while a page is looked at. */
const HELD_MS = 10 * 60 * 1000;

/**
 * A case up to its press, for the visual spec and the tests: the beat ends where the tile, the
 * line and the button are offered, in a paced replay and an instant one alike.
 */
function offered(fixture: BeatFixture): BeatFixture {
  return {
    ...fixture,
    name: `${fixture.name}-offered`,
    beat: fixture.beat + 20,
    title: `${fixture.title}, up to the press`,
    turns: fixture.turns.filter(turn => turn.kind !== 'press'),
  };
}

/**
 * The home source straggling, resting while the merge waits for it: its arrival and the merge held
 * back, so a paced replay stops with the turn still open — as the reserved slot's merging board is
 * held (task 7.15).
 */
export const HOME_WAITING_BEAT: BeatFixture = {
  ...HOME_STRAGGLING_BEAT,
  name: 'synthetic-home-straggling-waiting',
  beat: 142,
  title: 'The home source straggling, the merge waiting',
  turns: HOME_STRAGGLING_BEAT.turns.map(turn => ({
    ...turn,
    batches: turn.batches.map(batch =>
      batch.offsetMs >= 4000 ? {...batch, offsetMs: HELD_MS} : batch,
    ),
  })),
};

/** Phase 8's synthetic beats, each played to its end. */
export const LATE_FAILURE_BEATS: readonly BeatFixture[] = [
  FAST_FAILURE_BEAT,
  LATE_INCLUDE_BEAT,
  HOME_STRAGGLING_BEAT,
  HELD_RETRY_BEAT,
  RETRY_RACE_BEAT,
  HALF_DRAWN_BEAT,
  INVALID_PAINT_BEAT,
  FAILED_FOLD_IN_BEAT,
  INCLUDE_AFTER_DECLINE_BEAT,
  TRY_AGAIN_BEAT,
  HOME_RETRY_BEAT,
  TOO_FEW_BEAT,
];

/** The same cases up to their presses, and the merge waiting for its home source. */
export const LATE_FAILURE_RESTING: readonly BeatFixture[] = [
  ...LATE_FAILURE_BEATS.filter(fixture => fixture.turns.some(t => t.kind === 'press')).map(offered),
  HOME_WAITING_BEAT,
];
