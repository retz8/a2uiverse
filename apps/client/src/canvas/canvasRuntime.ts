/**
 * One canvas's runtime (task-9.6 decision 1): its own A2A session — the context the orchestrator
 * minted for it — its store, its live MessageProcessor, its turn runner, its synthesis session,
 * its binding index and navigator, and the dispatch handlers that connect what happens inside it
 * to the transport. Created at the canvas's opening utterance and kept for the session; it runs
 * on whether or not it is the canvas on screen — its streams arrive, its synthesis evaluates, its
 * presses finish — and nothing ends it but its close.
 *
 * Interaction policy while a paint is in flight: agent-bound surface actions are blocked with a
 * status cue; answering an overlay question is always live.
 *
 * The fragment's way back (task 9.7) lives here too: the canvas's history — each source's stack
 * and the wiring remembered per combination — fed by the turn runner, and the step press that
 * restores a paint at once and tells the orchestrator.
 *
 * The live processor is the live registry of this canvas — exactly what the agent may see of it.
 */
import type {CompositionOperation, CompositionStamp, PaintMeta} from '@a2uiverse/sdk';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import type {ActionListener, A2uiClientAction, Catalog} from '@a2ui/web_core/v0_9';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import {OPERATORS, RELATIONS, type ShellAction} from '@a2uiverse/shell-catalog';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import type {A2AMessageSender, GetSender} from '../a2a/client';
import {sendAndApply} from '../a2a/client';
import {
  buildActionMessageParams,
  buildErrorMessageParams,
  buildOperationMessageParams,
  VALIDATION_FAILED,
} from '../a2a/messages';
import {createA2ASession} from '../a2a/session';
import {streamUserMessage} from '../a2a/streamUserMessage';
import {describeError} from '../shared/describeError';
import {createCanvasStore, type CanvasStore} from './canvasStore';
import type {FragmentFailure, TurnRunner} from './turn/canvasTurn';
import {createTurnRunner} from './turn/canvasTurn';
import type {PaintCause} from './turn/cause';
import {rosterOfSurface, SHELL_MAIN_SURFACE, SHELL_SOURCE} from './composition/roster';
import {flushSync} from 'react-dom';
import {createBindingIndex, type BindingIndex} from './navigation/bindingIndex';
import {createNavigator, type Navigator} from './navigation/landing';
import type {SynthesisSession} from './synthesis/synthesisSession';
import {createSynthesisSession} from './synthesis/synthesisSession';
import type {FragmentHistory} from './history/fragmentHistory';
import {createFragmentHistory} from './history/fragmentHistory';
import {capturePaint} from './history/paintCopy';
import type {TrustedPageState} from './trail/trailStore';

const BLOCKED_CUE = 'Hold on — a paint is in flight. Try again when it lands.';
/** The `sourceComponentId` of a shell action a `functionCall` raised: no component was in scope. */
export const FUNCTION_CALL_SOURCE = 'functionCall';

/** A turn whose stream dropped after it had answered, and one that never reached the orchestrator (task-8.7 decision 31). */
export const LOST_TURN_WORDS =
  'Lost the connection to A2UIVerse. Ask again to see where this stands.';
export const UNREACHED_TURN_WORDS = 'That didn’t reach A2UIVerse. Ask again.';

export interface CanvasRuntime {
  /** The trail's key for this canvas, client-minted (task-9.6 decision 3). */
  readonly id: string;
  store: CanvasStore;
  processor: MessageProcessor<ReactComponentImplementation>;
  runner: TurnRunner;
  /** The composition's synthesis: the evaluator's driver over this canvas's processor. */
  synthesis: SynthesisSession;
  /** Each source's paints in this canvas, and the wiring remembered per combination (task 9.7). */
  history: FragmentHistory;
  /** What this canvas's vendor components register in: the reverse index navigation lands by. */
  bindingIndex: BindingIndex;
  navigator: Navigator;
  /** The A2A context the orchestrator minted for the canvas; undefined until its first event. */
  contextId(): string | undefined;
  /**
   * The canvas's question, sent as its opening utterance: no context of its own yet, the canvas
   * it was asked from named as `parent`. Resolves when the stream closes.
   */
  open(text: string, parent?: string): Promise<void>;
  /** The reader's press on the composition: sent on a stream of its own beside the turn. */
  press(operation: CompositionOperation): Promise<void>;
  /** A shell action raised from a shell surface: the page is the caller's to open; reported here for the journal. */
  reportShellAction(action: ShellAction): void;
  /** An app's display name as this canvas's shell paint has it. */
  appDisplayName(appId: string): string | undefined;
  /**
   * The canvas closes (task-9.6 decision 8): the turn in flight and every stream beside it end,
   * and the orchestrator is told, on the canvas's context — nothing is sent for a canvas that
   * never got one.
   */
  close(): void;
}

export interface CanvasRuntimeOptions {
  id: string;
  /** The installed catalogs, as resolved by the entry; the processor is built over them. */
  catalogs: Catalog<ReactComponentImplementation>[];
  /** The orchestrator, for the turns. */
  getSender: GetSender;
  /** Where the streams beside the turn go: the orchestrator, or a replay's transport while attached. */
  getSideSender: GetSender;
  /** The orchestrator named the canvas: its context, from the first event. */
  onContext?: (contextId: string) => void;
  /** The Planner's title for the canvas arrived, as the `paintMeta` on the layout surface. */
  onTitle?: (title: string) => void;
}

export function createCanvasRuntime({
  id,
  catalogs,
  getSender,
  getSideSender,
  onContext,
  onTitle,
}: CanvasRuntimeOptions): CanvasRuntime {
  const store = createCanvasStore();
  const bare = createA2ASession();
  const session = {
    get: bare.get,
    set: (contextId: string) => {
      const first = bare.get() === undefined;
      bare.set(contextId);
      if (first) onContext?.(contextId);
    },
  };
  const supportedCatalogIds = catalogs.map(c => c.id);
  const processor = new MessageProcessor(catalogs, action => actionHandler(action));
  // The evaluator dispatches to the shell catalog's operators; the synthesis surface is painted
  // against that catalog, so it is always among the installed ones.
  const shellCatalog = catalogs.find(c => c.id === SHELL_CATALOG_ID);
  const synthesis = createSynthesisSession({
    processor,
    functions: shellCatalog?.functions ?? new Map(),
    operators: OPERATORS,
    relations: RELATIONS,
    // A wiring the client cannot evaluate is reported like any fragment the canvas cannot
    // render: the synthesis surface lives in a slot, and the hub answers by failing that slot.
    onInvalid: failure => void reportFragmentFailure(failure),
  });
  // The paint on screen for a source, as the stack captures it when it moves off (decision 1).
  const history = createFragmentHistory({
    capture: source => {
      const placed = store.getState().placement.get(source);
      return placed ? capturePaint(processor, placed.surfaceId) : undefined;
    },
  });
  const runner = createTurnRunner({
    processor,
    store,
    createStaging: () => new MessageProcessor(catalogs),
    onFragmentFailure: failure => void reportFragmentFailure(failure),
    synthesis,
    history,
    // The Planner's title leads the layout surface (task-9.3 decision 4): the trail's label.
    onPaintMeta: (meta: PaintMeta) => {
      if (meta.surfaceId === SHELL_MAIN_SURFACE && meta.title) onTitle?.(meta.title);
    },
  });
  const getClientDataModel = () => processor.getClientDataModel();

  /**
   * Agent prose streams as chunks — a sentence splits mid-word across events — so it is
   * accumulated rather than shown per fragment. Under fan-out several sources stream at once and
   * their chunks interleave, so each accumulates into its own line, named by the stamp that
   * carried it. Prose with no fragment stamp is the shell's.
   */
  const reportAgentText = (text: string, stamp?: CompositionStamp) => {
    store.appendProse(stamp?.role === 'fragment' ? stamp.source : null, text);
  };

  const open = async (text: string, parent?: string) => {
    // Speaking past a pending question dismisses it, no trace.
    runner.removeOverlay();
    const turn = runner.begin({kind: 'utterance', payload: {text}});
    // A turn that answered and then lost its stream is said in the client's words, as a press
    // is (task-8.7 decision 31); one that never reached the orchestrator likewise. The browser's
    // own error text goes to the console.
    let answered = false;
    try {
      await streamUserMessage(text, {
        getSender,
        apply: turn.apply,
        session,
        getClientDataModel,
        signal: turn.signal,
        onFirstEvent: () => {
          answered = true;
        },
        onError: err => {
          console.error('[A2UI:a2a] turn failed', err);
          store.reportError(answered ? LOST_TURN_WORDS : UNREACHED_TURN_WORDS);
        },
        onAgentText: reportAgentText,
        parent,
        onPaintMeta: turn.acceptPaintMeta,
        supportedCatalogIds,
      });
    } finally {
      turn.end();
    }
  };

  const sendCausedAction = async (action: A2uiClientAction, cause: PaintCause) => {
    const turn = runner.begin(cause);
    try {
      const sender = await getSender();
      await sendAndApply(
        sender,
        buildActionMessageParams(action, session.get(), getClientDataModel(), supportedCatalogIds),
        {
          apply: turn.apply,
          session,
          onAgentText: reportAgentText,
          signal: turn.signal,
          onPaintMeta: turn.acceptPaintMeta,
        },
      );
    } catch (err) {
      if (!turn.signal.aborted) {
        console.error('[A2UI:a2a]', err);
        store.reportError(`That action failed. ${describeError(err)}`);
      }
    } finally {
      turn.end();
    }
  };

  /**
   * The reader's press — Retry, Include or Try again (task 8.5): the composition operation, sent
   * on a stream of its own beside the turn and answered there. Not a turn: it lights no status
   * strip and never cancels the turn in flight. The press is drawn at the click and held in the
   * store until the paint catches up — the stream's first shell repaint — or the stream ends; a
   * press that never reached the orchestrator, or whose stream broke after it answered, stands so
   * the slot can say so. A refused press ends quietly: the paint already shows what won. A past
   * canvas takes a press as the live one does (phase-9 decision 4).
   */
  const press = async (operation: CompositionOperation) => {
    if (operation.kind === 'step') return step(operation);
    const key = store.addPress(operation);
    const stream = runner.beginSideStream();
    let answered = false;
    try {
      const sender = await getSideSender();
      await sendAndApply(
        sender,
        buildOperationMessageParams(operation, session.get(), supportedCatalogIds),
        {
          apply: (messages, stamp, payload) => {
            stream.apply(messages, stamp, payload);
            if (stamp?.role === 'shell') store.updatePress(key, 'running');
          },
          session,
          signal: stream.signal,
          onFirstEvent: () => {
            answered = true;
          },
          // A retried vendor may answer in words; the shell's own words on this stream are a
          // refusal, which the canvas does not show.
          onAgentText: (text, stamp) => {
            if (stamp?.role === 'fragment' && stamp.source !== SHELL_SOURCE)
              reportAgentText(text, stamp);
            else if (text.trim()) console.info('[A2UI:a2a] press:', text);
          },
          onPaintMeta: stream.acceptPaintMeta,
        },
      );
      store.removePress(key);
    } catch (err) {
      if (stream.signal.aborted) store.removePress(key);
      else {
        console.error('[A2UI:a2a] press failed', err);
        store.updatePress(key, answered ? 'lost' : 'unreached');
      }
    } finally {
      stream.end();
    }
  };

  /**
   * A step back or forward inside a fragment (phase-9 decisions 2, 3; task 9.7): the paint the
   * history holds for that index becomes the source's live surface at once, and the merged view
   * follows — the wiring remembered over the new combination re-accepted with no call when the
   * client has seen it, or one filed over fewer sources that covers it, the sources painted since
   * said late by the orchestrator's repaint (task-9.9 decision 16); otherwise the merge line works
   * until the step's stream ends, a paint on that stream landing as any does, a silent end keeping
   * the current wiring and filing it under the combination so the two memories converge
   * (decision 4). The line follows the latest step alone: a later step ends the working an
   * earlier one left, whose walk the orchestrator abandons (task-9.9 decision 17). Then the step goes to the
   * orchestrator as a press, carrying the whole canvas's data model so its partition is written
   * from what is on screen. A step to the paint on screen, or to a placeholder, does nothing. A
   * step that fails — refused, unreached, lost — is quiet: the restored screen stands, the
   * reason goes to the console, the next action heals the orchestrator's partition (decision 5).
   */
  /** How many steps the canvas has taken: the latest one owns the merge line. */
  let steps = 0;
  const step = async (operation: CompositionOperation) => {
    const source = operation.sources[0];
    if (source === undefined || operation.step === undefined) return;
    const restorable = history.stepTo(source, operation.step);
    if (!restorable) return;
    runner.restore(source, restorable);
    const mine = ++steps;
    const remembered = history.recall() ?? history.recallCovering();
    const following = !remembered;
    if (remembered) synthesis.accept(remembered.target, remembered.payload);
    store.setMergeFollowingStep(following);
    const key = store.addPress(operation);
    const stream = runner.beginSideStream();
    let wired = false;
    try {
      const sender = await getSideSender();
      await sendAndApply(
        sender,
        buildOperationMessageParams(
          operation,
          session.get(),
          supportedCatalogIds,
          getClientDataModel(),
        ),
        {
          apply: (messages, stamp, payload) => {
            if (payload) wired = true;
            stream.apply(messages, stamp, payload);
            if (stamp?.role === 'shell') store.updatePress(key, 'running');
          },
          session,
          signal: stream.signal,
          onAgentText: (text, stamp) => {
            if (stamp?.role === 'fragment' && stamp.source !== SHELL_SOURCE)
              reportAgentText(text, stamp);
            else if (text.trim()) console.info('[A2UI:a2a] step:', text);
          },
          onPaintMeta: stream.acceptPaintMeta,
        },
      );
      // A silent end: what is on screen is the wiring over this combination from now on.
      if (following && !wired && steps === mine) {
        const current = synthesis.payload;
        const surfaceId = store.getState().placement.get(SHELL_SOURCE)?.surfaceId;
        if (current && surfaceId)
          history.remember({target: {surfaceId, source: SHELL_SOURCE}, payload: current});
      }
    } catch (err) {
      if (!stream.signal.aborted) console.error('[A2UI:a2a] step failed', err);
    } finally {
      store.removePress(key);
      if (following && steps === mine) store.setMergeFollowingStep(false);
      stream.end();
    }
  };

  /**
   * A fragment the canvas could not render, reported to the hub — which owns slot lifecycle and
   * answers by repainting its own shell surface with that slot failed.
   *
   * Deliberately not a turn: beginning one would cancel whatever the user has in flight and light
   * the status strip for something they never asked for. So it sends on the side and routes the
   * answer as a stream beside the turn (task-8.5 decision 3).
   */
  const reportFragmentFailure = async (failure: FragmentFailure) => {
    // `shell:main` is reused on every paint, so a late report from a fragment since displaced
    // would flip a slot in the one that replaced it. A refused fragment was never placed and is
    // reported the moment it arrives, so it cannot be late.
    if (
      !failure.refused &&
      store.getState().placement.get(failure.source)?.surfaceId !== failure.surfaceId
    )
      return;
    const stream = runner.beginSideStream();
    try {
      const sender = await getSideSender();
      await sendAndApply(
        sender,
        buildErrorMessageParams(
          {
            code: VALIDATION_FAILED,
            surfaceId: failure.surfaceId,
            path: failure.path,
            message: failure.message,
          },
          session.get(),
          getClientDataModel(),
          supportedCatalogIds,
        ),
        {apply: stream.apply, session, signal: stream.signal},
      );
    } catch (err) {
      // A failed failure report must not cascade into the turn that produced it.
      if (!stream.signal.aborted) console.error('[A2UI:a2a] validation report failed', err);
    } finally {
      stream.end();
    }
  };

  /**
   * A shell action (SPEC §7; task-6.5 decisions 2–4, 6): reported to the hub for the journal,
   * which is the only thing the hub does with it. The report is a standard A2UI action on the
   * shell surface that raised it, sent the way a fragment failure is: on the side, no turn, no
   * status strip. The page never waits on the hub, and a failed report is logged and nothing
   * more. Every raise is reported, an open page included — a second click is a second intent.
   */
  const reportShellAction = (action: ShellAction) => {
    const clientAction: A2uiClientAction = {
      name: action.name,
      surfaceId: action.surfaceId,
      // A functionCall runs with no component in scope; only the capability tile names itself.
      sourceComponentId: action.componentId ?? FUNCTION_CALL_SOURCE,
      timestamp: new Date().toISOString(),
      context:
        action.name === 'openStore' && action.query !== undefined ? {query: action.query} : {},
    };
    void (async () => {
      // The hub answers with nothing. Should it ever answer with a paint, it lands like the
      // failure report's repaint does rather than being dropped.
      const stream = runner.beginSideStream();
      try {
        const sender = await getSideSender();
        await sendAndApply(
          sender,
          buildActionMessageParams(clientAction, session.get(), undefined, supportedCatalogIds),
          {apply: stream.apply, session, signal: stream.signal},
        );
      } catch (err) {
        if (!stream.signal.aborted) console.error('[A2UI:a2a] shell action report failed', err);
      } finally {
        stream.end();
      }
    })();
  };

  /** Answering a promoted fragment is what ends its demand for attention. */
  const demoteFor = (surfaceId: string) => {
    for (const [source, placed] of store.getState().placement) {
      if (placed.surfaceId === surfaceId) store.demoteSlot(source);
    }
  };

  const actionHandler: ActionListener = action => {
    const state = store.getState();
    demoteFor(action.surfaceId);
    if (state.overlay && action.surfaceId === state.overlay.surfaceId) {
      // Answering the question (either dialog action): capture the Q&A into the cause and
      // remove the dialog at dispatch — always live.
      const cause: PaintCause = {
        kind: 'overlay-answer',
        payload: {question: state.overlay.question, answer: action},
      };
      runner.removeOverlay();
      return sendCausedAction(action, cause);
    }
    if (state.inFlight) {
      // Agent-bound actions are blocked while a paint is in flight — a status cue, not a fire.
      store.showNotice(BLOCKED_CUE);
      return;
    }
    return sendCausedAction(action, {kind: 'surface-action', payload: {action}});
  };

  /**
   * Navigation (SPEC §7; task-7.7): a tap on a merged cell lands in the vendor's fragment by the
   * index of what is mounted of this canvas. Client-local: nothing is sent, nothing is journaled.
   */
  const bindingIndex = createBindingIndex(flushSync);
  const navigator = createNavigator(bindingIndex);

  /**
   * An app's display name as this canvas's shell paint has it (task-7.5 decision 11), read off
   * the shell paint on the stage, then the store's roster.
   */
  const appDisplayName = (appId: string) => {
    const stageId = store.getState().stageId;
    const surface = stageId ? processor.model.getSurface(stageId) : undefined;
    const named = (roster: readonly {appId: string; displayName: string}[]) =>
      roster.find(entry => entry.appId === appId)?.displayName;
    return (surface && named(rosterOfSurface(surface))) ?? named(store.getState().roster);
  };

  const close = () => {
    runner.cancelAll();
    const contextId = session.get();
    if (contextId === undefined) return;
    void (async () => {
      try {
        const sender = await getSideSender();
        await sendAndApply(
          sender,
          buildOperationMessageParams({kind: 'close', sources: []}, contextId, supportedCatalogIds),
          {apply: () => {}},
        );
      } catch (err) {
        console.error('[A2UI:a2a] close failed', err);
      }
    })();
  };

  return {
    id,
    store,
    processor,
    runner,
    synthesis,
    history,
    bindingIndex,
    navigator,
    contextId: () => session.get(),
    open,
    press,
    reportShellAction,
    appDisplayName,
    close,
  };
}

/** What a shell action opens: the page the trail store holds (task-6.5 decisions 2, 3). */
export function trustedPageOf(action: ShellAction): TrustedPageState {
  return action.name === 'openStore'
    ? {page: 'store', ...(action.query !== undefined ? {query: action.query} : {})}
    : {page: 'appLibrary'};
}

export type {A2AMessageSender};
