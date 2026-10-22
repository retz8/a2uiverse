/**
 * The store loop's synthetic beats (task-15.10 decision 6): what the orchestrator paints on its own,
 * hand-built in the recorded format, beside the beats recorded where the Planner writes.
 *
 * - The gap the Store could not be reached for: the second quiet line, "Couldn't reach the Store."
 * - The update tile on beat 31's canvas — Shop A answered, Shop B installed but unable to paint in
 *   what it is installed with — its gap the app's slot as the painter makes it, one beat per line:
 *   needs an update, and the Store waiting on its publisher. Update's Retry is answered by beat 31's
 *   recorded fill, the slot keeping its update until Shop B's answer lands; and the slot Shop B was
 *   uninstalled from, on its failure tile.
 * - CircleCI's update that asks for more, its Retry answered by the needs-more-access tile: the
 *   account held lacks the new permission.
 * - Per-paint builds: two questions about Shop A, the first painted in one build and the second in
 *   another, the builds named on the hub's stamp as the test names them — `per-paint-builds:<first
 *   artifact id>:<second artifact id>` — so a canvas stands open across the move.
 *
 * Replayed for the reader's hand (`&byhand`), each press the reader makes is answered by the beat's.
 */
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import {getBeatFixture, type BeatBatch, type BeatFixture, type BeatTurn} from './beatFixtures';
import {SHOP_A_CATALOG_ID} from './catalogIds';

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;

const base = {
  model: 'synthetic',
  recordedAt: '2026-10-22T00:00:00Z',
  contextId: 'ctx-synthetic-store-loop',
  chainedFrom: null,
};

type Component = Record<string, unknown> & {id: string; component: string};

/** One utterance turn of shell batches. */
const utterance = (taskId: string, prompt: string, batches: BeatBatch[]): BeatTurn => ({
  taskId,
  kind: 'utterance',
  prompt,
  action: null,
  outcome: 'completed',
  durationMs: 200,
  batches,
});

/** A Retry pressed on `source`, answered by `batches`. */
const retry = (taskId: string, source: string, batches: BeatBatch[]): BeatTurn => ({
  taskId,
  kind: 'press',
  prompt: '',
  action: null,
  operation: {kind: 'retry', sources: [source]},
  outcome: 'completed',
  durationMs: 200,
  batches,
});

const shellBatch = (offsetMs: number, components: Component[], create = false): BeatBatch => ({
  offsetMs,
  stamp: {source: 'shell', role: 'shell'},
  messages: [
    ...(create
      ? [msg({createSurface: {surfaceId: 'shell:main', catalogId: SHELL_CATALOG_ID}})]
      : []),
    msg({updateComponents: {surfaceId: 'shell:main', components}}),
  ],
  texts: [],
});

/** The gap the marketplace was not reached for: the painter stamps why there is no app. */
export const STORE_UNREACHED_BEAT: BeatFixture = {
  ...base,
  name: 'synthetic-gap-unreached',
  beat: 140,
  title: 'Capability gap, the Store unreached',
  prompt: 'book me a flight to Tokyo',
  turns: [
    utterance('synthetic-gap-unreached', 'book me a flight to Tokyo', [
      shellBatch(
        0,
        [
          {id: 'root', component: 'Column', children: ['flight']},
          {
            id: 'flight',
            component: 'Slot',
            gap: 'flight booking',
            offer: {apps: [], none: 'unreached'},
          },
        ],
        true,
      ),
    ]),
  ],
};

/** Shop B's account, as beat 31 connected it. */
const SHOP_B_SOURCE = 'shop-b.1';
const SHOP_B_GAP = 'Shop B';

/** What the update tile is drawn from (task-15.5 decision 8), as the painter writes it. */
type UpdateFacts = Record<string, unknown> & {state: string};

/** Shop B's forced update: its installed line retired, the Store holding the version that paints. */
export const SHOP_B_NEEDS_UPDATE: UpdateFacts = {
  state: 'update-required',
  installedVersion: '0.0.9',
  publishedVersion: '0.1.0',
  newScopes: [],
  publisher: 'a2uiverse-apps',
};

/** Shop B ahead of the Store: its live card changed, the Store waiting on its publisher. */
const SHOP_B_WAITING: UpdateFacts = {
  state: 'ahead-of-store',
  installedVersion: '0.0.9',
  publishedVersion: '0.1.0',
  publisher: 'a2uiverse-apps',
};

/**
 * Beat 31's shell components with its gap the app's slot, as the painter makes a filled gap: the
 * same id, holding Shop B's source, wrapped in its marker, `slot` laid over it.
 */
function asShopBSlot(components: readonly Component[], slot: Record<string, unknown>): Component[] {
  const gap = components.find(c => c.component === 'Slot' && c.gap === SHOP_B_GAP);
  if (!gap) return [...components];
  const wrapper = `attribution-${gap.id}`;
  const rewire = (value: unknown) => (value === gap.id ? wrapper : value);
  return components.flatMap((c): Component[] => {
    if (c === gap) {
      const {gap: _gap, offer: _offer, ...kept} = c;
      return [
        {
          id: wrapper,
          component: 'Attribution',
          displayName: 'Shop B',
          source: SHOP_B_SOURCE,
          child: gap.id,
          ...(typeof c.weight === 'number' ? {weight: c.weight} : {}),
        },
        {...kept, source: SHOP_B_SOURCE, label: 'Shop B', ...slot} as Component,
      ];
    }
    return [
      {
        ...c,
        ...(typeof c.child === 'string' ? {child: rewire(c.child)} : {}),
        ...(Array.isArray(c.children) ? {children: c.children.map(rewire)} : {}),
      },
    ];
  });
}

/** A batch with every shell layout in it changed by `change`. */
function withLayout(batch: BeatBatch, change: (components: Component[]) => Component[]) {
  return {
    ...batch,
    messages: batch.messages.map(message => {
      const update = (message as {updateComponents?: {surfaceId: string; components: Component[]}})
        .updateComponents;
      if (batch.stamp?.role !== 'shell' || update?.surfaceId !== 'shell:main') return message;
      return msg({
        updateComponents: {...update, components: change(update.components)},
      });
    }),
  };
}

/**
 * Beat 31's canvas with Shop B on the update tile, its line drawn from `update`; when Shop B can be
 * updated, the slot's Retry answered by beat 31's recorded fill, the slot keeping its update in the
 * repaint before Shop B's answer.
 */
function shopBUpdateBeat(name: string, beat: number, update: UpdateFacts): BeatFixture | undefined {
  const recorded = getBeatFixture(31);
  const first = recorded?.turns[0];
  const fill = recorded?.turns.find(t => t.operation?.kind === 'retry');
  if (!recorded || !first || !fill) return undefined;
  const turns: BeatTurn[] = [
    {
      ...first,
      taskId: name,
      batches: first.batches.map(b =>
        withLayout(b, components => asShopBSlot(components, {state: 'update', update})),
      ),
    },
  ];
  if (update.state !== 'ahead-of-store') {
    let kept = false;
    turns.push(
      retry(
        `${name}-retry`,
        SHOP_B_SOURCE,
        fill.batches.map(b => {
          // The first repaint before the answer keeps the update the line was drawn from.
          if (kept || b.stamp?.role !== 'shell') return b;
          kept = true;
          return withLayout(b, components =>
            components.map(c =>
              c.source === SHOP_B_SOURCE && c.component === 'Slot' ? {...c, update} : c,
            ),
          );
        }),
      ),
    );
  }
  return {...recorded, ...base, name, beat, title: name, turns};
}

/** Beat 31's canvas with Shop B uninstalled since: its slot on the failure tile, Retry kept. */
function shopBUninstalledBeat(): BeatFixture | undefined {
  const recorded = getBeatFixture(31);
  const first = recorded?.turns[0];
  if (!recorded || !first) return undefined;
  const name = 'synthetic-update-uninstalled';
  return {
    ...recorded,
    ...base,
    name,
    beat: 143,
    title: name,
    chainedFrom: null,
    turns: [
      {
        ...first,
        taskId: name,
        batches: first.batches.map(b =>
          withLayout(b, components =>
            asShopBSlot(components, {state: 'failed', failure: {cause: 'uninstalled'}}),
          ),
        ),
      },
    ],
  };
}

const CIRCLECI_SOURCE = 'circleci.1';
const BUILDS_QUESTION = 'How are my builds doing?';

/** CircleCI's slot alone under its marker, `slot` laid over it. */
const circleciLayout = (slot: Record<string, unknown>): Component[] => [
  {id: 'root', component: 'Column', children: ['attribution-circleci']},
  {
    id: 'attribution-circleci',
    component: 'Attribution',
    displayName: 'CircleCI',
    source: CIRCLECI_SOURCE,
    child: 'circleci',
  },
  {id: 'circleci', component: 'Slot', source: CIRCLECI_SOURCE, label: 'CircleCI', ...slot},
];

/**
 * CircleCI's card update that asks for more — to rerun and cancel workflows — on the update tile;
 * its Retry, once updated, answered by the needs-more-access tile: the account held lacks the new
 * permission, a second step (phase-15 decision 15).
 */
export const CIRCLECI_UPDATE_BEAT: BeatFixture = {
  ...base,
  name: 'synthetic-update-asks-more',
  beat: 142,
  title: 'An update that asks for more',
  prompt: BUILDS_QUESTION,
  turns: [
    utterance('synthetic-update-asks-more', BUILDS_QUESTION, [
      shellBatch(
        0,
        circleciLayout({
          state: 'update',
          update: {
            state: 'card-update',
            installedVersion: '0.0.9',
            publishedVersion: '0.1.0',
            newScopes: [{scheme: 'signIn', scopes: ['pipelines.write']}],
            publisher: 'a2uiverse-apps',
          },
        }),
        true,
      ),
    ]),
    retry('synthetic-update-asks-more-retry', CIRCLECI_SOURCE, [
      shellBatch(0, circleciLayout({state: 'pending'})),
      shellBatch(
        40,
        circleciLayout({
          state: 'authority',
          authority: {cause: 'more', scopes: ['Rerun and cancel your workflows']},
        }),
      ),
    ]),
  ],
};

const SHOP_A_SOURCE = 'shop-a';

/**
 * One question about Shop A's cameras, its fragment beat 31's recorded paint — whose Price and
 * Rating take the store's accent — drawn in `build`.
 */
function shopAQuestion(
  taskId: string,
  prompt: string,
  build: string,
  paint: readonly A2uiMessage[],
): BeatTurn {
  const layout: Component[] = [
    {id: 'root', component: 'Column', children: ['attribution-shop-a']},
    {
      id: 'attribution-shop-a',
      component: 'Attribution',
      displayName: 'Shop A',
      source: SHOP_A_SOURCE,
      child: 'shop-a',
    },
    {id: 'shop-a', component: 'Slot', source: SHOP_A_SOURCE, state: 'pending', label: 'Shop A'},
  ];
  return utterance(taskId, prompt, [
    shellBatch(0, layout, true),
    {
      offsetMs: 40,
      stamp: {source: SHOP_A_SOURCE, role: 'fragment', builds: {[SHOP_A_CATALOG_ID]: build}},
      messages: structuredClone([...paint]),
      texts: [],
    },
  ]);
}

/**
 * Per-paint builds (task-15.6; task-15.10 decision 11): Shop A painted in its first build, then —
 * a newer build installed meanwhile — a second question painting Shop A in that one, the first
 * canvas standing open across the move.
 */
function perPaintBuildsBeat(first: string, second: string): BeatFixture | undefined {
  const paint = getBeatFixture(31)
    ?.turns[0]?.batches.filter(
      b => b.stamp?.role === 'fragment' && b.stamp.source === SHOP_A_SOURCE,
    )
    .flatMap(b => b.messages);
  if (!paint?.length) return undefined;
  return {
    ...base,
    name: 'synthetic-per-paint-builds',
    beat: 144,
    title: 'Per-paint builds',
    prompt: 'What cameras does Shop A have?',
    turns: [
      shopAQuestion('synthetic-builds-first', 'What cameras does Shop A have?', first, paint),
      shopAQuestion('synthetic-builds-second', 'Show me Shop A’s cameras again.', second, paint),
    ],
  };
}

/** The store loop's synthetic beats by the name `?beat=` takes. */
export function storeLoopBeat(name: string): BeatFixture | undefined {
  switch (name) {
    case 'gap-unreached':
      return STORE_UNREACHED_BEAT;
    case 'update-needed':
      return shopBUpdateBeat('synthetic-update-needed', 141, SHOP_B_NEEDS_UPDATE);
    case 'update-waiting':
      return shopBUpdateBeat('synthetic-update-waiting', 145, SHOP_B_WAITING);
    case 'update-asks-more':
      return CIRCLECI_UPDATE_BEAT;
    case 'update-uninstalled':
      return shopBUninstalledBeat();
    default: {
      const builds = /^per-paint-builds:([\w-]+):([\w-]+)$/.exec(name);
      return builds ? perPaintBuildsBeat(builds[1]!, builds[2]!) : undefined;
    }
  }
}
