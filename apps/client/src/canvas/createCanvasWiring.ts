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
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import type {
  ActionListener,
  A2uiClientAction,
  A2uiClientDataModel,
  Catalog,
} from '@a2ui/web_core/v0_9';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import type {A2ASenderOptions} from '../a2a/client';
import {createSenderResolver, sendAndApply} from '../a2a/client';
import type {ForkContext} from '../a2a/messages';
import {buildActionMessageParams} from '../a2a/messages';
import {createA2ASession} from '../a2a/session';
import {streamUserMessage} from '../a2a/streamUserMessage';
import {describeError} from '../shared/describeError';
import {createCanvasStore} from './canvasStore';
import {createTurnRunner} from './turn/canvasTurn';
import {createCauseContext} from './timeline/causeContext';
import type {ParkedHolder} from './timeline/causeContext';
import type {PaintCause, PaintEntry} from './timeline/paint';
import {entryTitle} from './timeline/paint';
import type {ParkedSession} from './timeline/parkedSession';
import {createParkedSession} from './timeline/parkedSession';

const BLOCKED_CUE = 'Hold on — a paint is in flight. Try again when it lands.';

export interface CanvasWiring {
  store: ReturnType<typeof createCanvasStore>;
  processor: MessageProcessor<ReactComponentImplementation>;
  runner: ReturnType<typeof createTurnRunner>;
  sendUtterance(utterance: string): Promise<void>;
  repaint(): void;
  createParked(entry: PaintEntry): ParkedSession<ReactComponentImplementation>;
  attachParked(parked: ParkedSession<ReactComponentImplementation>): () => void;
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
  const supportedCatalogIds = catalogs.map(c => c.id);
  const processor = new MessageProcessor(catalogs, action => actionHandler(action));
  const runner = createTurnRunner({
    processor,
    store,
    createStaging: () => new MessageProcessor(catalogs),
  });
  const getClientDataModel = () => processor.getClientDataModel();
  /** The active parked session, registered by ParkedStage on mount (not a React ref). */
  const parkedHolder: ParkedHolder = {session: null};
  const {parentId, forkFields, forkContextOf, parkedClientDataModel} = createCauseContext(
    store,
    parkedHolder,
  );

  // Agent prose streams as fragments; one growing notice per paint, chat-style grouping.
  let prose = '';
  const startTurn = (cause: PaintCause) => {
    prose = '';
    return runner.begin(cause);
  };
  const reportAgentText = (text: string) => {
    prose += text;
    if (prose.trim()) store.showNotice(prose);
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

  const actionHandler: ActionListener = action => {
    const state = store.getState();
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
    createParkedSession(entry, {catalogs, store, onAction: parkedActionHandler});

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

  return {store, processor, runner, sendUtterance, repaint, createParked, attachParked};
}
