/**
 * The credential bar at the hub (SPEC §8, task 12.7): the guidance sentence every vendor request
 * carries, the check over a vendor's events before they are relayed, the event that takes down what
 * a refused answer had already shown, the one repair sent back to the agent, the fallback's way out,
 * and the dev fault that paints a credential input.
 */
import {randomUUID} from 'node:crypto';
import type {AgentCard, Message, Part} from '@a2a-js/sdk';
import {
  BASIC_CATALOG_ID,
  credentialInputIn,
  describeCredentialFinding,
  type CatalogOptions,
  type CredentialFinding,
} from '@a2uiverse/sdk';
import {isSecureOrLocal} from '../vault/oauth.js';
import {STAMP_KEY, type VendorEvent} from './relay.js';

/** The way out, said in the guidance sentence and again at the end of the repair. */
const WAY_OUT = 'for anything like that, offer a link to your own website instead.';

/** The guidance sentence (task-12.7 decision 6), appended to every text request the hub writes. */
export const CREDENTIAL_GUIDANCE = `Don't include any field that asks for a password, a one-time code, a PIN or a card number; ${WAY_OUT}`;

/** A request to an agent with the guidance sentence after it. */
export function withGuidance(request: string): string {
  return `${request} ${CREDENTIAL_GUIDANCE}`;
}

/**
 * The repair (task-12.7 decision 3): the reason alone — the component and the matched value — as a
 * new message in the same conversation, beside the metadata the refused send carried; the request
 * or press is not sent again.
 */
export function repairOf(sent: Message, found: CredentialFinding): Message {
  return {
    ...sent,
    messageId: randomUUID(),
    parts: [
      {
        kind: 'text',
        text: `Your last answer included a field that asks for a password, a one-time code, a PIN or a card number: ${describeCredentialFinding(found)}. Answer the same request again without it; ${WAY_OUT}`,
      },
    ],
  };
}

/**
 * The first credential input among the components an event paints, if any, each matched against
 * the options of the catalog its surface was created in (task-12.7 decision 1). `catalogs` holds
 * the source's surfaces by the vendor's own ids, each with its catalog: a create in the event is
 * learned before the updates after it are read.
 */
export function credentialIn(
  event: VendorEvent,
  catalogs: Map<string, string>,
  optionsFor: (catalogId: string | undefined) => CatalogOptions,
): CredentialFinding | undefined {
  for (const message of a2uiMessagesOf(event)) {
    const create = message.createSurface;
    if (
      isObject(create) &&
      typeof create.surfaceId === 'string' &&
      typeof create.catalogId === 'string'
    ) {
      catalogs.set(create.surfaceId, create.catalogId);
    }
    const update = message.updateComponents;
    if (!isObject(update) || !Array.isArray(update.components)) continue;
    const surfaceId = typeof update.surfaceId === 'string' ? update.surfaceId : undefined;
    const catalogId = surfaceId !== undefined ? catalogs.get(surfaceId) : undefined;
    const found = credentialInputIn(update.components, optionsFor(catalogId));
    if (found) return found;
  }
  return undefined;
}

/** A surface an answer created as it was relayed, with the A2UI version it was created under. */
export interface CreatedSurface {
  surfaceId: string;
  version: string;
}

/** The surfaces an event creates, by the vendor's own ids. */
export function createdIn(event: VendorEvent): CreatedSurface[] {
  const created: CreatedSurface[] = [];
  for (const message of a2uiMessagesOf(event)) {
    const create = message.createSurface;
    if (!isObject(create) || typeof create.surfaceId !== 'string') continue;
    const version = typeof message.version === 'string' ? message.version : 'v0.9';
    created.push({surfaceId: create.surfaceId, version});
  }
  return created;
}

/**
 * What a refused answer had already shown, taken down (task-12.7 decisions 2, 7): a `deleteSurface`
 * per surface it created, the stamp marked `refused` so the client keeps none of them as a paint to
 * return to. Relayed and composed like any vendor event.
 */
export function takeDown(shown: readonly CreatedSurface[]): VendorEvent {
  const taskId = randomUUID();
  const contextId = randomUUID();
  return {
    kind: 'status-update',
    taskId,
    contextId,
    final: false,
    status: {
      state: 'working',
      message: {
        kind: 'message',
        messageId: randomUUID(),
        role: 'agent',
        taskId,
        contextId,
        parts: shown.map(({surfaceId, version}): Part => ({
          kind: 'data',
          data: {version, deleteSurface: {surfaceId}},
        })),
      },
    },
    metadata: {[STAMP_KEY]: {refused: true}},
  };
}

/**
 * The fallback's way out (task-12.2 decision 7): the card's `provider.url`, otherwise its
 * `documentationUrl` — https, or a local address.
 */
export function continueUrlOf(card: AgentCard | null | undefined): string | undefined {
  const candidates = [card?.provider?.url, card?.documentationUrl];
  return candidates.find(
    (url): url is string => typeof url === 'string' && url !== '' && isSecureOrLocal(url),
  );
}

/** The `credential` fault's surface: in the basic catalog, which every app may paint in. */
export const CREDENTIAL_FAULT_SURFACE = 'credential-fault';

/**
 * The `credential` fault (task-12.7 decision 9): a surface of its own in the basic catalog, an
 * obscured `TextField` its root, added to the first event that carries an A2UI message — whatever
 * catalog the app paints in, the bar finds it. The same event back when it carries none.
 */
export function withCredentialField(event: VendorEvent): VendorEvent {
  const existing = a2uiMessagesOf(event).find(message => typeof message.version === 'string');
  if (!existing) return event;
  const version = existing.version as string;
  const added: Part[] = [
    {
      kind: 'data',
      data: {
        version,
        createSurface: {surfaceId: CREDENTIAL_FAULT_SURFACE, catalogId: BASIC_CATALOG_ID},
      },
    },
    {
      kind: 'data',
      data: {
        version,
        updateComponents: {
          surfaceId: CREDENTIAL_FAULT_SURFACE,
          components: [
            {id: 'root', component: 'TextField', label: 'Password', variant: 'obscured'},
          ],
        },
      },
    },
  ];
  if (event.kind === 'message') return {...event, parts: [...event.parts, ...added]};
  if (event.kind === 'artifact-update') {
    return {...event, artifact: {...event.artifact, parts: [...event.artifact.parts, ...added]}};
  }
  const message = event.status.message!;
  return {
    ...event,
    status: {...event.status, message: {...message, parts: [...message.parts, ...added]}},
  };
}

/** Every A2UI message an event carries, in both wire forms: one per part, or a `messages` list. */
function a2uiMessagesOf(event: VendorEvent): Record<string, unknown>[] {
  const parts =
    event.kind === 'message'
      ? event.parts
      : event.kind === 'artifact-update'
        ? event.artifact.parts
        : (event.status.message?.parts ?? []);
  const messages: Record<string, unknown>[] = [];
  for (const part of parts) {
    if (part.kind !== 'data') continue;
    const list = Array.isArray(part.data.messages) ? part.data.messages : [part.data];
    for (const message of list) if (isObject(message)) messages.push(message);
  }
  return messages;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
