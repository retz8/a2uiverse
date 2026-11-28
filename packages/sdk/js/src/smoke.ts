/**
 * The hello-fragment smoke test's checks (SPEC §9.3; task-13.2 decision 12), run by the
 * marketplace at publish and by Stellify's `preview` on the publisher's machine: the words the
 * agent is asked, the check over the paint, and the check over a sign-in agent's answer. Sending the A2A request and seeing the answer end stay with the
 * smoke request's transport; nothing here depends on an A2A package.
 */
import {Catalog, type CatalogApi} from '@a2ui/web_core/catalog';
import {getComponentReferences} from '@a2ui/web_core/validation';
import {readA2uiStamp, A2UI_VERSION} from './a2ui/stamp.js';
import type {A2uiCatalogSchema} from './a2ui/types.js';
import type {A2uiMessage} from './a2uiPart.js';
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
import {catalogsNamed, describeCatalogOutside} from './entitlementRule.js';

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

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** What the paint is checked against. */
export interface PaintCheck {
  /** The app's entitlement: its published catalog ids plus the basic catalog. */
  entitlement: readonly string[];
  /** Each entitled catalog's schema; undefined for one the checker does not hold. */
  schemaFor: (catalogId: string) => A2uiCatalogSchema | undefined;
}

const OPERATIONS = ['createSurface', 'updateComponents', 'updateDataModel', 'deleteSurface'];

/** A message and its place in the answer. */
type Placed = readonly [at: number, message: A2uiMessage];

const ROOT_ID = 'root';

/** What `getComponentReferences` reads a component's child references by. */
type RefSource = Parameters<typeof getComponentReferences>[1];

/** A component's children, read in the catalog it is in. */
type ChildrenOf = (component: Record<string, unknown>) => Iterable<string>;

/**
 * A surface's messages as the renderer holds them once the answer ends, `updateComponents`
 * replacing each component by its id: every other message as sent, and in the place of the first
 * component update one update carrying the tree drawn from the root. A tree streamed as it is
 * written — every update sending it again, a component half-written until a later copy completes
 * it, a placeholder standing where a child has not arrived — is judged as it stands at the end.
 * With no root, every component is kept, so its absence is a finding.
 */
function settled(own: readonly Placed[], childrenOf: ChildrenOf): Placed[] {
  const byId = new Map<string, Record<string, unknown>>();
  const loose: unknown[] = [];
  const kept: Placed[] = [];
  let first: {index: number; update: Record<string, unknown>} | undefined;
  for (const [at, message] of own) {
    const update = message.updateComponents;
    if (!isObject(update) || !Array.isArray(update.components)) {
      kept.push([at, message]);
      continue;
    }
    if (!first) {
      first = {index: kept.length, update};
      kept.push([at, message]);
    }
    for (const component of update.components) {
      if (isObject(component) && typeof component.id === 'string')
        byId.set(component.id, component);
      else loose.push(component);
    }
  }
  if (!first) return kept;
  const drawn = new Set<string>();
  const visit = (id: string) => {
    const component = byId.get(id);
    if (!component || drawn.has(id)) return;
    drawn.add(id);
    for (const ref of childrenOf(component)) visit(ref);
  };
  visit(ROOT_ID);
  const tree = byId.has(ROOT_ID)
    ? [...byId.values()].filter(c => drawn.has(c.id as string))
    : [...byId.values()];
  const components = [...tree, ...loose];
  const [at, message] = kept[first.index]!;
  kept[first.index] = [at, {...message, updateComponents: {...first.update, components}}];
  return kept;
}

/** The check's verdict over a paint: what it found, and the paint it judged. */
export interface PaintJudgement {
  /** Each names its surface, or the stamp; empty when the paint passes. */
  findings: string[];
  /**
   * The settled paint, what a preview stores: each surface as it stands when the answer ends — its
   * component updates collapsed into one in the place of the first, carrying each component's last
   * copy drawn from the root — every other message of it as sent, in the order sent. A surface
   * created again stands from its last creation; a message for no surface created before it is
   * left out, as the check never judged it. A paint sent whole is handed back as it is. Empty when
   * the paint is in another A2UI version.
   */
  paint: A2uiMessage[];
}

/**
 * The check over a paint, the live one and a captured one alike (task-21.10 decisions 7 and 8).
 * The stamp is judged first: a paint stamped other than 1.0 is in another version, one finding
 * per stamp, and nothing else is judged. Then at least one `createSurface`; every catalog the
 * paint names inside the entitlement, in each of the four places the entitlement rule reads, and
 * held; each surface's tree, as it stands when the answer ends, through the validator over the
 * app's entitled catalogs, each component judged against its own; no credential input in any
 * message, each component read against its own catalog's options. Findings name the surface;
 * empty when the paint passes. The paint judged is handed back settled beside them.
 */
export function checkPaint(messages: readonly A2uiMessage[], check: PaintCheck): PaintJudgement {
  const stamps = [
    ...new Set(
      messages
        .map(message => readA2uiStamp(message))
        .filter(stamp => stamp !== undefined && !stamp.current)
        .map(stamp => stamp!.stamp),
    ),
  ];
  if (stamps.length > 0) {
    return {
      findings: stamps.map(
        stamp => `the answer paints in A2UI ${JSON.stringify(stamp)}, not "${A2UI_VERSION}"`,
      ),
      paint: [],
    };
  }

  const findings: string[] = [];
  const surfaces = new Map<string, {catalogId?: string; own: Placed[]}>();
  for (const [at, message] of messages.entries()) {
    const create = message.createSurface;
    if (isObject(create) && typeof create.surfaceId === 'string') {
      const catalogId = typeof create.catalogId === 'string' ? create.catalogId : undefined;
      surfaces.set(create.surfaceId, {catalogId, own: []});
    }
    const operation = OPERATIONS.map(key => message[key]).find(isObject);
    const surfaceId = isObject(operation) ? operation.surfaceId : undefined;
    if (typeof surfaceId === 'string') surfaces.get(surfaceId)?.own.push([at, message]);
  }
  if (surfaces.size === 0) {
    return {findings: ['the answer paints nothing: no createSurface'], paint: []};
  }

  const entitled = new Set(check.entitlement);
  const schemas = new Map<string, A2uiCatalogSchema>();
  for (const id of check.entitlement) {
    const schema = check.schemaFor(id);
    if (schema) schemas.set(id, {...schema, catalogId: id});
  }
  const loaded = new Map<string, CatalogApi | Error>();
  const catalogOf = (id: string): CatalogApi | Error | undefined => {
    const schema = schemas.get(id);
    if (!schema) return undefined;
    let catalog = loaded.get(id);
    if (!catalog) {
      try {
        catalog = Catalog.fromJson(schema, A2UI_VERSION, id);
      } catch (error) {
        catalog = error instanceof Error ? error : new Error(String(error));
      }
      loaded.set(id, catalog);
    }
    return catalog;
  };
  const options = new Map<string, CatalogOptions>();
  const optionsOf = (id: string): CatalogOptions => {
    let declared = options.get(id);
    if (!declared) {
      declared = id === BASIC_CATALOG_ID ? basicCatalogOptions() : catalogOptions(schemas.get(id)!);
      options.set(id, declared);
    }
    return declared;
  };

  // The paint judged as each surface stands when the answer ends.
  const named = catalogsNamed(messages, {schemaFor: id => schemas.get(id)});
  const placed: Placed[] = [];
  // One validator over every catalog the app is entitled to and the checker holds.
  let validator: A2uiValidator | undefined;
  for (const [surfaceId, {catalogId, own}] of surfaces) {
    const at = `surface ${JSON.stringify(surfaceId)}`;
    const ids = new Set(own.map(([index]) => index));
    const mine = named.filter(
      n => n.surfaceId === surfaceId && ids.has(Number(n.path.split('/')[1])),
    );
    const outside = mine.filter(n => !entitled.has(n.catalogId));
    findings.push(...outside.map(n => `${at}: ${describeCatalogOutside(n)}`));
    const unheld = [...new Set(mine.map(n => n.catalogId))].filter(
      id => entitled.has(id) && !schemas.has(id),
    );
    findings.push(...unheld.map(id => `${at}: no schema for catalog ${JSON.stringify(id)}`));
    const broken = [...new Set(mine.map(n => n.catalogId))].flatMap(id => {
      const catalog = catalogOf(id);
      return catalog instanceof Error
        ? [`${at}: the catalog does not load: ${catalog.message}`]
        : [];
    });
    findings.push(...broken);
    if (outside.length > 0 || unheld.length > 0 || broken.length > 0) {
      placed.push(...own);
      continue;
    }

    const fallback = catalogId !== undefined ? catalogOf(catalogId) : undefined;
    const catalogFor = (component: Record<string, unknown>): CatalogApi | undefined => {
      const name = component['@catalogId'];
      const catalog = typeof name === 'string' ? catalogOf(name) : fallback;
      return catalog instanceof Error ? undefined : catalog;
    };
    const surface = settled(own, component => {
      const catalog = catalogFor(component);
      return catalog
        ? [...getComponentReferences(component, catalog as unknown as RefSource)].map(([id]) => id)
        : [];
    });
    placed.push(...surface);
    validator ??= createA2uiValidator({catalogs: [...schemas.values()]});
    findings.push(
      ...validator
        .validate(surface.map(([, message]) => message))
        .map(f => `${at}: ${formatA2uiFinding(f)}`),
    );

    for (const [, message] of own) {
      const update = message.updateComponents ?? message.createSurface;
      if (!isObject(update) || !Array.isArray(update.components)) continue;
      for (const component of update.components) {
        if (!isObject(component)) continue;
        const name = component['@catalogId'];
        const id = typeof name === 'string' ? name : catalogId;
        const declared = id !== undefined && schemas.has(id) ? optionsOf(id) : new Map();
        const found = credentialInputIn([component], declared);
        if (found) findings.push(`${at}: a credential input: ${describeCredentialFinding(found)}`);
      }
    }
  }

  const paint = placed.sort(([a], [b]) => a - b).map(([, message]) => message);
  return {findings, paint};
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
    const unknown = request.securityRequirements.flatMap(alternative =>
      Object.keys(alternative.schemes).filter(scheme => !declared.includes(scheme)),
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
