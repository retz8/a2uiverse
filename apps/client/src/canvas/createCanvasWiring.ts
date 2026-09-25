/**
 * The canvas page's runtime graph, built once: the trail store, the canvases' runtimes by id, the
 * A2A sender resolver, and the page-level handlers — asking, viewing, closing — that route to the
 * canvas on screen. Lifted out of the React component so the component reads as layout and the
 * wiring reads as wiring.
 *
 * A question opens a canvas of its own (phase-9 decisions 1, 5, 17): a runtime is created for it,
 * its entry enters the trail as live and on screen, and its opening utterance names the canvas it
 * was asked from as its parent. Nothing else changes: the canvas the user was looking at runs on.
 * A press, an action, a shell action or a navigation lands in the canvas on screen — past or
 * live — through the host relay.
 */
import type {CompositionOperation} from '@a2uiverse/sdk';
import type {Catalog} from '@a2ui/web_core/v0_9';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import type {PressHandler, ShellAction} from '@a2uiverse/shell-catalog';
import type {A2AMessageSender, A2ASenderOptions} from '../a2a/client';
import {createSenderResolver} from '../a2a/client';
import type {CanvasRuntime} from './canvasRuntime';
import {createCanvasRuntime, trustedPageOf} from './canvasRuntime';
import type {ShellHost} from './hostRelay';
import type {TrailStore} from './trail/trailStore';
import {createTrailStore, entryOf, viewedCanvasId} from './trail/trailStore';
import {running} from './turnProgress';

export {FUNCTION_CALL_SOURCE, LOST_TURN_WORDS, UNREACHED_TURN_WORDS} from './canvasRuntime';

export interface CanvasWiring {
  trail: TrailStore;
  /** The runtime of a canvas in the trail; undefined once closed or never opened. */
  runtimeOf(id: string): CanvasRuntime | undefined;
  /** The canvas on screen: the viewed one, else live, else none. */
  viewed(): CanvasRuntime | undefined;
  /** Ask: a new canvas, its question sent, the canvas on screen its parent. */
  sendUtterance(utterance: string): Promise<void>;
  /** "Ask this again now" (phase-9 decision 7): the viewed canvas's own question asked from it. */
  askAgain(): Promise<void>;
  /** Open a canvas for a replayed beat: in the trail, on screen, nothing sent (task-9.6 decision 14). */
  openReplayCanvas(prompt: string): CanvasRuntime;
  view(id: string): void;
  returnToLive(): void;
  /** Close a canvas (task-9.6 decision 8): its runtime ends and its entry leaves the trail. */
  closeCanvas(id: string): void;
  /** A shell action raised from a shell surface: its page opens here, the canvas reports it. */
  onShellAction(action: ShellAction): void;
  /** The reader's press on the canvas on screen, or on the canvas `id` names (a beat's, task-9.8 decision 2). */
  press(operation: CompositionOperation, id?: string): Promise<void>;
  /**
   * A beat replay (task-8.6 decision 2): every stream beside the turn — a press, a failure report,
   * a shell action's report, a close — is sent to `sender` instead of the orchestrator until detached.
   */
  attachReplay(sender: A2AMessageSender): () => void;
  /** What the shell catalog takes from the page, bound through the host relay while mounted. */
  host: ShellHost;
}

export interface CanvasWiringOptions extends A2ASenderOptions {
  /** The installed catalogs, as resolved by the entry; every processor is built over them. */
  catalogs: Catalog<ReactComponentImplementation>[];
  /** Mints a canvas id; the default is a UUID. Tests pass a counter. */
  mintId?: () => string;
}

export function createCanvasWiring({
  serverUrl,
  client,
  catalogs,
  mintId = () => crypto.randomUUID(),
}: CanvasWiringOptions): CanvasWiring {
  const trail = createTrailStore();
  const runtimes = new Map<string, CanvasRuntime>();
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

  const runtimeOf = (id: string) => runtimes.get(id);
  const viewed = () => {
    const id = viewedCanvasId(trail.getState());
    return id === null ? undefined : runtimes.get(id);
  };

  /**
   * A canvas opens: its runtime, its entry — live and on screen, the canvas that was on screen
   * its parent — and the mirror of its running state into the entry's loading mark (decision 6).
   */
  const openCanvas = (question: string): {runtime: CanvasRuntime; parent?: CanvasRuntime} => {
    const parent = viewed();
    const id = mintId();
    const runtime = createCanvasRuntime({
      id,
      catalogs,
      getSender,
      getSideSender,
      onContext: contextId => trail.setContext(id, contextId),
      onTitle: title => trail.setTitle(id, title),
    });
    runtimes.set(id, runtime);
    trail.open({
      id,
      question,
      askedAt: Date.now(),
      ...(parent ? {parent: parent.id} : {}),
    });
    runtime.store.subscribe(() => trail.setLoading(id, running(runtime.store.getState())));
    return {runtime, ...(parent ? {parent} : {})};
  };

  const sendUtterance = (utterance: string) => {
    const {runtime, parent} = openCanvas(utterance);
    return runtime.open(utterance, parent?.contextId());
  };

  const askAgain = () => {
    const entry = entryOf(trail.getState(), viewedCanvasId(trail.getState()));
    return entry ? sendUtterance(entry.question) : Promise.resolve();
  };

  const openReplayCanvas = (prompt: string) => openCanvas(prompt).runtime;

  const closeCanvas = (id: string) => {
    const runtime = runtimes.get(id);
    if (!runtime) return;
    runtime.close();
    runtimes.delete(id);
    trail.close(id);
  };

  const onShellAction = (action: ShellAction) => {
    trail.openTrustedPage(trustedPageOf(action));
    viewed()?.reportShellAction(action);
  };

  const press = (operation: CompositionOperation, id?: string) =>
    (id !== undefined ? runtimes.get(id) : viewed())?.press(operation) ?? Promise.resolve();

  // Retry is a one-slot operation (phase decision 10); a line's Retry all names several sources,
  // and is sent as one Retry per source, each on its own stream (task-8.7 decision 24).
  const onPress: PressHandler = ({operation}) => {
    if (operation.kind === 'retry' && operation.sources.length > 1) {
      for (const source of operation.sources) void press({kind: 'retry', sources: [source]});
    } else void press(operation);
  };

  return {
    trail,
    runtimeOf,
    viewed,
    sendUtterance,
    askAgain,
    openReplayCanvas,
    view: trail.view,
    returnToLive: trail.returnToLive,
    closeCanvas,
    onShellAction,
    press,
    attachReplay,
    host: {
      onShellAction,
      onNavigate: cell => viewed()?.navigator.navigate(cell),
      appDisplayName: appId => viewed()?.appDisplayName(appId),
      onPress,
    },
  };
}
