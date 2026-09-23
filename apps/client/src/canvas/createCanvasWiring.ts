/**
 * The canvas page's runtime graph, built once: the store, the A2A session and sender, the live
 * MessageProcessor, the turn runner, and the dispatch handlers that connect user intent to the
 * transport. Lifted out of the React component so the component reads as layout and the wiring
 * reads as wiring.
 *
 * Interaction policy while a paint is in flight: palette utterances and Repaint are
 * last-intent-wins; agent-bound surface actions — live or parked — are blocked with a status
 * cue; answering an overlay question and all shell chrome are always live.
 *
 * Time travel: every cause records the paint the user was looking at (`parent`) and whether the
 * view was parked (`forked`, with the parent's title denormalised). A dispatch from a parked
 * view holds that view while the forked paint is in flight — the turn runner returns the view
 * to live when the paint lands, and the parked session's unmount then commits its write-back.
 * A forked turn reports the parked snapshot's data model, not the head's. The live processor is
 * the live registry, exactly what the agent may see.
 */
import type {CompositionOperation, CompositionStamp} from '@a2uiverse/sdk';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import type {
  ActionListener,
  A2uiClientAction,
  A2uiClientDataModel,
  Catalog,
} from '@a2ui/web_core/v0_9';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import {OPERATORS, RELATIONS, type PressHandler, type ShellAction} from '@a2uiverse/shell-catalog';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import type {A2AMessageSender, A2ASenderOptions} from '../a2a/client';
import {createSenderResolver, sendAndApply} from '../a2a/client';
import type {ForkContext} from '../a2a/messages';
import {
  buildActionMessageParams,
  buildErrorMessageParams,
  buildOperationMessageParams,
  VALIDATION_FAILED,
} from '../a2a/messages';
import {createA2ASession} from '../a2a/session';
import {streamUserMessage} from '../a2a/streamUserMessage';
import {describeError} from '../shared/describeError';
import {createCanvasStore} from './canvasStore';
import type {FragmentFailure} from './turn/canvasTurn';
import {createTurnRunner} from './turn/canvasTurn';
import {createCauseContext} from './timeline/causeContext';
import type {ParkedHolder} from './timeline/causeContext';
import type {PaintCause, PaintEntry} from './timeline/paint';
import {entryTitle} from './timeline/paint';
import type {ParkedSession} from './timeline/parkedSession';
import {flushSync} from 'react-dom';
import {createParkedSession} from './timeline/parkedSession';
import {rosterOfSurface, SHELL_SOURCE} from './composition/roster';
import type {ShellHost} from './hostRelay';
import {createBindingIndex, type BindingIndex} from './navigation/bindingIndex';
import {createNavigator} from './navigation/landing';
import type {SynthesisSession} from './synthesis/synthesisSession';
import {createSynthesisSession} from './synthesis/synthesisSession';

const BLOCKED_CUE = 'Hold on — a paint is in flight. Try again when it lands.';
/** The `sourceComponentId` of a shell action a `functionCall` raised: no component was in scope. */
export const FUNCTION_CALL_SOURCE = 'functionCall';

export interface CanvasWiring {
  store: ReturnType<typeof createCanvasStore>;
  processor: MessageProcessor<ReactComponentImplementation>;
  runner: ReturnType<typeof createTurnRunner>;
  /** The composition's synthesis: the evaluator's driver over the live processor. */
  synthesis: SynthesisSession;
  sendUtterance(utterance: string): Promise<void>;
  repaint(): void;
  createParked(entry: PaintEntry): ParkedSession<ReactComponentImplementation>;
  attachParked(parked: ParkedSession<ReactComponentImplementation>): () => void;
  /** A shell action raised from a shell surface: handled here, reported for the journal. */
  onShellAction(action: ShellAction): void;
  /** The reader's press on the composition: sent on a stream of its own beside the turn. */
  press(operation: CompositionOperation): Promise<void>;
  /**
   * A beat replay (task-8.6 decision 2): every stream beside the turn — a press, a failure report,
   * a shell action's report — is sent to `sender` instead of the orchestrator until detached.
   */
  attachReplay(sender: A2AMessageSender): () => void;
  /** What the shell catalog takes from this canvas, bound through the host relay while mounted. */
  host: ShellHost;
  /** What the vendor components' markers register in: the reverse index navigation lands by. */
  bindingIndex: BindingIndex;
}

export interface CanvasWiringOptions extends A2ASenderOptions {
  /** The installed catalogs, as resolved by the entry; every processor is built over them. */
  catalogs: Catalog<ReactComponentImplementation>[];
}

export function createCanvasWiring({
  serverUrl,
  client,
  catalogs,
}: CanvasWiringOptions): CanvasWiring {
  const store = createCanvasStore();
  const session = createA2ASession();
  const getSender = createSenderResolver({serverUrl, client});
  /** A beat replay's transport, while one is attached: where the streams beside the turn go. */
  let replaySender: A2AMessageSender | null = null;
  const getSideSender = () => (replaySender ? Promise.resolve(replaySender) : getSender());
  const attachReplay = (sender: A2AMessageSender) => {
    replaySender = sender;
    return () => {
      if (replaySender === sender) replaySender = null;
    };
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
  const runner = createTurnRunner({
    processor,
    store,
    createStaging: () => new MessageProcessor(catalogs),
    onFragmentFailure: failure => void reportFragmentFailure(failure),
    synthesis,
  });
  const getClientDataModel = () => processor.getClientDataModel();
  /** The active parked session, registered by ParkedStage on mount (not a React ref). */
  const parkedHolder: ParkedHolder = {session: null};
  const {parentId, forkFields, forkContextOf, parkedClientDataModel} = createCauseContext(
    store,
    parkedHolder,
  );

  const startTurn = (cause: PaintCause) => runner.begin(cause);
  /**
   * Agent prose streams as chunks — a sentence splits mid-word across events — so it is
   * accumulated rather than shown per fragment. Under fan-out several sources stream at once and
   * their chunks interleave, so each accumulates into its own line, named by the stamp that
   * carried it. Prose with no fragment stamp is the shell's.
   */
  const reportAgentText = (text: string, stamp?: CompositionStamp) => {
    store.appendProse(stamp?.role === 'fragment' ? stamp.source : null, text);
  };

  const dispatchUtterance = async (
    text: string,
    cause: PaintCause,
    dataModel?: A2uiClientDataModel,
    forkContext?: ForkContext,
  ) => {
    const turn = startTurn(cause);
    try {
      await streamUserMessage(text, {
        getSender,
        apply: turn.apply,
        session,
        getClientDataModel: () => dataModel ?? getClientDataModel(),
        signal: turn.signal,
        onError: err => store.reportError(`The agent request failed. ${describeError(err)}`),
        onAgentText: reportAgentText,
        forkContext,
        onPaintMeta: turn.acceptPaintMeta,
        supportedCatalogIds,
      });
    } finally {
      turn.end();
    }
  };

  const sendUtterance = (utterance: string) => {
    // Speaking past a pending question dismisses it, no trace. Last-intent-wins over any
    // in-flight paint is the runner's job (begin cancels it, aborting the transport).
    runner.removeOverlay();
    const fork = forkFields();
    const cause: PaintCause = {
      kind: 'utterance',
      parent: parentId(),
      ...fork,
      payload: {text: utterance},
    };
    return dispatchUtterance(
      utterance,
      cause,
      fork.forked ? parkedClientDataModel() : undefined,
      forkContextOf(),
    );
  };

  const sendCausedAction = async (
    action: A2uiClientAction,
    cause: PaintCause,
    dataModel?: A2uiClientDataModel,
    forkContext?: ForkContext,
  ) => {
    const turn = startTurn(cause);
    try {
      const sender = await getSender();
      await sendAndApply(
        sender,
        buildActionMessageParams(
          action,
          session.get(),
          dataModel ?? getClientDataModel(),
          forkContext,
          supportedCatalogIds,
        ),
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
   * strip, adds no history row, and never cancels the turn in flight. The press is drawn at the
   * click and held in the store until the paint catches up — the stream's first shell repaint — or
   * the stream ends; a press that never reached the orchestrator, or whose stream broke after it
   * answered, stands so the slot can say so. A refused press ends quietly: the paint already shows
   * what won. No press is made on a composition being replaced, or from a parked view.
   */
  const press = async (operation: CompositionOperation) => {
    const {superseded, viewing} = store.getState();
    if (superseded || viewing !== null || parkedHolder.session) return;
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

  const onPress: PressHandler = ({operation}) => void press(operation);

  /**
   * A fragment the canvas could not render, reported to the hub — which owns slot lifecycle and
   * answers by repainting its own shell surface with that slot failed.
   *
   * Deliberately not a turn: beginning one would cancel whatever the user has in flight, light
   * the status strip for something they never asked for, and put a row in the history. So it
   * sends on the side and routes the answer as a stream beside the turn (task-8.5 decision 3).
   */
  const reportFragmentFailure = async (failure: FragmentFailure) => {
    // `shell:main` is reused every turn, so a late report from an abandoned composition would
    // flip a slot in the one that replaced it. A refused fragment was never placed and is
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
   * A shell action (SPEC §7; task-6.5 decisions 2–4, 6): handled locally — the page opens over
   * the canvas at once — and reported to the hub for the journal, which is the only thing the
   * hub does with it. The report is a standard A2UI action on the shell surface that raised it,
   * sent the way a fragment failure is: on the side, no turn, no status strip, no history row.
   * The page never waits on the hub, and a failed report is logged and nothing more. Every
   * raise is reported, an open page included — a second click is a second intent.
   */
  const onShellAction = (action: ShellAction) => {
    store.openTrustedPage(
      action.name === 'openStore'
        ? {page: 'store', ...(action.query !== undefined ? {query: action.query} : {})}
        : {page: 'appLibrary'},
    );
    void reportShellAction(action);
  };

  const reportShellAction = async (action: ShellAction) => {
    const clientAction: A2uiClientAction = {
      name: action.name,
      surfaceId: action.surfaceId,
      // A functionCall runs with no component in scope; only the capability tile names itself.
      sourceComponentId: action.componentId ?? FUNCTION_CALL_SOURCE,
      timestamp: new Date().toISOString(),
      context:
        action.name === 'openStore' && action.query !== undefined ? {query: action.query} : {},
    };
    // The hub answers with nothing. Should it ever answer with a paint, it lands like the
    // failure report's repaint does rather than being dropped.
    const stream = runner.beginSideStream();
    try {
      const sender = await getSideSender();
      await sendAndApply(
        sender,
        buildActionMessageParams(
          clientAction,
          session.get(),
          undefined,
          undefined,
          supportedCatalogIds,
        ),
        {apply: stream.apply, session, signal: stream.signal},
      );
    } catch (err) {
      if (!stream.signal.aborted) console.error('[A2UI:a2a] shell action report failed', err);
    } finally {
      stream.end();
    }
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
      // remove the dialog at dispatch — always live. Answering from a parked view is an
      // ordinary fork.
      const fork = forkFields();
      const cause: PaintCause = {
        kind: 'overlay-answer',
        parent: parentId(),
        ...fork,
        payload: {question: state.overlay.question, answer: action},
      };
      const dataModel = fork.forked ? parkedClientDataModel() : undefined;
      const forkContext = forkContextOf();
      runner.removeOverlay();
      return sendCausedAction(action, cause, dataModel, forkContext);
    }
    if (state.inFlight) {
      // Agent-bound actions are blocked while a paint is in flight — a status cue, not a fire.
      store.showNotice(BLOCKED_CUE);
      return;
    }
    return sendCausedAction(action, {
      kind: 'surface-action',
      parent: parentId(),
      forked: false,
      payload: {action},
    });
  };

  /** Actions fired from a parked surface: same blocked class, forked consequence. */
  const parkedActionHandler: ActionListener = action => {
    if (store.getState().inFlight) {
      store.showNotice(BLOCKED_CUE);
      return;
    }
    const fork = forkFields();
    const cause: PaintCause = {
      kind: 'surface-action',
      parent: parentId(),
      ...fork,
      payload: {action},
    };
    return sendCausedAction(action, cause, parkedClientDataModel(), forkContextOf());
  };

  const createParked = (entry: PaintEntry) =>
    createParkedSession(entry, {
      catalogs,
      store,
      onAction: parkedActionHandler,
      functions: shellCatalog?.functions ?? new Map(),
    });

  /** Register a mounted parked session; the returned teardown commits its write-back. */
  const attachParked = (parked: ParkedSession<ReactComponentImplementation>) => {
    parkedHolder.session = parked;
    return () => {
      parked.commit();
      if (parkedHolder.session === parked) parkedHolder.session = null;
    };
  };

  /** Repaint: regenerate the parked view by re-firing its cause. */
  const repaint = () => {
    const state = store.getState();
    const entry =
      state.viewing !== null ? state.timeline.find(e => e.paintId === state.viewing) : undefined;
    if (!entry) return;
    runner.removeOverlay();
    const base = {parent: entry.paintId, forked: true, parentTitle: entryTitle(entry)};
    const dataModel = parkedClientDataModel();
    const forkContext = forkContextOf();
    const cause = entry.cause;
    if (cause.kind === 'utterance') {
      void dispatchUtterance(
        cause.payload.text,
        {kind: 'utterance', ...base, payload: cause.payload},
        dataModel,
        forkContext,
      );
    } else if (cause.kind === 'surface-action') {
      void sendCausedAction(
        cause.payload.action,
        {kind: 'surface-action', ...base, payload: cause.payload},
        dataModel,
        forkContext,
      );
    } else {
      void sendCausedAction(
        cause.payload.answer,
        {kind: 'overlay-answer', ...base, payload: cause.payload},
        dataModel,
        forkContext,
      );
    }
  };

  /**
   * Navigation (SPEC §7; task-7.7): a tap on a merged cell lands in the vendor's fragment by the
   * index of what is mounted — the live canvas or a parked composition alike. Client-local:
   * nothing is sent, nothing is journaled.
   */
  const bindingIndex = createBindingIndex(flushSync);
  const navigator = createNavigator(bindingIndex);

  /**
   * An app's display name as the mounted composition's roster has it (task-7.5 decision 11),
   * read off the shell paint on the stage — the live one's, or a parked composition's own.
   */
  const appDisplayName = (appId: string) => {
    const parked = parkedHolder.session;
    const stageId = store.getState().stageId;
    // The store's roster is the live composition's; a parked composition names its apps by its
    // own shell paint.
    const surface = parked
      ? parked.processor.model.getSurface(parked.surfaceId)
      : stageId
        ? processor.model.getSurface(stageId)
        : undefined;
    const named = (roster: readonly {appId: string; displayName: string}[]) =>
      roster.find(entry => entry.appId === appId)?.displayName;
    return (surface && named(rosterOfSurface(surface))) ?? named(store.getState().roster);
  };

  return {
    store,
    processor,
    runner,
    synthesis,
    sendUtterance,
    repaint,
    createParked,
    attachParked,
    onShellAction,
    press,
    attachReplay,
    host: {onShellAction, onNavigate: navigator.navigate, appDisplayName, onPress},
    bindingIndex,
  };
}
