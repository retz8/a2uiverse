/**
 * The turn runner: hold-and-swap with the net-effect validation gate, the overlay slot for
 * question paints, last-intent-wins cancel, the composition's facts, and the streams beside the
 * turn — one runner per canvas (task 9.6).
 */
import {describe, it, expect, vi} from 'vitest';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import {CATALOG, CATALOG_ID} from 'github-catalog';
import {CATALOG_ID as SHELL_CATALOG_ID, createCatalog} from '@a2uiverse/shell-catalog';
import type {CompositionStamp} from '@a2uiverse/sdk';
import type {PaintCause} from './cause';
import {createCanvasStore} from '../canvasStore';
import type {FragmentFailure} from './canvasTurn';
import {createTurnRunner} from './canvasTurn';
import {createFragmentHistory} from '../history/fragmentHistory';
import {capturePaint} from '../history/paintCopy';

const SHELL_CATALOG = createCatalog({onShellAction: () => {}});

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;

/**
 * The hub's first paint of a turn, as the shell painter emits it (task-6.4 decision 3): the
 * layout surface with one slot per source, each vendor slot the `child` of the `Attribution`
 * that names it — the shape the roster pairs by, and the one guarantee a vendor fragment gets.
 */
const paintedLayout = (slots: Array<string | [appId: string, displayName: string]>) => {
  const leaves = slots.map(slot => (typeof slot === 'string' ? [slot, slot] : slot));
  return [
    msg({createSurface: {surfaceId: 'shell:main', catalogId: SHELL_CATALOG_ID}}),
    msg({
      updateComponents: {
        surfaceId: 'shell:main',
        components: [
          {id: 'root', component: 'Column', children: leaves.map(([id]) => `attribution-${id}`)},
          ...leaves.flatMap(([appId, displayName]) => [
            {
              id: `attribution-${appId}`,
              component: 'Attribution',
              appId,
              displayName,
              child: appId,
            },
            {id: appId, component: 'Slot', source: appId, state: 'pending', label: displayName},
          ]),
        ],
      },
    }),
  ];
};

const create = (surfaceId: string) => msg({createSurface: {surfaceId, catalogId: CATALOG_ID}});
const del = (surfaceId: string) => msg({deleteSurface: {surfaceId}});
const textRoot = (surfaceId: string, text: string) =>
  msg({updateComponents: {surfaceId, components: [{id: 'root', component: 'Text', text}]}});
const dataUpdate = (surfaceId: string, value: Record<string, unknown>) =>
  msg({updateDataModel: {surfaceId, value}});
const dialogRoot = (surfaceId: string, title: string) =>
  msg({
    updateComponents: {
      surfaceId,
      components: [
        {
          id: 'root',
          component: 'ConfirmationDialog',
          title,
          confirmAction: {event: {name: 'confirm', context: {}}},
          cancelAction: {event: {name: 'cancel', context: {}}},
        },
      ],
    },
  });

/**
 * A declared question, as a real agent streams one: the `kind="question"` marker plus the
 * ConfirmationDialog root. The agent validates that the two go together; the canvas routes on
 * the marker alone, so these tests declare it rather than relying on the shape.
 */
const questionPaint = (surfaceId: string, title: string) => [
  msg({paintMeta: {surfaceId, kind: 'question'}}),
  dialogRoot(surfaceId, title),
];

const utterance = (text: string): PaintCause => ({kind: 'utterance', payload: {text}});

/** A turn the user opened from inside a fragment, rather than by asking. */
const surfaceAction = (name: string): PaintCause => ({
  kind: 'surface-action',
  payload: {
    action: {
      name,
      context: {},
      surfaceId: 'github:pr-list',
      sourceComponentId: 'pr-row',
      timestamp: '2026-08-30T10:00:00Z',
    },
  },
});

function setup() {
  const processor = new MessageProcessor([CATALOG]);
  const store = createCanvasStore();
  const runner = createTurnRunner({
    processor,
    store,
    createStaging: () => new MessageProcessor([CATALOG]),
  });
  return {processor, store, runner};
}

/** Run one whole turn to completion — the setup step for tests about the *next* turn. */
function paintStage(runner: ReturnType<typeof setup>['runner'], id: string, text: string) {
  const turn = runner.begin(utterance(`paint ${id}`));
  turn.apply([create(id), textRoot(id, text)]);
  turn.end();
}

const rootText = (processor: ReturnType<typeof setup>['processor'], id: string): unknown =>
  processor.model.getSurface(id)?.componentsModel.get('root')?.properties.text;

describe('progressive mode (empty canvas)', () => {
  it('streams the paint straight onto the stage', () => {
    const {processor, store, runner} = setup();
    const turn = runner.begin(utterance('show my PRs'));
    expect(store.getState().inFlight?.label).toBe('“show my PRs” — generating…');

    turn.apply([create('pull-request-list')]);
    // Progressive: visible mid-turn, before the stream ends.
    expect(store.getState().stageId).toBe('pull-request-list');
    turn.apply([textRoot('pull-request-list', 'PRs')]);

    turn.end();
    const state = store.getState();
    expect(state.inFlight).toBeNull();
    expect(processor.model.getSurface('pull-request-list')).toBeTruthy();
  });

  it('net-effect failure: a created-then-cleaned-up paint leaves the canvas empty with an error', () => {
    const {processor, store, runner} = setup();
    const turn = runner.begin(utterance('show my PRs'));
    turn.apply([create('broken'), textRoot('broken', 'partial')]);
    turn.apply([del('broken')]);
    turn.end();

    const state = store.getState();
    expect(state.stageId).toBeNull();
    expect(state.error).toMatch(/withdrawn/);
    expect(processor.model.getSurface('broken')).toBeFalsy();
  });

  it('a dialog-rooted paint routes to the overlay, not the stage', () => {
    const {store, runner} = setup();
    const turn = runner.begin(utterance('delete everything'));
    turn.apply([create('confirm-wipe'), ...questionPaint('confirm-wipe', 'Really wipe it all?')]);
    turn.end();

    const state = store.getState();
    expect(state.stageId).toBeNull();
    expect(state.overlay).toEqual({surfaceId: 'confirm-wipe', question: 'Really wipe it all?'});
  });

  it('a canceled progressive paint is removed from the stage', () => {
    const {processor, store, runner} = setup();
    const turn = runner.begin(utterance('show my PRs'));
    turn.apply([create('partial'), textRoot('partial', 'half')]);
    expect(store.getState().stageId).toBe('partial');

    turn.cancel();
    const state = store.getState();
    expect(turn.canceled).toBe(true);
    expect(turn.signal.aborted).toBe(true);
    expect(state.stageId).toBeNull();
    expect(state.inFlight).toBeNull();
    expect(processor.model.getSurface('partial')).toBeFalsy();
  });
});

describe('staged mode (occupied stage): hold-and-swap', () => {
  it('holds the stage while the new paint streams off-stage, then swaps', () => {
    const {processor, store, runner} = setup();
    paintStage(runner, 'old-stage', 'old content');

    const turn = runner.begin(utterance('now the issues'));
    turn.apply([create('issue-list')]);
    // The hold: the outgoing surface stays, the new paint is not in the live registry yet.
    expect(store.getState().stageId).toBe('old-stage');
    expect(processor.model.getSurface('issue-list')).toBeFalsy();
    turn.apply([textRoot('issue-list', 'Issues')]);

    turn.end();
    const state = store.getState();
    expect(state.stageId).toBe('issue-list');
    expect(rootText(processor, 'issue-list')).toBe('Issues');
    expect(Array.from(processor.model.surfacesMap.keys())).toEqual(['issue-list']);
  });

  it('a same-id repaint holds the old content until the swap', () => {
    const {processor, store, runner} = setup();
    paintStage(runner, 'user-profile', 'v1');

    const turn = runner.begin(utterance('refresh it'));
    turn.apply([create('user-profile'), textRoot('user-profile', 'v2')]);
    // Staging shadows live: the visible surface still carries the old content.
    expect(rootText(processor, 'user-profile')).toBe('v1');

    turn.end();
    expect(rootText(processor, 'user-profile')).toBe('v2');
    const state = store.getState();
    expect(state.stageId).toBe('user-profile');
    expect(Array.from(processor.model.surfacesMap.keys())).toEqual(['user-profile']);
  });

  it('net-effect failure: the cleanup-deleted paint is discarded and the stage holds', () => {
    const {processor, store, runner} = setup();
    paintStage(runner, 'old-stage', 'still here');

    const turn = runner.begin(utterance('something invalid'));
    turn.apply([create('doomed'), textRoot('doomed', 'partial'), del('doomed')]);
    turn.end();

    const state = store.getState();
    expect(state.stageId).toBe('old-stage');
    expect(rootText(processor, 'old-stage')).toBe('still here');
    expect(state.error).toMatch(/keeping the current view/);
    expect(processor.model.getSurface('doomed')).toBeFalsy();
  });

  it('an update-only turn applies live and progressively, and is not a paint', () => {
    const {processor, store, runner} = setup();
    paintStage(runner, 'stage', 'before');

    const turn = runner.begin(utterance('tweak it'));
    turn.apply([textRoot('stage', 'after')]);
    // Live before the turn ends.
    expect(rootText(processor, 'stage')).toBe('after');
    turn.end();

    const state = store.getState();
    expect(state.error).toBeNull();
  });

  it('a data-model update to the live stage applies mid-turn', () => {
    const {processor, runner} = setup();
    const first = runner.begin(utterance('paint'));
    first.apply([
      create('stage'),
      msg({
        updateComponents: {
          surfaceId: 'stage',
          components: [{id: 'root', component: 'Text', text: {path: '/title'}}],
        },
      }),
      dataUpdate('stage', {title: 'one'}),
    ]);
    first.end();

    const turn = runner.begin(utterance('update'));
    turn.apply([dataUpdate('stage', {title: 'two'})]);
    expect(processor.model.getSurface('stage')?.dataModel.get('/')).toMatchObject({title: 'two'});
    turn.end();
  });

  it('a deliberate delete of the live stage is honored: the canvas is empty', () => {
    const {processor, store, runner} = setup();
    paintStage(runner, 'stage', 'goodbye');

    const turn = runner.begin(utterance('clear the canvas'));
    turn.apply([del('stage')]);
    turn.end();

    const state = store.getState();
    expect(state.stageId).toBeNull();
    expect(state.notices[0]?.text).toMatch(/cleared/);
    expect(state.error).toBeNull();
    expect(processor.model.getSurface('stage')).toBeFalsy();
  });

  it('when one turn creates several stage surfaces, the last takes the stage', () => {
    const {processor, store, runner} = setup();
    paintStage(runner, 'old-stage', 'old');

    const turn = runner.begin(utterance('two views'));
    turn.apply([
      create('first'),
      textRoot('first', 'one'),
      create('second'),
      textRoot('second', 'two'),
    ]);
    turn.end();

    const state = store.getState();
    expect(state.stageId).toBe('second');
    expect(Array.from(processor.model.surfacesMap.keys())).toEqual(['second']);
  });
});

describe('question paints and the overlay slot', () => {
  it('a dialog-rooted paint passes the gate into the overlay; the stage paint is untouched', () => {
    const {processor, store, runner} = setup();
    paintStage(runner, 'stage', 'held content');

    const turn = runner.begin(utterance('which repo?'));
    turn.apply([create('which-repo'), ...questionPaint('which-repo', 'Which repository?')]);
    // Gated: the question is not live mid-turn.
    expect(store.getState().overlay).toBeNull();
    turn.end();

    const state = store.getState();
    expect(state.overlay).toEqual({surfaceId: 'which-repo', question: 'Which repository?'});
    expect(state.stageId).toBe('stage');
    expect(Array.from(processor.model.surfacesMap.keys())).toEqual(['stage', 'which-repo']);
  });

  it('a new question replaces a pending one, which leaves no trace', () => {
    const {processor, store, runner} = setup();
    paintStage(runner, 'stage', 'held');

    const first = runner.begin(utterance('q1'));
    first.apply([create('question-1'), ...questionPaint('question-1', 'First?')]);
    first.end();

    const second = runner.begin(utterance('q2'));
    second.apply([create('question-2'), ...questionPaint('question-2', 'Second?')]);
    second.end();

    const state = store.getState();
    expect(state.overlay).toEqual({surfaceId: 'question-2', question: 'Second?'});
    expect(processor.model.getSurface('question-1')).toBeFalsy();
  });

  it('removeOverlay drops the question from canvas and registry with no trace', () => {
    const {processor, store, runner} = setup();
    paintStage(runner, 'stage', 'held');
    const turn = runner.begin(utterance('ask'));
    turn.apply([create('question'), ...questionPaint('question', 'Sure?')]);
    turn.end();

    runner.removeOverlay();
    const state = store.getState();
    expect(state.overlay).toBeNull();
    expect(processor.model.getSurface('question')).toBeFalsy();
    expect(Array.from(processor.model.surfacesMap.keys())).toEqual(['stage']);
  });

  it('a validated turn can deliver a stage paint and a question together', () => {
    const {store, runner} = setup();
    paintStage(runner, 'old-stage', 'old');

    const turn = runner.begin(utterance('both'));
    turn.apply([
      create('new-stage'),
      textRoot('new-stage', 'new'),
      create('question'),
      ...questionPaint('question', 'Also this?'),
    ]);
    turn.end();

    const state = store.getState();
    expect(state.stageId).toBe('new-stage');
    expect(state.overlay).toEqual({surfaceId: 'question', question: 'Also this?'});
  });
});

describe('cancel: last-intent-wins', () => {
  it('a canceled staged paint is discarded wholesale; the stage holds', () => {
    const {processor, store, runner} = setup();
    paintStage(runner, 'stage', 'held');

    const turn = runner.begin(utterance('slow one'));
    turn.apply([create('slow'), textRoot('slow', 'half')]);
    turn.cancel();

    const state = store.getState();
    expect(turn.signal.aborted).toBe(true);
    expect(state.stageId).toBe('stage');
    expect(state.inFlight).toBeNull();
    expect(processor.model.getSurface('slow')).toBeFalsy();

    // A canceled turn is inert: late batches and the stream-exhaustion end are no-ops.
    turn.apply([textRoot('slow', 'late')]);
    turn.end();
    expect(store.getState().stageId).toBe('stage');
  });

  it('beginning a new turn cancels the in-flight one and takes over the in-flight slot', () => {
    const {store, runner} = setup();
    paintStage(runner, 'stage', 'held');

    const first = runner.begin(utterance('first ask'));
    first.apply([create('a'), textRoot('a', 'A')]);
    const second = runner.begin(utterance('second ask'));

    expect(first.canceled).toBe(true);
    expect(first.signal.aborted).toBe(true);
    expect(runner.current).toBe(second);
    expect(store.getState().inFlight?.label).toBe('“second ask” — generating…');

    second.apply([create('b'), textRoot('b', 'B')]);
    second.end();
    const state = store.getState();
    expect(state.stageId).toBe('b');
  });
});

describe('paint meta', () => {
  it('an utterance keeps the user’s own words in the status line', () => {
    // The user asked the question, so their phrasing is the stable answer to "is this still
    // working". Under fan-out several agents paint, and letting each title overwrite the label
    // would leave whichever painted last — the same collision the prose channel had.
    const {store, runner} = setup();
    const turn = runner.begin(utterance('show my PRs'));
    expect(store.getState().inFlight?.label).toBe('“show my PRs” — generating…');
    turn.acceptPaintMeta({surfaceId: 'pull-request-list', title: 'Open PRs — a2ui'});
    expect(store.getState().inFlight?.label).toBe('“show my PRs” — generating…');

    turn.apply([create('pull-request-list'), textRoot('pull-request-list', 'PRs')]);
    turn.end();
  });

  it('an action inside a fragment shows that agent’s title', () => {
    // The user acted on one agent's surface and the action routes to its owner alone, so the
    // title is unambiguous — and more useful than echoing a button name back at them.
    const {store, runner} = setup();
    const turn = runner.begin(surfaceAction('open-pr'));
    turn.acceptPaintMeta({surfaceId: 'pull-request-list', title: 'PR #2449 — a2ui'});
    expect(store.getState().inFlight?.label).toBe('PR #2449 — a2ui — generating…');
    turn.apply([create('pull-request-list'), textRoot('pull-request-list', 'PRs')]);
    turn.end();
  });

  it('kind="question" routes a non-dialog paint to the overlay — the marker is the contract', () => {
    const {store, runner} = setup();
    const turn = runner.begin(utterance('which repo?'));
    turn.acceptPaintMeta({surfaceId: 'which-repo', title: 'Which repository?', kind: 'question'});
    turn.apply([create('which-repo'), textRoot('which-repo', 'a2ui or a2ui-github?')]);
    turn.end();

    const state = store.getState();
    expect(state.stageId).toBeNull();
    expect(state.overlay?.surfaceId).toBe('which-repo');
  });

  it('an undeclared dialog-rooted paint is an ordinary stage paint', () => {
    // The canvas used to infer a question from a `ConfirmationDialog` root — a vendor catalog's
    // component name embedded in shell logic, which silently did nothing for any other design
    // system. The declared marker is now the whole contract.
    const {store, runner} = setup();
    const turn = runner.begin(utterance('show the dialog demo'));
    turn.apply([create('undeclared'), dialogRoot('undeclared', 'Looks like a question')]);
    turn.end();

    const state = store.getState();
    expect(state.stageId).toBe('undeclared');
    expect(state.overlay).toBeNull();
  });

  it('an explicit non-question kind keeps a dialog-rooted paint on the stage', () => {
    const {store, runner} = setup();
    const turn = runner.begin(utterance('show the dialog demo'));
    turn.acceptPaintMeta({surfaceId: 'dlg', kind: 'view'});
    turn.apply([create('dlg'), dialogRoot('dlg', 'Not a question')]);
    turn.end();

    const state = store.getState();
    expect(state.stageId).toBe('dlg');
    expect(state.overlay).toBeNull();
  });

  it('staged mode routes a marker-declared question to the overlay while the stage holds', () => {
    const {store, runner} = setup();
    paintStage(runner, 'first', 'one');
    const turn = runner.begin(utterance('which repo?'));
    turn.acceptPaintMeta({surfaceId: 'q', kind: 'question'});
    turn.apply([create('q'), textRoot('q', 'a or b?')]);
    turn.end();

    const state = store.getState();
    expect(state.stageId).toBe('first'); // the held stage survives a question paint
    expect(state.overlay?.surfaceId).toBe('q');
  });

  it('paintMeta objects inline in an applied batch are consumed, not fed to the processor', () => {
    // Replay tolerance: recorded fixtures carry paintMeta alongside the A2UI messages.
    const {store, runner} = setup();
    const turn = runner.begin(utterance('replayed'));
    turn.apply([
      {paintMeta: {surfaceId: 's', title: 'Replayed title'}} as unknown as A2uiMessage,
      create('s'),
      textRoot('s', 'body'),
    ]);
    turn.end();

    const state = store.getState();
    expect(state.error).toBeNull();
    expect(state.stageId).toBe('s');
  });
});

describe('streamed partials: validation is judged on the settled state', () => {
  // The agent streams a component as it is generated, so a batch can carry a `Link` before its
  // `href` has arrived; the processor validates every batch and throws the partial one away.
  const partialLink = (surfaceId: string) =>
    msg({
      updateComponents: {
        surfaceId,
        components: [{id: 'root', component: 'Link', text: 'a2ui-project/'}],
      },
    });
  const completeLink = (surfaceId: string) =>
    msg({
      updateComponents: {
        surfaceId,
        components: [
          {id: 'root', component: 'Link', text: 'a2ui-project/a2ui', href: 'https://github.com'},
        ],
      },
    });

  it('a partial that completes by turn end reports nothing (progressive)', () => {
    const {store, runner, processor} = setup();
    const turn = runner.begin(utterance('stream'));
    turn.apply([create('s'), partialLink('s')]);
    turn.apply([completeLink('s')]);
    turn.end();
    expect(store.getState().error).toBeNull();
    expect(processor.model.getSurface('s')?.componentsModel.get('root')?.properties.href).toBe(
      'https://github.com',
    );
  });

  it('a partial that completes by turn end reports nothing (staged)', () => {
    const {store, runner} = setup();
    paintStage(runner, 'first', 'hello');
    const turn = runner.begin(utterance('stream'));
    turn.apply([create('s'), partialLink('s')]);
    turn.apply([completeLink('s')]);
    turn.end();
    expect(store.getState().error).toBeNull();
    expect(store.getState().stageId).toBe('s');
  });

  it('a partial still invalid at turn end is reported', () => {
    const {store, runner} = setup();
    const turn = runner.begin(utterance('stream'));
    turn.apply([create('s'), partialLink('s')]);
    turn.end();
    expect(store.getState().error).toMatch(/could not be displayed.*Link/);
  });

  it('a non-validation failure is reported immediately', () => {
    const {store, runner} = setup();
    const turn = runner.begin(utterance('stream'));
    turn.apply([textRoot('missing', 'no such surface')]);
    expect(store.getState().error).toMatch(/could not be displayed/);
  });
});

describe('composed turns (the hub stamps its events)', () => {
  const SHELL: CompositionStamp = {source: 'shell', role: 'shell'};
  const fragment = (source: string): CompositionStamp => ({source, role: 'fragment'});

  /** The hub's first paint: the layout surface, before any agent has answered. */
  const shellPaint = paintedLayout;

  function composedSetup() {
    const catalogs = [CATALOG, SHELL_CATALOG];
    const processor = new MessageProcessor(catalogs);
    const store = createCanvasStore();
    const runner = createTurnRunner({
      processor,
      store,
      createStaging: () => new MessageProcessor(catalogs),
    });
    return {processor, store, runner};
  }

  /** The same first paint, with the Registry's display names on the attributions. */
  const attributedShellPaint = paintedLayout;

  it('the shell paint establishes the roster the notice stack orders and names by', () => {
    const {store, runner} = composedSetup();
    const turn = runner.begin(utterance('what needs my attention this morning'));

    turn.apply(
      attributedShellPaint([
        ['github', 'GitHub'],
        ['gmail', 'Gmail'],
      ]),
      SHELL,
    );

    // Known before any agent answers — which is what lets a source that never paints still be
    // named, and what fixes the stack's order for the turn.
    expect(store.getState().roster).toEqual([
      {appId: 'github', displayName: 'GitHub'},
      {appId: 'gmail', displayName: 'Gmail'},
    ]);
  });

  it("a fragment's paint leaves the roster alone", () => {
    const {store, runner} = composedSetup();
    const turn = runner.begin(utterance('what needs my attention this morning'));
    turn.apply(attributedShellPaint([['github', 'GitHub']]), SHELL);
    turn.apply(
      [create('github:pr-list'), textRoot('github:pr-list', 'Pull requests')],
      fragment('github'),
    );
    expect(store.getState().roster).toEqual([{appId: 'github', displayName: 'GitHub'}]);
  });

  it("a new turn clears the previous turn's answers", () => {
    const {store, runner} = composedSetup();
    const first = runner.begin(utterance('what needs my attention'));
    store.appendProse('github', 'four PRs');
    first.end();
    expect(store.getState().notices).toHaveLength(1);

    runner.begin(utterance('and now something else'));
    expect(store.getState().notices).toEqual([]);
  });

  it('the shell takes the stage and fragments fill slots without contending for it', () => {
    const {processor, store, runner} = composedSetup();
    const turn = runner.begin(utterance('what needs my attention'));

    turn.apply(shellPaint(['github']), SHELL);
    // First paint lands before any agent answers — the whole point of a composition.
    expect(store.getState().stageId).toBe('shell:main');

    turn.apply([create('github:prs'), textRoot('github:prs', 'Pull requests')], fragment('github'));
    turn.end();

    expect(store.getState().stageId).toBe('shell:main');
    expect(store.getState().placement.get('github')).toEqual({
      surfaceId: 'github:prs',
      source: 'github',
    });
    // The fragment lives in the registry to be mounted, but is not a paint of its own.
    expect(processor.model.getSurface('github:prs')).toBeDefined();
  });

  it('a composition abandons hold-and-swap so its slots can fill in place', () => {
    const {store, runner} = composedSetup();
    paintStage(runner, 'old', 'previous paint');
    expect(store.getState().stageId).toBe('old');

    const turn = runner.begin(utterance('compose'));
    turn.apply(shellPaint(['github']), SHELL);
    // Staged mode would have held 'old' until turn end; a composition swaps on arrival.
    expect(store.getState().stageId).toBe('shell:main');
    turn.end();
  });

  it('the outgoing composition leaves with its fragments — nothing stale reaches a vendor', () => {
    const {processor, store, runner} = composedSetup();
    const first = runner.begin(utterance('compose'));
    first.apply(shellPaint(['github']), SHELL);
    first.apply([create('github:prs'), textRoot('github:prs', 'one')], fragment('github'));
    first.end();

    const second = runner.begin(utterance('compose again'));
    second.apply(shellPaint(['github']), SHELL);
    expect(processor.model.getSurface('github:prs')).toBeUndefined();
    expect(store.getState().placement.size).toBe(0);
    second.end();
  });

  it('one surface per slot: a later claim retires the earlier tenant', () => {
    const {processor, store, runner} = composedSetup();
    const turn = runner.begin(utterance('compose'));
    turn.apply(shellPaint(['github']), SHELL);
    turn.apply([create('github:a'), textRoot('github:a', 'a')], fragment('github'));
    turn.apply([create('github:b'), textRoot('github:b', 'b')], fragment('github'));
    turn.end();

    expect(store.getState().placement.get('github')?.surfaceId).toBe('github:b');
    expect(processor.model.getSurface('github:a')).toBeUndefined();
  });

  it('a bare shell repaint flips a slot without tearing the canvas down, the failed fragment taken off it', () => {
    const {processor, store, runner} = composedSetup();
    const turn = runner.begin(utterance('compose'));
    turn.apply(shellPaint(['github']), SHELL);
    turn.apply([create('github:prs'), textRoot('github:prs', 'one')], fragment('github'));
    turn.end();

    // The hub flips a slot by repainting its own surface — an update, not a new composition.
    const flip = runner.begin(utterance('act'));
    flip.apply(
      [
        msg({
          updateComponents: {
            surfaceId: 'shell:main',
            components: [{id: 'github', component: 'Slot', source: 'github', state: 'failed'}],
          },
        }),
      ],
      SHELL,
    );
    flip.end();

    expect(store.getState().stageId).toBe('shell:main');
    // A failed source's data shows nowhere on the canvas (task-8.5 decision 3).
    expect(store.getState().placement.has('github')).toBe(false);
    expect(processor.model.getSurface('github:prs')).toBeUndefined();
    expect(processor.model.getSurface('shell:main')).toBeDefined();
  });

  it('an unstamped stream is a stage paint — pre-composition fixtures are unchanged', () => {
    const {store, runner} = composedSetup();
    const turn = runner.begin(utterance('plain'));
    turn.apply([create('plain-view'), textRoot('plain-view', 'hello')]);
    turn.end();

    expect(store.getState().stageId).toBe('plain-view');
    expect(store.getState().placement.size).toBe(0);
  });
});

describe('fragment failure reporting', () => {
  const SHELL: CompositionStamp = {source: 'shell', role: 'shell'};
  const fragment = (source: string): CompositionStamp => ({source, role: 'fragment'});

  const shellPaint = paintedLayout;

  function failureSetup() {
    const catalogs = [CATALOG, SHELL_CATALOG];
    const processor = new MessageProcessor(catalogs);
    const store = createCanvasStore();
    const failures: FragmentFailure[] = [];
    const runner = createTurnRunner({
      processor,
      store,
      createStaging: () => new MessageProcessor(catalogs),
      onFragmentFailure: failure => failures.push(failure),
    });
    return {processor, store, runner, failures};
  }

  it('reports a fragment whose catalog is not installed, without waiting for turn end', () => {
    const {failures, runner} = failureSetup();
    const turn = runner.begin(utterance('compose'));
    turn.apply(shellPaint(['gmail']), SHELL);
    turn.apply(
      [msg({createSurface: {surfaceId: 'gmail:inbox', catalogId: 'urn:not-installed'}})],
      fragment('gmail'),
    );

    // Structural: it can never mount, so waiting for turn end would tell us nothing new.
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({surfaceId: 'gmail:inbox', source: 'gmail'});
    turn.end();
    // One report per fragment, never a second at settle.
    expect(failures).toHaveLength(1);
  });

  it('reports a fragment left invalid at turn end, and nothing for one that settles', () => {
    const {failures, runner} = failureSetup();
    const turn = runner.begin(utterance('compose'));
    turn.apply(shellPaint(['github']), SHELL);
    // A half-built component: the batch is thrown away, leaving the fragment rootless.
    turn.apply(
      [
        create('github:prs'),
        msg({
          updateComponents: {
            surfaceId: 'github:prs',
            components: [{id: 'root', component: 'Link', text: 'no href yet'}],
          },
        }),
      ],
      fragment('github'),
    );
    expect(failures).toHaveLength(0);
    turn.end();

    expect(failures).toHaveLength(1);
    expect(failures[0].message).toMatch(/no root component/);
  });

  it('a fragment that streams a partial and then settles reports nothing', () => {
    const {failures, runner} = failureSetup();
    const turn = runner.begin(utterance('compose'));
    turn.apply(shellPaint(['github']), SHELL);
    turn.apply([create('github:prs')], fragment('github'));
    turn.apply(
      [
        msg({
          updateComponents: {
            surfaceId: 'github:prs',
            components: [{id: 'root', component: 'Link', text: 'partial'}],
          },
        }),
      ],
      fragment('github'),
    );
    turn.apply([textRoot('github:prs', 'Pull requests')], fragment('github'));
    turn.end();

    expect(failures).toEqual([]);
  });

  it('a source is judged at its own stream’s end, before the turn ends; the strip stays clear (task-8.7 decisions 25, 26)', () => {
    const {failures, runner, store} = failureSetup();
    const turn = runner.begin(utterance('compose'));
    turn.apply(shellPaint(['github', 'gmail']), SHELL);
    turn.apply(
      [
        create('github:prs'),
        msg({
          updateComponents: {
            surfaceId: 'github:prs',
            components: [{id: 'root', component: 'Link', text: 'no href yet'}],
          },
        }),
      ],
      fragment('github'),
    );
    turn.apply([create('gmail:inbox'), textRoot('gmail:inbox', 'Inbox')], fragment('gmail'));
    expect(failures).toHaveLength(0);
    // GitHub's stream ends: its fragment is judged now, Gmail's not yet.
    turn.apply([], {source: 'github', role: 'fragment', settled: true});
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({surfaceId: 'github:prs', source: 'github'});
    turn.apply([], {source: 'gmail', role: 'fragment', settled: true});
    turn.end();
    expect(failures).toHaveLength(1);
    // The failure is the tile's to say: the strip carries no line for it.
    expect(store.getState().error).toBeFalsy();
  });

  it('a fragment displaced by a later claim on its slot is superseded, not failed', () => {
    const {failures, runner} = failureSetup();
    const turn = runner.begin(utterance('compose'));
    turn.apply(shellPaint(['github']), SHELL);
    turn.apply([create('github:a')], fragment('github'));
    turn.apply([create('github:b'), textRoot('github:b', 'b')], fragment('github'));
    turn.end();

    expect(failures.map(f => f.surfaceId)).toEqual([]);
  });

  it('a broken shell is the platform failing, not a vendor — nothing is reported outward', () => {
    const {store, failures, runner} = failureSetup();
    const turn = runner.begin(utterance('compose'));
    turn.apply(
      [msg({createSurface: {surfaceId: 'shell:main', catalogId: 'urn:not-installed'}})],
      SHELL,
    );
    turn.end();

    expect(failures).toEqual([]);
    // It still surfaces — on the local channel, where a platform bug belongs.
    expect(store.getState().error).toMatch(/failed/);
  });

  /** A layout whose vendor slot the shell drew bare — a painter bug, not a shape it emits. */
  const unattributedLayout = (source: string) => [
    msg({createSurface: {surfaceId: 'shell:main', catalogId: SHELL_CATALOG_ID}}),
    msg({
      updateComponents: {
        surfaceId: 'shell:main',
        components: [
          {id: 'root', component: 'Column', children: [source]},
          {id: source, component: 'Slot', source, state: 'pending'},
        ],
      },
    }),
  ];

  it('a fragment aimed at a slot the shell drew with no attribution is refused: never placed, reported at arrival (task-6.5 decision 7)', () => {
    const {processor, store, failures, runner} = failureSetup();
    const turn = runner.begin(utterance('compose'));
    turn.apply(unattributedLayout('gmail'), SHELL);
    turn.apply([create('gmail:inbox'), textRoot('gmail:inbox', 'Inbox')], fragment('gmail'));

    // Refused the moment it arrived, before the turn ends: the fragment never enters the
    // registry, never claims its slot, and the hub is told so it can fail the slot.
    expect(processor.model.getSurface('gmail:inbox')).toBeUndefined();
    expect(store.getState().placement.has('gmail')).toBe(false);
    expect(failures).toEqual([
      {
        surfaceId: 'gmail:inbox',
        source: 'gmail',
        path: '/',
        message: 'the shell drew this slot with no attribution',
        refused: true,
      },
    ]);

    // Later batches for the same source go the same way, and nothing is reported twice.
    turn.apply([textRoot('gmail:inbox', 'Inbox, again')], fragment('gmail'));
    turn.end();
    expect(failures).toHaveLength(1);
    expect(store.getState().error).toBeNull();
  });

  it('a partial repaint carrying a bare slot refuses nothing: the wrapper still stands', () => {
    const {store, failures, runner} = failureSetup();
    const turn = runner.begin(utterance('compose'));
    turn.apply(paintedLayout(['gmail']), SHELL);
    turn.apply(
      [
        msg({
          updateComponents: {
            surfaceId: 'shell:main',
            components: [{id: 'gmail', component: 'Slot', source: 'gmail', state: 'pending'}],
          },
        }),
      ],
      SHELL,
    );
    turn.apply([create('gmail:inbox'), textRoot('gmail:inbox', 'Inbox')], fragment('gmail'));
    turn.end();

    expect(store.getState().placement.get('gmail')?.surfaceId).toBe('gmail:inbox');
    expect(failures).toEqual([]);
  });
});

describe('shell-granted promotion', () => {
  const SHELL: CompositionStamp = {source: 'shell', role: 'shell'};
  const fragment = (source: string): CompositionStamp => ({source, role: 'fragment'});
  const shellPaint = paintedLayout;

  function promotionSetup() {
    const catalogs = [CATALOG, SHELL_CATALOG];
    const processor = new MessageProcessor(catalogs);
    const store = createCanvasStore();
    const runner = createTurnRunner({
      processor,
      store,
      createStaging: () => new MessageProcessor(catalogs),
    });
    return {processor, store, runner};
  }

  it('a question fragment is promoted in place, never lifted into the overlay', () => {
    const {store, runner} = promotionSetup();
    const turn = runner.begin(utterance('compose'));
    turn.apply(shellPaint(['github']), SHELL);
    turn.apply(
      [create('github:ask'), ...questionPaint('github:ask', 'Which repository?')],
      fragment('github'),
    );
    turn.end();

    expect([...store.getState().promoted]).toEqual(['github']);
    // The invariant: it stays where the shell put it.
    expect(store.getState().overlay).toBeNull();
    expect(store.getState().stageId).toBe('shell:main');
    expect(store.getState().placement.get('github')?.surfaceId).toBe('github:ask');
  });

  it('several fragments can ask at once — promotion is plural, not a modal', () => {
    const {store, runner} = promotionSetup();
    const turn = runner.begin(utterance('compose'));
    turn.apply(shellPaint(['github', 'gmail']), SHELL);
    turn.apply(
      [create('github:ask'), ...questionPaint('github:ask', 'Which repository?')],
      fragment('github'),
    );
    turn.apply(
      [create('gmail:ask'), ...questionPaint('gmail:ask', 'Which account?')],
      fragment('gmail'),
    );
    turn.end();

    expect([...store.getState().promoted].sort()).toEqual(['github', 'gmail']);
    expect(store.getState().overlay).toBeNull();
  });

  it('an ordinary fragment is not promoted', () => {
    const {store, runner} = promotionSetup();
    const turn = runner.begin(utterance('compose'));
    turn.apply(shellPaint(['github']), SHELL);
    turn.apply([create('github:prs'), textRoot('github:prs', 'PRs')], fragment('github'));
    turn.end();
    expect(store.getState().promoted.size).toBe(0);
  });

  it('promotion clears when the composition is torn down', () => {
    const {store, runner} = promotionSetup();
    const first = runner.begin(utterance('compose'));
    first.apply(shellPaint(['github']), SHELL);
    first.apply(
      [create('github:ask'), ...questionPaint('github:ask', 'Which repository?')],
      fragment('github'),
    );
    first.end();
    expect(store.getState().promoted.size).toBe(1);

    const second = runner.begin(utterance('compose again'));
    second.apply(shellPaint(['github']), SHELL);
    second.end();
    expect(store.getState().promoted.size).toBe(0);
  });

  it('a shell-painted question still takes the overlay', () => {
    const {store, runner} = promotionSetup();
    const turn = runner.begin(utterance('ask'));
    turn.apply([create('which-repo'), ...questionPaint('which-repo', 'Which repository?')], SHELL);
    turn.end();

    expect(store.getState().overlay?.surfaceId).toBe('which-repo');
    expect(store.getState().promoted.size).toBe(0);
  });
});

describe('the question (task 7.14)', () => {
  it('an utterance sets the question; an action inside the canvas leaves it standing', () => {
    const {store, runner} = setup();
    const first = runner.begin(utterance('show my PRs'));
    expect(store.getState().question?.text).toBe('show my PRs');
    expect(store.getState().inFlight?.cause).toBe('utterance');
    first.end();

    const action = runner.begin(surfaceAction('approve'));
    expect(store.getState().question?.text).toBe('show my PRs');
    expect(store.getState().inFlight?.cause).toBe('surface-action');
    action.end();

    runner.begin(utterance('now the issues'));
    expect(store.getState().question?.text).toBe('now the issues');
  });

  it('a shell paint records the slot states it carries, kept across an action, gone with the composition', () => {
    const {store, runner} = setup();
    const turn = runner.begin(utterance('status'));
    turn.apply(
      [
        msg({
          updateComponents: {
            surfaceId: 'shell:main',
            components: [{id: 'linear', component: 'Slot', source: 'linear', state: 'failed'}],
          },
        }),
      ],
      {source: 'shell', role: 'shell'},
    );
    expect(store.getState().slotStates.get('linear')).toBe('failed');
    turn.end();
    runner.begin(surfaceAction('open')).end();
    expect(store.getState().slotStates.get('linear')).toBe('failed');
    const next = runner.begin(utterance('again'));
    next.apply(
      [
        msg({createSurface: {surfaceId: 'shell:main', catalogId: 'x'}}),
        msg({
          updateComponents: {
            surfaceId: 'shell:main',
            components: [{id: 'github', component: 'Slot', source: 'github'}],
          },
        }),
      ],
      {source: 'shell', role: 'shell'},
    );
    expect(store.getState().slotStates.has('linear')).toBe(false);
  });
});

describe('streams beside the turn (task 8.5)', () => {
  const SHELL: CompositionStamp = {source: 'shell', role: 'shell'};
  const fragment = (source: string): CompositionStamp => ({source, role: 'fragment'});
  const slotRepaint = (props: Record<string, unknown>[]) =>
    msg({
      updateComponents: {
        surfaceId: 'shell:main',
        components: props.map(p => ({id: p.source, component: 'Slot', ...p})),
      },
    });

  /** A composition over GitHub and Gmail, the turn over, Gmail's fragment on the canvas. */
  function composed(failures: FragmentFailure[] = []) {
    const catalogs = [CATALOG, SHELL_CATALOG];
    const processor = new MessageProcessor(catalogs);
    const store = createCanvasStore();
    const synthesis = {accept: vi.fn(), retire: vi.fn()};
    const runner = createTurnRunner({
      processor,
      store,
      createStaging: () => new MessageProcessor(catalogs),
      onFragmentFailure: failure => failures.push(failure),
      synthesis: synthesis as never,
    });
    const turn = runner.begin(utterance('compose'));
    turn.apply(paintedLayout(['github', 'gmail']), SHELL);
    turn.apply([create('gmail:inbox'), textRoot('gmail:inbox', 'inbox')], fragment('gmail'));
    turn.end();
    return {processor, store, runner, synthesis};
  }

  it('a slot painted failed takes its source’s fragment off the canvas, on any stream', () => {
    const {processor, store, runner} = composed();
    const stream = runner.beginSideStream();
    stream.apply([slotRepaint([{source: 'gmail', state: 'failed', label: 'Gmail'}])], SHELL);
    expect(store.getState().slotStates.get('gmail')).toBe('failed');
    expect(store.getState().placement.has('gmail')).toBe(false);
    expect(processor.model.getSurface('gmail:inbox')).toBeUndefined();
    // A late message for the fragment taken off is dropped, not failed against a missing surface.
    stream.apply([textRoot('gmail:inbox', 'late')], fragment('gmail'));
    expect(store.getState().error).toBeNull();
  });

  it('a Retry’s answer fills its slot in the live composition, touching nothing of the turn', () => {
    const {processor, store, runner} = composed();
    runner.beginSideStream().apply([slotRepaint([{source: 'gmail', state: 'failed'}])], SHELL);
    const {stageId} = store.getState();
    const retry = runner.beginSideStream();
    retry.apply([slotRepaint([{source: 'gmail', state: 'pending'}])], SHELL);
    retry.apply([create('gmail:inbox'), textRoot('gmail:inbox', 'again')], fragment('gmail'));
    retry.end();
    const state = store.getState();
    expect(state.placement.get('gmail')).toEqual({surfaceId: 'gmail:inbox', source: 'gmail'});
    expect(processor.model.getSurface('gmail:inbox')).toBeDefined();
    expect(state.stageId).toBe(stageId);
    expect(state.inFlight).toBeNull();
  });

  it('the merged view’s painted facts are read, and a synthesis payload handed over', () => {
    const {store, runner, synthesis} = composed();
    const stream = runner.beginSideStream();
    stream.apply(
      [slotRepaint([{source: 'shell', content: 'shell', merged: ['github'], late: ['gmail']}])],
      SHELL,
    );
    expect(store.getState().merge).toEqual({merged: ['github'], late: ['gmail']});
    const payload = {dataModel: {}, sorts: []};
    stream.apply(
      [
        msg({createSurface: {surfaceId: 'shell:synthesis', catalogId: SHELL_CATALOG_ID}}),
        msg({
          updateComponents: {
            surfaceId: 'shell:synthesis',
            components: [{id: 'root', component: 'Text', text: 'merged'}],
          },
        }),
      ],
      fragment('shell'),
      payload as never,
    );
    expect(store.getState().placement.get('shell')?.surfaceId).toBe('shell:synthesis');
    expect(synthesis.accept).toHaveBeenCalledWith(
      {surfaceId: 'shell:synthesis', source: 'shell'},
      payload,
    );
  });

  it('the close ends the turn in flight and every stream beside it; what still arrives is dropped (task-9.6 decision 8)', () => {
    const {store, runner} = composed();
    const stream = runner.beginSideStream();
    const turn = runner.begin(surfaceAction('open'));
    runner.cancelAll();
    expect(turn.canceled).toBe(true);
    expect(stream.signal.aborted).toBe(true);
    expect(store.getState().inFlight).toBeNull();
    stream.apply([slotRepaint([{source: 'gmail', state: 'failed'}])], SHELL);
    expect(store.getState().slotStates.get('gmail')).toBe('pending');
    expect(store.getState().placement.has('gmail')).toBe(true);
  });

  it('an action inside the composition leaves its streams running', () => {
    const {runner} = composed();
    const stream = runner.beginSideStream();
    runner.begin(surfaceAction('open')).end();
    expect(stream.signal.aborted).toBe(false);
  });

  it('a fragment’s paint title is kept per source, from the meta that led it, on any stream (task-9.3 decision 6)', () => {
    const {store, runner} = composed();
    expect(store.getState().paintTitles.get('gmail')).toBeUndefined();
    const retry = runner.beginSideStream();
    retry.acceptPaintMeta({surfaceId: 'gmail:inbox', title: 'Unread — needs reply'});
    retry.apply([create('gmail:inbox'), textRoot('gmail:inbox', 'again')], fragment('gmail'));
    retry.end();
    expect(store.getState().paintTitles.get('gmail')).toBe('Unread — needs reply');
    // A later paint that names nothing drops the title with the paint it named.
    const drill = runner.begin(surfaceAction('open'));
    drill.apply([create('gmail:thread'), textRoot('gmail:thread', 'thread')], fragment('gmail'));
    drill.end();
    expect(store.getState().paintTitles.has('gmail')).toBe(false);
  });

  it('a retried fragment that will not render is reported once, at the stream’s end', () => {
    const failures: FragmentFailure[] = [];
    const {runner} = composed(failures);
    const stream = runner.beginSideStream();
    stream.apply([create('github:prs')], fragment('github'));
    stream.end();
    expect(failures).toEqual([
      expect.objectContaining({surfaceId: 'github:prs', source: 'github', path: '/'}),
    ]);
    stream.end();
    expect(failures).toHaveLength(1);
  });
});

describe("the fragment's history (task 9.7)", () => {
  const SHELL: CompositionStamp = {source: 'shell', role: 'shell'};
  const fragment = (source: string): CompositionStamp => ({source, role: 'fragment'});
  const titled = (surfaceId: string, title: string) => msg({paintMeta: {surfaceId, title}});
  const slotRepaint = (props: Record<string, unknown>[]) =>
    msg({
      updateComponents: {
        surfaceId: 'shell:main',
        components: props.map(p => ({id: p.source, component: 'Slot', ...p})),
      },
    });

  /** A composition over GitHub and Gmail with GitHub's list on the canvas, titled and updated. */
  function historied(accepted = true) {
    const catalogs = [CATALOG, SHELL_CATALOG];
    const processor = new MessageProcessor(catalogs);
    const store = createCanvasStore();
    const history = createFragmentHistory({
      capture: source => {
        const placed = store.getState().placement.get(source);
        return placed ? capturePaint(processor, placed.surfaceId) : undefined;
      },
    });
    const synthesis = {
      accept: vi.fn(() => accepted),
      retire: vi.fn(),
      hold: vi.fn(),
      release: vi.fn(),
    };
    const runner = createTurnRunner({
      processor,
      store,
      createStaging: () => new MessageProcessor(catalogs),
      synthesis: synthesis as never,
      history,
    });
    const turn = runner.begin(utterance('what needs my attention'));
    turn.apply(paintedLayout(['github', 'gmail']), SHELL);
    turn.apply(
      [
        titled('github:pr-list', 'Pull requests'),
        create('github:pr-list'),
        textRoot('github:pr-list', 'four PRs'),
      ],
      fragment('github'),
    );
    turn.apply([dataUpdate('github:pr-list', {count: 5})], fragment('github'));
    turn.end();
    return {processor, store, runner, history, synthesis};
  }

  /** An action inside GitHub's fragment, answered with a repaint of `surfaceId`, titled. */
  function repaint(
    runner: ReturnType<typeof historied>['runner'],
    surfaceId: string,
    title: string,
    text: string,
  ) {
    const action = runner.begin(surfaceAction('open'));
    action.apply(
      [titled(surfaceId, title), create(surfaceId), textRoot(surfaceId, text)],
      fragment('github'),
    );
    action.end();
  }

  it('a drill-down swaps into its slot when its source settles, not when the turn ends; the merged view held until then (task-9.9 decision 23)', () => {
    const {processor, store, runner, synthesis} = historied();
    // A merged view stands over the fragments.
    store.placeFragment('shell', {surfaceId: 'shell:synthesis', source: 'shell'});
    const action = runner.begin(surfaceAction('open'));
    action.apply(
      [
        titled('github:pr-detail', 'PR #42'),
        create('github:pr-detail'),
        textRoot('github:pr-detail', 'the detail'),
      ],
      fragment('github'),
    );
    // Staged: the list still fills the slot.
    expect(store.getState().placement.get('github')?.surfaceId).toBe('github:pr-list');
    action.apply([], {source: 'github', role: 'fragment', settled: true});
    // GitHub's stream ended: its paint is in its slot, the turn still open for the re-synthesis.
    expect(store.getState().placement.get('github')?.surfaceId).toBe('github:pr-detail');
    expect(rootText(processor, 'github:pr-detail')).toBe('the detail');
    expect(synthesis.hold).toHaveBeenCalledTimes(1);
    expect(store.getState().mergeHeld).toBe(true);
    expect(synthesis.release).not.toHaveBeenCalled();
    action.end();
    expect(synthesis.release).toHaveBeenCalledTimes(1);
    expect(store.getState().mergeHeld).toBe(false);
    expect(store.getState().error).toBeNull();
  });

  it('a source that settles having cleaned up what it created swaps nothing in: the paint on screen stands', () => {
    const {store, runner, synthesis} = historied();
    const action = runner.begin(surfaceAction('open'));
    action.apply([create('github:pr-detail'), del('github:pr-detail')], fragment('github'));
    action.apply([], {source: 'github', role: 'fragment', settled: true});
    expect(store.getState().placement.get('github')?.surfaceId).toBe('github:pr-list');
    expect(synthesis.hold).not.toHaveBeenCalled();
    action.end();
  });

  it('every vendor create counts at the wire — a refused batch and a discarded staged paint included — the shell’s never (decision 2)', () => {
    const {runner, history} = historied();
    expect(history.stackOf('github')).toEqual({length: 1, at: 0});
    expect(history.stackOf('shell')).toBeUndefined();
    // The shell draws Gmail's slot bare: its paint is refused at arrival, and still counted.
    const bare = runner.beginSideStream();
    bare.apply(
      [
        msg({
          updateComponents: {
            surfaceId: 'shell:main',
            components: [
              {id: 'root', component: 'Column', children: ['attribution-github', 'gmail']},
              {id: 'gmail', component: 'Slot', source: 'gmail', state: 'pending'},
            ],
          },
        }),
      ],
      SHELL,
    );
    bare.apply([create('gmail:inbox'), textRoot('gmail:inbox', 'inbox')], fragment('gmail'));
    bare.end();
    expect(history.stackOf('gmail')).toEqual({length: 1, at: 0});
    expect(history.neighbours('gmail')).toEqual({});
    // A staged repaint the vendor cleaned up again: discarded at the swap, still a step.
    const action = runner.begin(surfaceAction('open'));
    action.apply([create('github:pr-detail'), del('github:pr-detail')], fragment('github'));
    action.end();
    expect(history.stackOf('github')).toEqual({length: 2, at: 1});
    // The list is still what is on screen, with nowhere to go: the placeholder is skipped.
    expect(history.neighbours('github')).toEqual({});
  });

  it('a same-id repaint captures the paint as last seen before the swap destroys it — the vendor’s later update included (decision 1)', () => {
    const {processor, runner, history} = historied();
    repaint(runner, 'github:pr-list', 'PR #42', 'the detail');
    expect(rootText(processor, 'github:pr-list')).toBe('the detail');
    expect(history.neighbours('github')).toEqual({back: {step: 0, title: 'Pull requests'}});
    const step = history.stepTo('github', 0)!;
    expect(step.title).toBe('Pull requests');
    expect(step.paint.surfaceId).toBe('github:pr-list');
    expect(step.paint.catalogId).toBe(CATALOG_ID);
    expect((step.paint.tree.root as {text: string}).text).toBe('four PRs');
    expect(step.paint.dataModel).toEqual({count: 5});
  });

  it('a repaint under a new id captures the displaced paint the same way; a Retry’s answer beside the turn too', () => {
    const {runner, history} = historied();
    repaint(runner, 'github:pr-detail', 'PR #42', 'the detail');
    expect(history.neighbours('github')).toEqual({back: {step: 0, title: 'Pull requests'}});
    const retry = runner.beginSideStream();
    retry.apply(
      [
        titled('github:pr-list', 'Pull requests, again'),
        create('github:pr-list'),
        textRoot('github:pr-list', 'list again'),
      ],
      fragment('github'),
    );
    retry.end();
    expect(history.stackOf('github')).toEqual({length: 3, at: 2});
    expect(history.neighbours('github')).toEqual({back: {step: 1, title: 'PR #42'}});
    expect((history.stepTo('github', 1)!.paint.tree.root as {text: string}).text).toBe(
      'the detail',
    );
  });

  it('a question-kind fragment is a placeholder: Back from the answer lands on the paint before it (decision 2)', () => {
    const {runner, history} = historied();
    const ask = runner.begin(surfaceAction('merge'));
    ask.apply(
      [
        msg({paintMeta: {surfaceId: 'github:ask', kind: 'question', title: 'Merge?'}}),
        ...questionPaint('github:ask', 'Merge?').slice(1),
        create('github:ask'),
      ].reverse(),
      fragment('github'),
    );
    ask.end();
    repaint(runner, 'github:pr-list', 'Merged', 'merged');
    expect(history.stackOf('github')).toEqual({length: 3, at: 2});
    expect(history.neighbours('github')).toEqual({back: {step: 0, title: 'Pull requests'}});
  });

  it('a slot painted failed drops the step on screen: nothing to return to there', () => {
    const {runner, history} = historied();
    repaint(runner, 'github:pr-detail', 'PR #42', 'the detail');
    runner.beginSideStream().apply([slotRepaint([{source: 'github', state: 'failed'}])], SHELL);
    const retry = runner.beginSideStream();
    retry.apply(
      [
        titled('github:pr-list', 'Pull requests'),
        create('github:pr-list'),
        textRoot('github:pr-list', 'list'),
      ],
      fragment('github'),
    );
    retry.end();
    expect(history.neighbours('github')).toEqual({back: {step: 0, title: 'Pull requests'}});
  });

  it('restore puts the copy back in the slot as the live surface, titled, and a fresh create after it lands as the next step', () => {
    const {processor, store, runner, history} = historied();
    repaint(runner, 'github:pr-detail', 'PR #42', 'the detail');
    const step = history.stepTo('github', 0)!;
    runner.restore('github', step);
    expect(rootText(processor, 'github:pr-list')).toBe('four PRs');
    expect(processor.model.getSurface('github:pr-detail')).toBeUndefined();
    expect(store.getState().placement.get('github')?.surfaceId).toBe('github:pr-list');
    expect(store.getState().paintTitles.get('github')).toBe('Pull requests');
    expect(history.neighbours('github')).toEqual({forward: {step: 1, title: 'PR #42'}});
    // A later repaint of the restored id replaces it and drops the forward step.
    repaint(runner, 'github:pr-list', 'Another', 'another');
    expect(history.stackOf('github')).toEqual({length: 2, at: 1});
    expect(history.neighbours('github')).toEqual({back: {step: 0, title: 'Pull requests'}});
    expect((history.stepTo('github', 0)!.paint.tree.root as {text: string}).text).toBe('four PRs');
  });

  it('a late message for the surface a restore retired is dropped, not reported; a fresh create for it lands', () => {
    const {processor, store, runner, history} = historied();
    repaint(runner, 'github:pr-detail', 'PR #42', 'the detail');
    runner.restore('github', history.stepTo('github', 0)!);
    const late = runner.beginSideStream();
    late.apply([dataUpdate('github:pr-detail', {stale: true})], fragment('github'));
    expect(store.getState().error).toBeNull();
    expect(processor.model.getSurface('github:pr-detail')).toBeUndefined();
    late.apply(
      [create('github:pr-detail'), textRoot('github:pr-detail', 'again')],
      fragment('github'),
    );
    late.end();
    expect(rootText(processor, 'github:pr-detail')).toBe('again');
    expect(store.getState().placement.get('github')?.surfaceId).toBe('github:pr-detail');
  });

  it('the accepted wiring is filed under the combination it was accepted over; a payload the session refused is not (decision 3)', () => {
    for (const accepted of [true, false]) {
      const {runner, history} = historied(accepted);
      const stream = runner.beginSideStream();
      const payload = {dataModel: {}, sorts: []};
      stream.apply(
        [
          msg({createSurface: {surfaceId: 'shell:synthesis', catalogId: SHELL_CATALOG_ID}}),
          msg({
            updateComponents: {
              surfaceId: 'shell:synthesis',
              components: [{id: 'root', component: 'Text', text: 'merged'}],
            },
          }),
        ],
        fragment('shell'),
        payload as never,
      );
      expect(history.recall()).toEqual(
        accepted ? {target: {surfaceId: 'shell:synthesis', source: 'shell'}, payload} : undefined,
      );
    }
  });

  it('an action inside a fragment names the source it runs in while in flight; the composition’s retirement takes the history with it', () => {
    const {store, runner, history} = historied();
    const action = runner.begin(surfaceAction('open'));
    expect(store.getState().inFlight?.source).toBe('github');
    action.end();
    expect(store.getState().inFlight).toBeNull();
    const turn = runner.begin(utterance('again'));
    expect(store.getState().inFlight?.source).toBeUndefined();
    turn.apply(paintedLayout(['github']), SHELL);
    expect(history.stackOf('github')).toBeUndefined();
    turn.end();
  });
});
