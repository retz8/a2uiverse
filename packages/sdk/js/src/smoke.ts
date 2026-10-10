/**
 * The hello-fragment smoke test's checks (SPEC §9.3; task-13.2 decision 12), run by the
 * marketplace at publish and by Stellify's `preview` on the publisher's machine: the words the
 * agent is asked, the A2UI messages out of its answer, the check over the paint, and the check over
 * a sign-in agent's answer. Sending the A2A request and seeing the task end stay with each
 * transport; nothing here depends on an A2A package.
 */
import type {A2uiCatalogSchema} from './a2ui/types.js';
import {createA2uiValidator, formatA2uiFinding, type A2uiValidator} from './a2ui/validator.js';
import {readAuthRequired, AUTH_REQUIRED_STATE} from './a2uiverse.js';
import {BASIC_CATALOG_ID} from './catalog.js';
import {
  basicCatalogOptions,
  catalogOptions,
  credentialInputIn,
  describeCredentialFinding,
  type CatalogOptions,
} from './credential.js';

/** What the agent is asked when its card gives no example to ask with. */
export const SMOKE_GREETING = 'Hello! Show me what you can do.';

/** The part of a card the words read. */
export interface CardForWords {
  skills?: {examples?: string[]}[];
}

/** The card's own words — its first skill's first example — else the fixed greeting. */
export function smokeWords(card: CardForWords): string {
  const example = card.skills?.[0]?.examples?.[0];
  return typeof example === 'string' && example.trim() !== '' ? example : SMOKE_GREETING;
}

/** An A2UI server-to-client message as the wire carries it: `version` and one operation. */
export type A2uiMessage = Record<string, unknown>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * The A2UI messages a data part's body carries, in both wire forms: one message object — `version`
 * and an operation — or the spec's list under `messages`. Anything else, a `paintMeta` part among
 * it, carries none.
 */
export function a2uiMessagesIn(data: unknown): A2uiMessage[] {
  if (!isObject(data)) return [];
  if (typeof data.version === 'string') return [data];
  if (Array.isArray(data.messages)) {
    return data.messages.filter(
      (m): m is A2uiMessage => isObject(m) && typeof m.version === 'string',
    );
  }
  return [];
}

/** An A2A part as the sdk reads it: structural, the data parts' bodies alone. */
export interface PartLike {
  kind: string;
  data?: unknown;
}

/** Every A2UI message an answer's parts carry, in order. */
export function a2uiMessagesOf(parts: readonly PartLike[]): A2uiMessage[] {
  const messages: A2uiMessage[] = [];
  for (const part of parts) if (part.kind === 'data') messages.push(...a2uiMessagesIn(part.data));
  return messages;
}

/** What the paint is checked against. */
export interface PaintCheck {
  /** The app's entitlement: its published catalog ids plus the basic catalog. */
  entitlement: readonly string[];
  /** Each entitled catalog's schema; undefined for one the checker does not hold. */
  schemaFor: (catalogId: string) => A2uiCatalogSchema | undefined;
}

const OPERATIONS = ['createSurface', 'updateComponents', 'updateDataModel', 'deleteSurface'];

/**
 * The check over a paint, the live one and a captured one alike: at least one `createSurface`;
 * every surface's catalog id in the entitlement; each surface's tree against its catalog's
 * schema; no credential input. Findings name the surface; empty when the paint passes.
 */
export function checkPaint(messages: readonly A2uiMessage[], check: PaintCheck): string[] {
  const findings: string[] = [];
  const surfaces = new Map<string, {catalogId?: string; messages: A2uiMessage[]}>();
  for (const message of messages) {
    const create = message.createSurface;
    if (isObject(create) && typeof create.surfaceId === 'string') {
      const catalogId = typeof create.catalogId === 'string' ? create.catalogId : undefined;
      surfaces.set(create.surfaceId, {catalogId, messages: []});
    }
    const operation = OPERATIONS.map(key => message[key]).find(isObject);
    const surfaceId = isObject(operation) ? operation.surfaceId : undefined;
    if (typeof surfaceId === 'string') surfaces.get(surfaceId)?.messages.push(message);
  }
  if (surfaces.size === 0) return ['the answer paints nothing: no createSurface'];

  const validators = new Map<string, A2uiValidator>();
  const options = new Map<string, CatalogOptions>();
  for (const [surfaceId, {catalogId, messages: own}] of surfaces) {
    const at = `surface ${JSON.stringify(surfaceId)}`;
    if (catalogId === undefined) {
      findings.push(`${at}: createSurface names no catalogId`);
      continue;
    }
    if (!check.entitlement.includes(catalogId)) {
      findings.push(
        `${at} is painted in catalog ${JSON.stringify(catalogId)}, outside the entitlement`,
      );
      continue;
    }
    const schema = check.schemaFor(catalogId);
    if (!schema) {
      findings.push(`${at}: no schema for catalog ${JSON.stringify(catalogId)}`);
      continue;
    }
    let validator = validators.get(catalogId);
    if (!validator) {
      validator = createA2uiValidator({catalog: schema});
      validators.set(catalogId, validator);
    }
    findings.push(...validator.validate(own).map(f => `${at}: ${formatA2uiFinding(f)}`));
    let declared = options.get(catalogId);
    if (!declared) {
      declared = catalogId === BASIC_CATALOG_ID ? basicCatalogOptions() : catalogOptions(schema);
      options.set(catalogId, declared);
    }
    for (const message of own) {
      const update = message.updateComponents;
      if (!isObject(update) || !Array.isArray(update.components)) continue;
      const found = credentialInputIn(update.components, declared);
      if (found) findings.push(`${at}: a credential input: ${describeCredentialFinding(found)}`);
    }
  }
  return findings;
}

/** How a sign-in agent answered the request sent with no credential, as the transport saw it. */
export interface SignInAnswer {
  /** The HTTP status, when the agent answered at that level. */
  httpStatus?: number;
  /** The task's state, when the agent answered with a task. */
  taskState?: string;
  /** The task's status message data part, when it carried one. */
  data?: unknown;
}

/** The part of a card the sign-in check reads. */
export interface CardForSignIn {
  securitySchemes?: Record<string, unknown>;
}

/**
 * The contract for an agent whose card requires sign-in, sent the request with no credential: an
 * HTTP 401, or an `auth-required` task naming a scheme its card declares. Empty when it holds.
 */
export function checkSignInAnswer(answer: SignInAnswer, card: CardForSignIn): string[] {
  if (answer.httpStatus === 401) return [];
  if (answer.taskState === AUTH_REQUIRED_STATE) {
    const request = readAuthRequired(answer.data);
    if (!request) return ['the auth-required answer carries no security requirement'];
    const declared = Object.keys(card.securitySchemes ?? {});
    const unknown = request.security.flatMap(alternative =>
      Object.keys(alternative).filter(scheme => !declared.includes(scheme)),
    );
    return [...new Set(unknown)].map(
      scheme =>
        `the auth-required answer names scheme ${JSON.stringify(scheme)}, which the card does not declare`,
    );
  }
  const saw = [
    answer.httpStatus !== undefined ? `HTTP ${answer.httpStatus}` : undefined,
    answer.taskState !== undefined
      ? `a task in state ${JSON.stringify(answer.taskState)}`
      : undefined,
  ].filter(Boolean);
  return [
    `the agent answered ${saw.length > 0 ? saw.join(', ') : 'nothing'} instead of asking to sign in: an HTTP 401 or an auth-required task`,
  ];
}
