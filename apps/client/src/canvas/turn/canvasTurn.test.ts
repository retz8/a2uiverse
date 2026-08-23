/**
 * The turn runner (tasks 8.3 + 8.4): hold-and-swap with the net-effect validation gate, the
 * overlay slot for question paints, last-intent-wins cancel, and the timeline entry lifecycle —
 * an entry appended the moment a paint lands, its snapshot filled at serialize-on-swap
 * (task-8.4 spec decision 1).
 */
import {describe, it, expect} from 'vitest';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import {CATALOG, CATALOG_ID} from 'primer-a2ui-adapter';
import type {PaintCause} from '../timeline/paint';
import {createCanvasStore} from '../canvasStore';
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
    turn.apply([create('confirm-wipe'), dialogRoot('confirm-wipe', 'Really wipe it all?')]);
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
    // Live before the turn ends (decision 2).
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
    turn.apply([create('which-repo'), dialogRoot('which-repo', 'Which repository?')]);
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
    first.apply([create('question-1'), dialogRoot('question-1', 'First?')]);
    first.end();

    const second = runner.begin(utterance('q2', 1));
    second.apply([create('question-2'), dialogRoot('question-2', 'Second?')]);
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
    turn.apply([create('question'), dialogRoot('question', 'Sure?')]);
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
      dialogRoot('question', 'Also this?'),
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

describe('paint meta (task 8.5)', () => {
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
    turn.apply([create('q'), dialogRoot('q', 'Proceed?')]);
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
