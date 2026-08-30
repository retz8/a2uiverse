import type {
  ActionListener,
  A2uiClientAction,
  A2uiClientDataModel,
  A2uiMessage,
} from '@a2ui/web_core/v0_9';
import type {A2AMessageSender, GetSender} from './client';
import {createSenderResolver, sendAndApply} from './client';
import {buildActionMessageParams} from './messages';
import type {A2ASession} from './session';

export interface A2AActionHandlerOptions {
  /** Applies the server-returned A2UI messages back into the processor. */
  apply: (messages: A2uiMessage[]) => void;
  /** Base server URL, e.g. http://localhost:10002. Resolves the agent card. */
  serverUrl?: string;
  /** Pre-resolved / fake sender. Takes precedence over serverUrl (tests). */
  client?: A2AMessageSender;
  /** Shared lazy sender; takes precedence over serverUrl/client (shares one card fetch). */
  getSender?: GetSender;
  /** Conversation session; threads the contextId across turns when given. */
  session?: A2ASession;
  /** Called when an action send begins — lets the host show a loading affordance. */
  onActionStart?: (action: A2uiClientAction) => void;
  /** Called when the action send settles (success or caught failure); pairs with onActionStart. */
  onActionSettled?: () => void;
  /**
   * Called when the action send fails, before `onActionSettled`. Without it a failed action
   * is indistinguishable from one that produced nothing — the spinner simply clears.
   */
  onError?: (error: unknown) => void;
  /**
   * Called for each plain-text part the agent sends. An action can fail to produce a surface
   * exactly as a prompt can, and the reply is prose; without this the click leaves nothing.
   */
  onAgentText?: (text: string) => void;
  /**
   * Supplies the current client data model of `sendDataModel`-flagged surfaces
   * (processor.getClientDataModel); attached as message metadata when it reports one.
   */
  getClientDataModel?: () => A2uiClientDataModel | undefined;
  /** The catalogs the client can render; advertised as `a2uiClientCapabilities` when given. */
  supportedCatalogIds?: string[];
}

/**
 * Builds an ActionListener that ships an `event` action to an A2A agent over the event stream and
 * feeds the streamed A2UI back through `apply`. Transport-only: no React or fixture knowledge.
 * The returned listener never throws — wire/extract failures are caught, logged, and reported
 * through `onError`, and `apply` is skipped.
 */
export function createA2AActionHandler(opts: A2AActionHandlerOptions): ActionListener {
  const {
    apply,
    serverUrl,
    client,
    session,
    onActionStart,
    onActionSettled,
    onError,
    onAgentText,
    getClientDataModel,
  } = opts;
  const getSender = opts.getSender ?? createSenderResolver({serverUrl, client});

  return async action => {
    onActionStart?.(action);
    try {
      const sender = await getSender();
      await sendAndApply(
        sender,
        buildActionMessageParams(
          action,
          session?.get(),
          getClientDataModel?.(),
          undefined,
          opts.supportedCatalogIds,
        ),
        {apply, session, onAgentText},
      );
    } catch (err) {
      console.error('[A2UI:a2a]', err);
      onError?.(err);
    } finally {
      onActionSettled?.();
    }
  };
}
