/**
 * The turn runner: hold-and-swap with the net-effect validation gate, the
 * overlay slot for question paints, last-intent-wins cancel, and the timeline entry lifecycle —
 * an entry appended the moment a paint lands, its snapshot filled at serialize-on-swap.
 */
import {describe, it, expect} from 'vitest';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import {CATALOG, CATALOG_ID} from 'github-catalog';
import {CATALOG as SHELL_CATALOG, CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog';
import type {CompositionStamp} from '@a2uiverse/sdk';
import type {PaintCause} from '../timeline/paint';
import {createCanvasStore} from '../canvasStore';
import type {FragmentFailure} from './canvasTurn';
import {createTurnRunner} from './canvasTurn';

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;

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

const utterance = (text: string, parent: number | null = null): PaintCause => ({
  kind: 'utterance',
  parent,
  forked: false,
  payload: {text},
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
  it('streams the paint straight onto the stage and appends its live entry at turn end', () => {
    const {processor, store, runner} = setup();
    const turn = runner.begin(utterance('show my PRs'));
    expect(store.getState().inFlight?.label).toBe('“show my PRs” — generating…');

    turn.apply([create('pull-request-list')]);
    // Progressive: visible mid-turn, before the stream ends — but not yet a timeline entry.
    expect(store.getState().stageId).toBe('pull-request-list');
    turn.apply([textRoot('pull-request-list', 'PRs')]);
    expect(store.getState().timeline).toEqual([]);

    turn.end();
    const state = store.getState();
    expect(state.inFlight).toBeNull();
    expect(state.timeline).toHaveLength(1);
    expect(state.timeline[0]).toMatchObject({
      paintId: 1,
      surfaceId: 'pull-request-list',
      catalogId: CATALOG_ID,
      snapshot: null,
    });
    expect(state.timeline[0].cause).toEqual(utterance('show my PRs'));
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
    expect(state.timeline).toEqual([]);
    expect(state.error).toMatch(/withdrawn/);
    expect(processor.model.getSurface('broken')).toBeFalsy();
  });

  it('a dialog-rooted paint routes to the overlay, not the stage or the timeline', () => {
    const {store, runner} = setup();
    const turn = runner.begin(utterance('delete everything'));
    turn.apply([create('confirm-wipe'), ...questionPaint('confirm-wipe', 'Really wipe it all?')]);
    turn.end();

    const state = store.getState();
    expect(state.stageId).toBeNull();
    expect(state.overlay).toEqual({surfaceId: 'confirm-wipe', question: 'Really wipe it all?'});
    expect(state.timeline).toEqual([]);
  });

  it('a canceled progressive paint is removed from the stage and never enters the timeline', () => {
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
    expect(state.timeline).toEqual([]);
    expect(processor.model.getSurface('partial')).toBeFalsy();
  });
});

describe('staged mode (occupied stage): hold-and-swap', () => {
  it('holds the stage while the new paint streams off-stage, then swaps and fills the snapshot', () => {
    const {processor, store, runner} = setup();
    paintStage(runner, 'old-stage', 'old content');

    const turn = runner.begin(utterance('now the issues', 1));
    turn.apply([create('issue-list')]);
    // The hold: the outgoing surface stays, the new paint is not in the live registry yet.
    expect(store.getState().stageId).toBe('old-stage');
    expect(processor.model.getSurface('issue-list')).toBeFalsy();
    turn.apply([textRoot('issue-list', 'Issues')]);

    turn.end();
    const state = store.getState();
    expect(state.stageId).toBe('issue-list');
    expect(rootText(processor, 'issue-list')).toBe('Issues');
    // Serialize-on-swap: the departed entry filled in place; the new head has no snapshot yet.
    expect(state.timeline).toHaveLength(2);
    expect(state.timeline[0]).toMatchObject({paintId: 1, surfaceId: 'old-stage'});
    expect(state.timeline[0].snapshot?.tree.root).toMatchObject({
      type: 'Text',
      text: 'old content',
    });
    expect(Object.isFrozen(state.timeline[0].snapshot?.tree.root)).toBe(true);
    expect(state.timeline[1]).toMatchObject({paintId: 2, surfaceId: 'issue-list', snapshot: null});
    expect(Array.from(processor.model.surfacesMap.keys())).toEqual(['issue-list']);
  });

  it('a same-id repaint holds the old content until the swap, then departs as its own entry', () => {
    const {processor, store, runner} = setup();
    paintStage(runner, 'user-profile', 'v1');

    const turn = runner.begin(utterance('refresh it', 1));
    turn.apply([create('user-profile'), textRoot('user-profile', 'v2')]);
    // Staging shadows live: the visible surface still carries the old content.
    expect(rootText(processor, 'user-profile')).toBe('v1');

    turn.end();
    expect(rootText(processor, 'user-profile')).toBe('v2');
    const state = store.getState();
    expect(state.stageId).toBe('user-profile');
    expect(state.timeline.map(e => e.paintId)).toEqual([1, 2]);
    expect(state.timeline[0].snapshot?.tree.root).toMatchObject({text: 'v1'});
    expect(state.timeline[1].snapshot).toBeNull();
    expect(Array.from(processor.model.surfacesMap.keys())).toEqual(['user-profile']);
  });

  it('net-effect failure: the cleanup-deleted paint is discarded and the stage holds', () => {
    const {processor, store, runner} = setup();
    paintStage(runner, 'old-stage', 'still here');

    const turn = runner.begin(utterance('something invalid', 1));
    turn.apply([create('doomed'), textRoot('doomed', 'partial'), del('doomed')]);
    turn.end();

    const state = store.getState();
    expect(state.stageId).toBe('old-stage');
    expect(rootText(processor, 'old-stage')).toBe('still here');
    // The held paint is still the live head — no departure, no new entry.
    expect(state.timeline).toHaveLength(1);
    expect(state.timeline[0]).toMatchObject({paintId: 1, surfaceId: 'old-stage', snapshot: null});
    expect(state.error).toMatch(/keeping the current view/);
    expect(processor.model.getSurface('doomed')).toBeFalsy();
  });

  it('an update-only turn applies live and progressively, and is not a paint', () => {
    const {processor, store, runner} = setup();
    paintStage(runner, 'stage', 'before');

    const turn = runner.begin(utterance('tweak it', 1));
    turn.apply([textRoot('stage', 'after')]);
    // Live before the turn ends.
    expect(rootText(processor, 'stage')).toBe('after');
    turn.end();

    const state = store.getState();
    expect(state.timeline).toHaveLength(1);
    expect(state.timeline[0]).toMatchObject({paintId: 1, snapshot: null});
    expect(state.error).toBeNull();
  });

  it('a data-model update to the live stage applies mid-turn', () => {
    const {processor, store, runner} = setup();
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

    const turn = runner.begin(utterance('update', 1));
    turn.apply([dataUpdate('stage', {title: 'two'})]);
    expect(processor.model.getSurface('stage')?.dataModel.get('/')).toMatchObject({title: 'two'});
    turn.end();
    expect(store.getState().timeline).toHaveLength(1);
  });

  it('a deliberate delete of the live stage is honored: snapshot fills, canvas is live and empty', () => {
    const {processor, store, runner} = setup();
    paintStage(runner, 'stage', 'goodbye');

    const turn = runner.begin(utterance('clear the canvas', 1));
    turn.apply([del('stage')]);
    turn.end();

    const state = store.getState();
    expect(state.stageId).toBeNull();
    // Live and empty: the newest entry is a departed paint.
    expect(state.timeline).toHaveLength(1);
    expect(state.timeline[0]).toMatchObject({paintId: 1, surfaceId: 'stage'});
    expect(state.timeline[0].snapshot?.tree.root).toMatchObject({text: 'goodbye'});
    expect(state.notice?.text).toMatch(/cleared/);
    expect(state.error).toBeNull();
    expect(processor.model.getSurface('stage')).toBeFalsy();
  });

  it('when one turn creates several stage surfaces, the last takes the stage and all enter the timeline', () => {
    const {processor, store, runner} = setup();
    paintStage(runner, 'old-stage', 'old');

    const turn = runner.begin(utterance('two views', 1));
    turn.apply([
      create('first'),
      textRoot('first', 'one'),
      create('second'),
      textRoot('second', 'two'),
    ]);
    turn.end();

    const state = store.getState();
    expect(state.stageId).toBe('second');
    expect(state.timeline.map(e => e.surfaceId)).toEqual(['old-stage', 'first', 'second']);
    // Intermediates arrive already departed; only the head is live.
    expect(state.timeline.map(e => e.snapshot === null)).toEqual([false, false, true]);
    expect(Array.from(processor.model.surfacesMap.keys())).toEqual(['second']);
  });
});

describe('question paints and the overlay slot', () => {
  it('a dialog-rooted paint passes the gate into the overlay; the stage paint is untouched', () => {
    const {processor, store, runner} = setup();
    paintStage(runner, 'stage', 'held content');

    const turn = runner.begin(utterance('which repo?', 1));
    turn.apply([create('which-repo'), ...questionPaint('which-repo', 'Which repository?')]);
    // Gated: the question is not live mid-turn.
    expect(store.getState().overlay).toBeNull();
    turn.end();

    const state = store.getState();
    expect(state.overlay).toEqual({surfaceId: 'which-repo', question: 'Which repository?'});
    expect(state.stageId).toBe('stage');
    expect(state.timeline).toHaveLength(1);
    expect(state.timeline[0]).toMatchObject({paintId: 1, surfaceId: 'stage', snapshot: null});
    expect(Array.from(processor.model.surfacesMap.keys())).toEqual(['stage', 'which-repo']);
  });

  it('a new question replaces a pending one, which leaves no trace', () => {
    const {processor, store, runner} = setup();
    paintStage(runner, 'stage', 'held');

    const first = runner.begin(utterance('q1', 1));
    first.apply([create('question-1'), ...questionPaint('question-1', 'First?')]);
    first.end();

    const second = runner.begin(utterance('q2', 1));
    second.apply([create('question-2'), ...questionPaint('question-2', 'Second?')]);
    second.end();

    const state = store.getState();
    expect(state.overlay).toEqual({surfaceId: 'question-2', question: 'Second?'});
    expect(state.timeline).toHaveLength(1);
    expect(processor.model.getSurface('question-1')).toBeFalsy();
  });

  it('removeOverlay drops the question from canvas and registry with no trace', () => {
    const {processor, store, runner} = setup();
    paintStage(runner, 'stage', 'held');
    const turn = runner.begin(utterance('ask', 1));
    turn.apply([create('question'), ...questionPaint('question', 'Sure?')]);
    turn.end();

    runner.removeOverlay();
    const state = store.getState();
    expect(state.overlay).toBeNull();
    expect(state.timeline).toHaveLength(1);
    expect(processor.model.getSurface('question')).toBeFalsy();
    expect(Array.from(processor.model.surfacesMap.keys())).toEqual(['stage']);
  });

  it('a validated turn can deliver a stage paint and a question together', () => {
    const {store, runner} = setup();
    paintStage(runner, 'old-stage', 'old');

    const turn = runner.begin(utterance('both', 1));
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
    expect(state.timeline.map(e => e.surfaceId)).toEqual(['old-stage', 'new-stage']);
  });
});

describe('cancel: last-intent-wins', () => {
  it('a canceled staged paint is discarded wholesale; the stage holds', () => {
    const {processor, store, runner} = setup();
    paintStage(runner, 'stage', 'held');

    const turn = runner.begin(utterance('slow one', 1));
    turn.apply([create('slow'), textRoot('slow', 'half')]);
    turn.cancel();

    const state = store.getState();
    expect(turn.signal.aborted).toBe(true);
    expect(state.stageId).toBe('stage');
    expect(state.inFlight).toBeNull();
    expect(state.timeline).toHaveLength(1);
    expect(processor.model.getSurface('slow')).toBeFalsy();

    // A canceled turn is inert: late batches and the stream-exhaustion end are no-ops.
    turn.apply([textRoot('slow', 'late')]);
    turn.end();
    expect(store.getState().stageId).toBe('stage');
    expect(store.getState().timeline).toHaveLength(1);
  });

  it('beginning a new turn cancels the in-flight one and takes over the in-flight slot', () => {
    const {store, runner} = setup();
    paintStage(runner, 'stage', 'held');

    const first = runner.begin(utterance('first ask', 1));
    first.apply([create('a'), textRoot('a', 'A')]);
    const second = runner.begin(utterance('second ask', 1));

    expect(first.canceled).toBe(true);
    expect(first.signal.aborted).toBe(true);
    expect(runner.current).toBe(second);
    expect(store.getState().inFlight?.label).toBe('“second ask” — generating…');

    second.apply([create('b'), textRoot('b', 'B')]);
    second.end();
    const state = store.getState();
    // Only the real swap departed the old stage — the canceled paint left nothing.
    expect(state.stageId).toBe('b');
    expect(state.timeline.map(e => e.surfaceId)).toEqual(['stage', 'b']);
  });
});

describe('paint meta', () => {
  it('the accepted title upgrades the in-flight label and lands on the entry', () => {
    const {store, runner} = setup();
    const turn = runner.begin(utterance('show my PRs'));
    expect(store.getState().inFlight?.label).toBe('“show my PRs” — generating…');
    turn.acceptPaintMeta({surfaceId: 'pull-request-list', title: 'Open PRs — a2ui'});
    expect(store.getState().inFlight?.label).toBe('Open PRs — a2ui — generating…');

    turn.apply([create('pull-request-list'), textRoot('pull-request-list', 'PRs')]);
    turn.end();
    expect(store.getState().timeline[0].title).toBe('Open PRs — a2ui');
  });

  it('a titled staged paint carries its title onto the swapped-in entry', () => {
    const {store, runner} = setup();
    paintStage(runner, 'first', 'one');
    const turn = runner.begin(utterance('next'));
    turn.acceptPaintMeta({surfaceId: 'second', title: 'Second view'});
    turn.apply([create('second'), textRoot('second', 'two')]);
    turn.end();

    const state = store.getState();
    expect(state.stageId).toBe('second');
    expect(state.timeline[1].title).toBe('Second view');
    expect(state.timeline[0].title).toBeUndefined(); // untitled paints keep the fallback
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
    expect(state.timeline).toEqual([]); // questions never enter the timeline
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
    expect(state.timeline).toHaveLength(1);
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
    expect(state.timeline).toHaveLength(1);
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
    expect(state.timeline[0].title).toBe('Replayed title');
  });
});

describe('forked turns (dispatched from a parked view)', () => {
  const forkedUtterance = (text: string, parent: number): PaintCause => ({
    kind: 'utterance',
    parent,
    forked: true,
    parentTitle: 'parent view',
    payload: {text},
  });

  /** Two landed paints with the first parked — the canonical fork starting point. */
  function setupParked() {
    const ctx = setup();
    paintStage(ctx.runner, 's1', 'first');
    paintStage(ctx.runner, 's2', 'second');
    const parkedId = ctx.store.getState().timeline[0].paintId;
    ctx.store.park(parkedId);
    return {...ctx, parkedId};
  }

  it('holds the parked view while the fork streams, then returns to live when it lands', () => {
    const {store, runner, parkedId} = setupParked();
    const turn = runner.begin(forkedUtterance('fork it', parkedId));
    turn.apply([create('s3'), textRoot('s3', 'third')]);
    expect(store.getState().viewing).toBe(parkedId);

    turn.end();
    const state = store.getState();
    expect(state.stageId).toBe('s3');
    expect(state.viewing).toBeNull();
    expect(state.headAdvancedWhileParked).toBe(false);
  });

  it('a failed fork leaves the user parked on the view they acted from', () => {
    const {store, runner, parkedId} = setupParked();
    const turn = runner.begin(forkedUtterance('fork it', parkedId));
    turn.apply([create('s3'), textRoot('s3', 'third'), del('s3')]);
    turn.end();

    const state = store.getState();
    expect(state.stageId).toBe('s2');
    expect(state.viewing).toBe(parkedId);
    expect(state.error).not.toBeNull();
  });

  it('a canceled fork leaves the user parked', () => {
    const {store, runner, parkedId} = setupParked();
    const turn = runner.begin(forkedUtterance('fork it', parkedId));
    turn.apply([create('s3')]);
    turn.cancel();

    expect(store.getState().viewing).toBe(parkedId);
  });

  it('a fork resolving to a question stays parked — the overlay shows over the parked view', () => {
    const {store, runner, parkedId} = setupParked();
    const turn = runner.begin(forkedUtterance('fork it', parkedId));
    turn.apply([create('q'), ...questionPaint('q', 'Proceed?')]);
    turn.end();

    const state = store.getState();
    expect(state.overlay?.surfaceId).toBe('q');
    expect(state.viewing).toBe(parkedId);
  });

  it('a forked paint landing on an empty stage also returns the view to live', () => {
    const {store, runner, parkedId} = setupParked();
    // Clear the stage first (a deliberate delete of the live surface).
    const clearing = runner.begin(utterance('clear'));
    clearing.apply([del('s2')]);
    clearing.end();
    expect(store.getState().stageId).toBeNull();
    expect(store.getState().viewing).toBe(parkedId);

    const turn = runner.begin(forkedUtterance('fork it', parkedId));
    turn.apply([create('s3'), textRoot('s3', 'third')]);
    turn.end();

    const state = store.getState();
    expect(state.stageId).toBe('s3');
    expect(state.viewing).toBeNull();
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
  const fragment = (source: string, slot: string): CompositionStamp => ({
    source,
    slot,
    role: 'fragment',
  });

  /** The hub's first paint: the layout surface, before any agent has answered. */
  const shellPaint = (slots: string[]) => [
    msg({createSurface: {surfaceId: 'shell:main', catalogId: SHELL_CATALOG_ID}}),
    msg({
      updateComponents: {
        surfaceId: 'shell:main',
        components: [
          {id: 'root', component: 'Column', children: slots},
          ...slots.map(name => ({id: name, component: 'Slot', name, state: 'pending'})),
        ],
      },
    }),
  ];

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

  it('the shell takes the stage and fragments fill slots without contending for it', () => {
    const {processor, store, runner} = composedSetup();
    const turn = runner.begin(utterance('what needs my attention'));

    turn.apply(shellPaint(['slot-github']), SHELL);
    // First paint lands before any agent answers — the whole point of a composition.
    expect(store.getState().stageId).toBe('shell:main');

    turn.apply(
      [create('github:prs'), textRoot('github:prs', 'Pull requests')],
      fragment('github', 'slot-github'),
    );
    turn.end();

    expect(store.getState().stageId).toBe('shell:main');
    expect(store.getState().placement.get('slot-github')).toEqual({
      surfaceId: 'github:prs',
      source: 'github',
    });
    // The fragment lives in the registry to be mounted, but is not a paint of its own.
    expect(processor.model.getSurface('github:prs')).toBeDefined();
    expect(store.getState().timeline.map(e => e.surfaceId)).toEqual(['shell:main']);
  });

  it('a composition abandons hold-and-swap so its slots can fill in place', () => {
    const {store, runner} = composedSetup();
    paintStage(runner, 'old', 'previous paint');
    expect(store.getState().stageId).toBe('old');

    const turn = runner.begin(utterance('compose'));
    turn.apply(shellPaint(['slot-github']), SHELL);
    // Staged mode would have held 'old' until turn end; a composition swaps on arrival.
    expect(store.getState().stageId).toBe('shell:main');
    turn.end();
  });

  it('the outgoing composition leaves with its fragments — nothing stale reaches a vendor', () => {
    const {processor, store, runner} = composedSetup();
    const first = runner.begin(utterance('compose'));
    first.apply(shellPaint(['slot-github']), SHELL);
    first.apply(
      [create('github:prs'), textRoot('github:prs', 'one')],
      fragment('github', 'slot-github'),
    );
    first.end();

    const second = runner.begin(utterance('compose again'));
    second.apply(shellPaint(['slot-github']), SHELL);
    expect(processor.model.getSurface('github:prs')).toBeUndefined();
    expect(store.getState().placement.size).toBe(0);
    second.end();
  });

  it('one surface per slot: a later claim retires the earlier tenant', () => {
    const {processor, store, runner} = composedSetup();
    const turn = runner.begin(utterance('compose'));
    turn.apply(shellPaint(['slot-github']), SHELL);
    turn.apply([create('github:a'), textRoot('github:a', 'a')], fragment('github', 'slot-github'));
    turn.apply([create('github:b'), textRoot('github:b', 'b')], fragment('github', 'slot-github'));
    turn.end();

    expect(store.getState().placement.get('slot-github')?.surfaceId).toBe('github:b');
    expect(processor.model.getSurface('github:a')).toBeUndefined();
  });

  it('a bare shell repaint flips a slot without tearing the canvas down', () => {
    const {processor, store, runner} = composedSetup();
    const turn = runner.begin(utterance('compose'));
    turn.apply(shellPaint(['slot-github']), SHELL);
    turn.apply(
      [create('github:prs'), textRoot('github:prs', 'one')],
      fragment('github', 'slot-github'),
    );
    turn.end();

    // The hub flips a slot by repainting its own surface — an update, not a new composition.
    const flip = runner.begin(utterance('act'));
    flip.apply(
      [
        msg({
          updateComponents: {
            surfaceId: 'shell:main',
            components: [
              {id: 'slot-github', component: 'Slot', name: 'slot-github', state: 'failed'},
            ],
          },
        }),
      ],
      SHELL,
    );
    flip.end();

    expect(store.getState().stageId).toBe('shell:main');
    expect(store.getState().placement.get('slot-github')).toEqual({
      surfaceId: 'github:prs',
      source: 'github',
    });
    expect(processor.model.getSurface('github:prs')).toBeDefined();
  });

  it('the departing composition is captured whole, so time travel is not a lie', () => {
    const {store, runner} = composedSetup();
    const first = runner.begin(utterance('compose'));
    first.apply(shellPaint(['slot-github']), SHELL);
    first.apply(
      [create('github:prs'), textRoot('github:prs', 'Pull requests')],
      fragment('github', 'slot-github'),
    );
    first.end();

    // Serialize-on-swap: the composition materialises as the next one displaces it.
    const second = runner.begin(utterance('compose again'));
    second.apply(shellPaint(['slot-github']), SHELL);
    second.end();

    const [entry] = store.getState().timeline;
    expect(entry.snapshot).not.toBeNull();
    expect(entry.fragments).toHaveLength(1);
    const [captured] = entry.fragments!;
    expect(captured).toMatchObject({
      slot: 'slot-github',
      surfaceId: 'github:prs',
      source: 'github',
    });
    expect(captured.snapshot?.tree).toHaveProperty('root');
  });

  it('an unstamped stream is a stage paint — pre-composition fixtures are unchanged', () => {
    const {store, runner} = composedSetup();
    const turn = runner.begin(utterance('plain'));
    turn.apply([create('plain-view'), textRoot('plain-view', 'hello')]);
    turn.end();

    expect(store.getState().stageId).toBe('plain-view');
    expect(store.getState().placement.size).toBe(0);
    expect(store.getState().timeline.map(e => e.surfaceId)).toEqual(['plain-view']);
  });
});

describe('fragment failure reporting', () => {
  const SHELL: CompositionStamp = {source: 'shell', role: 'shell'};
  const fragment = (source: string, slot: string): CompositionStamp => ({
    source,
    slot,
    role: 'fragment',
  });

  const shellPaint = (slots: string[]) => [
    msg({createSurface: {surfaceId: 'shell:main', catalogId: SHELL_CATALOG_ID}}),
    msg({
      updateComponents: {
        surfaceId: 'shell:main',
        components: [
          {id: 'root', component: 'Column', children: slots},
          ...slots.map(name => ({id: name, component: 'Slot', name, state: 'pending'})),
        ],
      },
    }),
  ];

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
    turn.apply(shellPaint(['slot-gmail']), SHELL);
    turn.apply(
      [msg({createSurface: {surfaceId: 'gmail:inbox', catalogId: 'urn:not-installed'}})],
      fragment('gmail', 'slot-gmail'),
    );

    // Structural: it can never mount, so waiting for turn end would tell us nothing new.
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({surfaceId: 'gmail:inbox', slot: 'slot-gmail'});
    turn.end();
    // One report per fragment, never a second at settle.
    expect(failures).toHaveLength(1);
  });

  it('reports a fragment left invalid at turn end, and nothing for one that settles', () => {
    const {failures, runner} = failureSetup();
    const turn = runner.begin(utterance('compose'));
    turn.apply(shellPaint(['slot-github']), SHELL);
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
      fragment('github', 'slot-github'),
    );
    expect(failures).toHaveLength(0);
    turn.end();

    expect(failures).toHaveLength(1);
    expect(failures[0].message).toMatch(/no root component/);
  });

  it('a fragment that streams a partial and then settles reports nothing', () => {
    const {failures, runner} = failureSetup();
    const turn = runner.begin(utterance('compose'));
    turn.apply(shellPaint(['slot-github']), SHELL);
    turn.apply([create('github:prs')], fragment('github', 'slot-github'));
    turn.apply(
      [
        msg({
          updateComponents: {
            surfaceId: 'github:prs',
            components: [{id: 'root', component: 'Link', text: 'partial'}],
          },
        }),
      ],
      fragment('github', 'slot-github'),
    );
    turn.apply([textRoot('github:prs', 'Pull requests')], fragment('github', 'slot-github'));
    turn.end();

    expect(failures).toEqual([]);
  });

  it('a fragment displaced by a later claim on its slot is superseded, not failed', () => {
    const {failures, runner} = failureSetup();
    const turn = runner.begin(utterance('compose'));
    turn.apply(shellPaint(['slot-github']), SHELL);
    turn.apply([create('github:a')], fragment('github', 'slot-github'));
    turn.apply([create('github:b'), textRoot('github:b', 'b')], fragment('github', 'slot-github'));
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
});

describe('shell-granted promotion', () => {
  const SHELL: CompositionStamp = {source: 'shell', role: 'shell'};
  const fragment = (source: string, slot: string): CompositionStamp => ({
    source,
    slot,
    role: 'fragment',
  });
  const shellPaint = (slots: string[]) => [
    msg({createSurface: {surfaceId: 'shell:main', catalogId: SHELL_CATALOG_ID}}),
    msg({
      updateComponents: {
        surfaceId: 'shell:main',
        components: [
          {id: 'root', component: 'Column', children: slots},
          ...slots.map(name => ({id: name, component: 'Slot', name, state: 'pending'})),
        ],
      },
    }),
  ];

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
    turn.apply(shellPaint(['slot-github']), SHELL);
    turn.apply(
      [create('github:ask'), ...questionPaint('github:ask', 'Which repository?')],
      fragment('github', 'slot-github'),
    );
    turn.end();

    expect([...store.getState().promoted]).toEqual(['slot-github']);
    // The invariant: it stays where the shell put it.
    expect(store.getState().overlay).toBeNull();
    expect(store.getState().stageId).toBe('shell:main');
    expect(store.getState().placement.get('slot-github')?.surfaceId).toBe('github:ask');
  });

  it('several fragments can ask at once — promotion is plural, not a modal', () => {
    const {store, runner} = promotionSetup();
    const turn = runner.begin(utterance('compose'));
    turn.apply(shellPaint(['slot-github', 'slot-gmail']), SHELL);
    turn.apply(
      [create('github:ask'), ...questionPaint('github:ask', 'Which repository?')],
      fragment('github', 'slot-github'),
    );
    turn.apply(
      [create('gmail:ask'), ...questionPaint('gmail:ask', 'Which account?')],
      fragment('gmail', 'slot-gmail'),
    );
    turn.end();

    expect([...store.getState().promoted].sort()).toEqual(['slot-github', 'slot-gmail']);
    expect(store.getState().overlay).toBeNull();
  });

  it('an ordinary fragment is not promoted', () => {
    const {store, runner} = promotionSetup();
    const turn = runner.begin(utterance('compose'));
    turn.apply(shellPaint(['slot-github']), SHELL);
    turn.apply(
      [create('github:prs'), textRoot('github:prs', 'PRs')],
      fragment('github', 'slot-github'),
    );
    turn.end();
    expect(store.getState().promoted.size).toBe(0);
  });

  it('promotion clears when the composition is torn down', () => {
    const {store, runner} = promotionSetup();
    const first = runner.begin(utterance('compose'));
    first.apply(shellPaint(['slot-github']), SHELL);
    first.apply(
      [create('github:ask'), ...questionPaint('github:ask', 'Which repository?')],
      fragment('github', 'slot-github'),
    );
    first.end();
    expect(store.getState().promoted.size).toBe(1);

    const second = runner.begin(utterance('compose again'));
    second.apply(shellPaint(['slot-github']), SHELL);
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
