import type {A2uiClientDataModel, A2uiMessage} from '@a2ui/web_core/v0_9';
import type {CompositionStamp, PaintMeta} from '@a2uiverse/sdk';
import type {GetSender} from './client';
import {sendAndApply} from './client';
import {buildTextMessageParams} from './messages';
import type {A2ASession} from './session';

export interface StreamUserMessageOptions {
  getSender: GetSender;
  /** Applies the streamed A2UI messages into the processor, with their event's composition stamp. */
  apply: (messages: A2uiMessage[], stamp?: CompositionStamp) => void;
  /**
   * The canvas's session: a question opens a canvas of its own, so the message carries no
   * contextId — the orchestrator mints one, captured here from the first event (task-9.2
   * decision 1).
   */
  session?: A2ASession;
  /**
   * Supplies the current client data model of `sendDataModel`-flagged surfaces
   * (processor.getClientDataModel); attached as message metadata when it reports one.
   */
  getClientDataModel?: () => A2uiClientDataModel | undefined;
  /**
   * Called when the send fails. Without it a failure is invisible outside the console —
   * the host needs this to tell the user the turn was lost.
   */
  onError?: (error: unknown) => void;
  /**
   * Called for each plain-text part the agent sends. The agent answers in prose when it could not
   * build a surface; without this the turn leaves nothing on screen.
   */
  onAgentText?: (text: string, stamp?: CompositionStamp) => void;
  /**
   * Aborts the underlying request (last-intent-wins cancel). An abort resolves silently —
   * a canceled turn is not an error, so `onError` is not called for it.
   */
  signal?: AbortSignal;
  /** The canvas the question was asked from — its context — named as the parent; absent on a root. */
  parent?: string;
  /** Called for each paintMeta shell object the agent streams (title / question marker). */
  onPaintMeta?: (meta: PaintMeta) => void;
  /** The catalogs the client can render; advertised as `a2uiClientCapabilities` when given. */
  supportedCatalogIds?: string[];
  /** Called once, on the stream's first event: the host tells a lost turn from one that never reached. */
  onFirstEvent?: () => void;
}

/**
 * Ship one user prompt to the agent and feed the streamed A2UI back through `apply`. Resolves
 * when the stream closes — awaiting this is the pending state. Never throws: wire/extract
 * failures are caught, logged, reported through `onError`, and `apply` is skipped.
 */
export async function streamUserMessage(
  text: string,
  opts: StreamUserMessageOptions,
): Promise<void> {
  const {getSender, apply, session, getClientDataModel, onError, onAgentText, signal} = opts;
  try {
    const sender = await getSender();
    await sendAndApply(
      sender,
      buildTextMessageParams(text, getClientDataModel?.(), opts.supportedCatalogIds, opts.parent),
      {
        apply,
        session,
        onAgentText,
        signal,
        onPaintMeta: opts.onPaintMeta,
        ...(opts.onFirstEvent ? {onFirstEvent: opts.onFirstEvent} : {}),
      },
    );
  } catch (err) {
    if (signal?.aborted) return;
    console.error('[A2UI:a2a]', err);
    onError?.(err);
  }
}
