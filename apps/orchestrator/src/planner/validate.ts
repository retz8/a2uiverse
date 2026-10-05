import {Ajv2020} from 'ajv/dist/2020.js';
import {
  formatA2uiFinding,
  parseSourceId,
  schemaErrors,
  type A2uiComponent,
  type A2uiFinding,
  type A2uiValidator,
} from '@a2uiverse/sdk';
import {SHELL_SOURCE_ID} from '../registry/types.js';
import {
  isAccountChoice,
  isGap,
  isSourceDispatch,
  LAYOUT_SURFACE_SCHEMA,
  type LayoutSurface,
} from './document.js';

/**
 * The Planner's one validator (task-6.4 decision 10), in order: the output schema; the tree as a
 * surface through the sdk's A2UI validator against the layout surface's pruned catalog — known
 * components and props, the root, dangling children, cycles, orphans, so `Frame`, `Attribution`
 * and any action but the shell's two are unknown; slot accounting — exactly one `Slot` per
 * dispatch entry matched by `source` or by the exact `gap`, none unmatched, a merged view only
 * with two or more vendor sources, every source on this turn's shortlist and none twice, no blank
 * request; the merged view's `columns`, `columnSources` and `join` on `shell` alone, the join's
 * home and nouns naming exactly the dispatched vendor sources, a column mark beside every column
 * naming a dispatched vendor source or null (task-8.3 decision 12); what the Planner may write on
 * a `Slot` (`source`, `gap` or `chooseAccount`, and a positive `weight`; the rest are the
 * painter's); and a data model of literals. One line per finding, with its path, so the retry can
 * hand them back.
 *
 * Accounts (task 12.6): before the checks, a bare app id naming an app with one source is
 * rewritten to that source wherever the plan names it, and an account choice on such an app to a
 * dispatch to it (decisions 2, 7); the accepted document is the rewritten one. An account choice
 * names a shortlisted app with two or more accounts, once, not also dispatched to, its request not
 * blank; it holds one `Slot` by its app, and is no vendor source of a merged view (decision 6).
 */
export interface LayoutChecks {
  /** The sdk's A2UI validator over the layout surface's pruned catalog. */
  tree: A2uiValidator;
  /**
   * The sources of the apps on this turn's shortlist — every account of each (task-12.4
   * decision 2) — the only sources the dispatch may name.
   */
  shortlist: readonly string[];
}

export type LayoutValidation = {ok: true; document: LayoutSurface} | {ok: false; errors: string[]};

/** The id prefix the painter uses for the wrappers it adds; a model id must not collide with it. */
export const PAINTER_ID_PREFIX = 'attribution-';

const outputSchema = new Ajv2020({allErrors: true, strict: true, allowUnionTypes: true}).compile(
  LAYOUT_SURFACE_SCHEMA,
);

export function validateLayoutSurface(input: unknown, checks: LayoutChecks): LayoutValidation {
  const schema = schemaErrors(outputSchema, input);
  if (schema.length > 0) return {ok: false, errors: schema};
  const document = withAccounts(input as LayoutSurface, checks.shortlist);
  const errors = [
    ...treeErrors(document, checks.tree),
    ...dispatchErrors(document, checks.shortlist),
    ...slotErrors(document),
    ...addAccountErrors(document, checks.shortlist),
    ...dataModelErrors(document.dataModel),
  ];
  return errors.length === 0 ? {ok: true, document} : {ok: false, errors};
}

/** The app a source belongs to: the bare app id for an app needing no sign-in. */
const appOf = (source: string): string => parseSourceId(source)?.appId ?? source;

/** The shortlist's sources of one app. */
const sourcesOf = (shortlist: readonly string[], appId: string): string[] =>
  shortlist.filter(source => source !== SHELL_SOURCE_ID && appOf(source) === appId);

/**
 * The plan with a bare app id rewritten to the app's one source wherever it names it — the
 * dispatch, the column marks, the join, the `Slot`s — and an account choice on an app with one
 * source rewritten to a dispatch to it (task-12.6 decisions 2, 7). Unchanged when nothing applies.
 */
function withAccounts(document: LayoutSurface, shortlist: readonly string[]): LayoutSurface {
  const only = new Map<string, string>();
  for (const appId of new Set(shortlist.map(appOf))) {
    const own = sourcesOf(shortlist, appId);
    if (own.length === 1 && own[0] !== appId) only.set(appId, own[0]!);
  }
  const bare = (source: string): string =>
    shortlist.includes(source) ? source : (only.get(source) ?? source);
  const choiceSource = (appId: string): string | undefined => {
    const own = sourcesOf(shortlist, appId);
    return own.length === 1 ? own[0] : undefined;
  };
  const rewritten = structuredClone(document);
  rewritten.dispatch = rewritten.dispatch.map(entry => {
    if (isAccountChoice(entry)) {
      const source = choiceSource(entry.chooseAccount);
      return source === undefined ? entry : {source, request: entry.request};
    }
    if (!isSourceDispatch(entry)) return entry;
    return {
      ...entry,
      source: bare(entry.source),
      ...(entry.columnSources
        ? {columnSources: entry.columnSources.map(mark => (mark === null ? null : bare(mark)))}
        : {}),
      ...(entry.join
        ? {
            join: {
              ...entry.join,
              home: entry.join.home === null ? null : bare(entry.join.home),
              nouns: Object.fromEntries(
                Object.entries(entry.join.nouns).map(([source, noun]) => [bare(source), noun]),
              ),
            },
          }
        : {}),
    };
  });
  rewritten.tree.components = rewritten.tree.components.map(component => {
    if (component.component !== 'Slot') return component;
    if (typeof component.source === 'string') return {...component, source: bare(component.source)};
    if (typeof component.chooseAccount !== 'string') return component;
    const source = choiceSource(component.chooseAccount);
    if (source === undefined) return component;
    const {chooseAccount: _chosen, ...rest} = component;
    return {...rest, source};
  });
  return JSON.stringify(rewritten) === JSON.stringify(document) ? document : rewritten;
}

const TREE_SURFACE = 'main';

/** The tree as the surface it paints, through the A2UI validator; paths rebased onto `/tree`. */
function treeErrors(document: LayoutSurface, validator: A2uiValidator): string[] {
  const findings = validator.validate([
    {version: 'v0.9', createSurface: {surfaceId: TREE_SURFACE, catalogId: 'shell'}},
    {
      version: 'v0.9',
      updateComponents: {surfaceId: TREE_SURFACE, components: document.tree.components},
    },
  ]);
  return findings.map((finding: A2uiFinding) => {
    const components = '/1/updateComponents/components';
    const path = finding.path?.startsWith(components)
      ? `/tree/components${finding.path.slice(components.length)}`
      : '/tree';
    return formatA2uiFinding({...finding, path});
  });
}

function dispatchErrors(document: LayoutSurface, shortlist: readonly string[]): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  const vendorSources: string[] = [];
  const choices: {i: number; appId: string}[] = [];
  let merged = false;
  document.dispatch.forEach((entry, i) => {
    if (isGap(entry)) {
      if (seen.has(`gap:${entry.gap}`))
        errors.push(`/dispatch/${i}/gap: '${entry.gap}' is named twice`);
      seen.add(`gap:${entry.gap}`);
      return;
    }
    if (isAccountChoice(entry)) {
      const appId = entry.chooseAccount;
      if (seen.has(`choice:${appId}`)) {
        errors.push(`/dispatch/${i}/chooseAccount: '${appId}' is asked about twice`);
      } else if (sourcesOf(shortlist, appId).length === 0) {
        errors.push(`/dispatch/${i}/chooseAccount: '${appId}' is not on this turn's shortlist`);
      } else choices.push({i, appId});
      seen.add(`choice:${appId}`);
      if (entry.request.trim() === '') {
        errors.push(
          `/dispatch/${i}/request: the request for the account choice on '${appId}' is blank`,
        );
      }
      return;
    }
    const {source, request, columns, columnSources, join} = entry;
    if (seen.has(source)) errors.push(`/dispatch/${i}/source: '${source}' is dispatched twice`);
    seen.add(source);
    if (source === SHELL_SOURCE_ID) merged = true;
    else if (!shortlist.includes(source)) {
      const own = sourcesOf(shortlist, source);
      errors.push(
        own.length > 1
          ? `/dispatch/${i}/source: '${source}' has more than one account — name one of ${own.join(', ')}, or ask with chooseAccount`
          : `/dispatch/${i}/source: '${source}' is not on this turn's shortlist`,
      );
    } else vendorSources.push(source);
    if (request.trim() === '') {
      errors.push(`/dispatch/${i}/request: the request for '${source}' is blank`);
    }
    if (source !== SHELL_SOURCE_ID) {
      if (columns !== undefined) {
        errors.push(
          `/dispatch/${i}/columns: only the merged view (${SHELL_SOURCE_ID}) has columns`,
        );
      }
      if (join !== undefined) {
        errors.push(`/dispatch/${i}/join: only the merged view (${SHELL_SOURCE_ID}) states a join`);
      }
      if (columnSources !== undefined) {
        errors.push(
          `/dispatch/${i}/columnSources: only the merged view (${SHELL_SOURCE_ID}) marks columns`,
        );
      }
    }
    columns?.forEach((header, c) => {
      if (header.trim() === '') errors.push(`/dispatch/${i}/columns/${c}: the header is blank`);
    });
  });
  for (const {i, appId} of choices) {
    const dispatched = vendorSources.filter(source => appOf(source) === appId);
    if (dispatched.length > 0) {
      errors.push(
        `/dispatch/${i}/chooseAccount: '${appId}' is both asked about and dispatched to ${dispatched.join(', ')}; ask, or dispatch, not both`,
      );
    }
  }
  if (merged && vendorSources.length < 2) {
    errors.push(
      `/dispatch: a merged view (source ${SHELL_SOURCE_ID}) needs two or more vendor sources; ${vendorSources.length} dispatched`,
    );
  }
  errors.push(...joinErrors(document, vendorSources));
  errors.push(...columnMarkErrors(document, vendorSources));
  return errors;
}

/** Every planned column marked, to a dispatched vendor source or null (task-8.3 decision 12). */
function columnMarkErrors(document: LayoutSurface, vendorSources: readonly string[]): string[] {
  const i = document.dispatch.findIndex(
    entry => isSourceDispatch(entry) && entry.source === SHELL_SOURCE_ID,
  );
  const shell = document.dispatch[i];
  if (shell === undefined || !isSourceDispatch(shell)) return [];
  const {columns, columnSources} = shell;
  if (columns === undefined) {
    return columnSources === undefined
      ? []
      : [`/dispatch/${i}/columnSources: marks columns the entry does not have; write columns`];
  }
  if (columnSources === undefined) {
    return [
      `/dispatch/${i}/columnSources: required beside columns — per column, the dispatched agent whose values it shows, or null`,
    ];
  }
  const errors: string[] = [];
  if (columnSources.length !== columns.length) {
    errors.push(
      `/dispatch/${i}/columnSources: ${columnSources.length} marks for ${columns.length} columns; one per column`,
    );
  }
  columnSources.forEach((mark, c) => {
    if (mark !== null && !vendorSources.includes(mark)) {
      errors.push(`/dispatch/${i}/columnSources/${c}: '${mark}' is not a dispatched agent`);
    }
  });
  return errors;
}

/**
 * The merged view's join names its kind — a home source among the dispatched, or null with the
 * entity's noun for a union (task-8.7 decision 30) — and a noun for each dispatched vendor
 * source, and nothing else.
 */
function joinErrors(document: LayoutSurface, vendorSources: readonly string[]): string[] {
  const i = document.dispatch.findIndex(
    entry => isSourceDispatch(entry) && entry.source === SHELL_SOURCE_ID,
  );
  const shell = document.dispatch[i];
  if (shell === undefined || !isSourceDispatch(shell) || shell.join === undefined) return [];
  const {home, entity, nouns} = shell.join;
  const errors: string[] = [];
  if (home === null) {
    if (entity === undefined || entity.trim() === '') {
      errors.push(
        `/dispatch/${i}/join/entity: a union join (home null) names the thing its rows are — the plural noun, as the user says it`,
      );
    }
  } else if (!vendorSources.includes(home)) {
    errors.push(`/dispatch/${i}/join/home: '${home}' is not a dispatched source`);
  }
  for (const source of vendorSources) {
    if (!(source in nouns)) {
      errors.push(`/dispatch/${i}/join/nouns: no noun for '${source}', a dispatched source`);
    }
  }
  for (const [source, noun] of Object.entries(nouns)) {
    if (!vendorSources.includes(source)) {
      errors.push(`/dispatch/${i}/join/nouns/${source}: '${source}' is not a dispatched source`);
    } else if (noun.trim() === '') {
      errors.push(`/dispatch/${i}/join/nouns/${source}: the noun is blank`);
    }
  }
  return errors;
}

const PAINTER_PROPS = [
  'state',
  'label',
  'content',
  'columns',
  'columnSources',
  'join',
  'noun',
  'failure',
  'declined',
  'collapse',
  'merged',
  'late',
  'working',
  'callFailed',
  'retrying',
  'accounts',
] as const;

/** Slot accounting against the dispatch list, and what the Planner may write on a `Slot`. */
function slotErrors(document: LayoutSurface): string[] {
  const errors: string[] = [];
  const wanted = new Map<string, string>();
  for (const entry of document.dispatch) {
    if (isGap(entry)) wanted.set(`gap:${entry.gap}`, `gap '${entry.gap}'`);
    else if (isAccountChoice(entry)) {
      wanted.set(`choice:${entry.chooseAccount}`, `the account choice on '${entry.chooseAccount}'`);
    } else wanted.set(`source:${entry.source}`, `source '${entry.source}'`);
  }
  const held = new Set<string>();
  for (const component of document.tree.components) {
    if (component.id.startsWith(PAINTER_ID_PREFIX)) {
      errors.push(
        `/tree (${component.id}): ids beginning with '${PAINTER_ID_PREFIX}' are the shell's`,
      );
    }
    if (component.component !== 'Slot') continue;
    const slot = component as A2uiComponent & {
      source?: unknown;
      gap?: unknown;
      chooseAccount?: unknown;
      weight?: unknown;
    };
    const key =
      typeof slot.source === 'string'
        ? `source:${slot.source}`
        : typeof slot.gap === 'string'
          ? `gap:${slot.gap}`
          : typeof slot.chooseAccount === 'string'
            ? `choice:${slot.chooseAccount}`
            : undefined;
    if (key !== undefined) {
      const name = key.startsWith('gap:')
        ? `gap '${slot.gap}'`
        : key.startsWith('choice:')
          ? `the account choice on '${slot.chooseAccount}'`
          : `source '${slot.source}'`;
      if (!wanted.has(key)) {
        errors.push(`/tree (${slot.id}): Slot holds ${name}, which the dispatch does not name`);
      } else if (held.has(key)) {
        errors.push(`/tree (${slot.id}): a second Slot holds ${name}; one Slot per dispatch entry`);
      }
      held.add(key);
    }
    if (PAINTER_PROPS.some(prop => prop in slot)) {
      errors.push(
        `/tree (${slot.id}): Slot.${PAINTER_PROPS.filter(prop => prop in slot).join(', Slot.')} ${PAINTER_PROPS.filter(prop => prop in slot).length > 1 ? 'are' : 'is'} written by the shell; write only source, gap or chooseAccount, and weight — the merged view's columns, column marks and join go on its dispatch entry`,
      );
    }
    if (slot.weight !== undefined && !(typeof slot.weight === 'number' && slot.weight > 0)) {
      errors.push(
        `/tree (${slot.id}): Slot.weight must be a positive number; got ${JSON.stringify(slot.weight)}`,
      );
    }
  }
  for (const [key, name] of wanted) {
    if (!held.has(key)) errors.push(`/tree: no Slot holds ${name}, which the dispatch names`);
  }
  return errors;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Add an account names the app id of a shortlisted app whose card asks sign-in —
 * one whose sources are accounts (task-12.2 decision 11, task-12.6 decision 8).
 */
function addAccountErrors(document: LayoutSurface, shortlist: readonly string[]): string[] {
  const errors: string[] = [];
  for (const component of document.tree.components) {
    const action = (component as {action?: unknown}).action;
    const call =
      isRecord(action) && isRecord(action.functionCall) ? action.functionCall : undefined;
    if (call?.call !== 'addAccount') continue;
    const app = isRecord(call.args) ? call.args.app : undefined;
    // A bound app is the catalog schema's to refuse.
    if (typeof app !== 'string') continue;
    const own = sourcesOf(shortlist, app);
    if (own.length === 0 || parseSourceId(app)?.account !== undefined) {
      errors.push(
        `/tree (${component.id}): addAccount names '${app}', which is not on this turn's shortlist`,
      );
    } else if (own.every(source => parseSourceId(source)?.account === undefined)) {
      errors.push(`/tree (${component.id}): addAccount names '${app}', which asks no sign-in`);
    }
  }
  return errors;
}

/** A formula (`{op, args}`) or a ref (`{surface, pointer}`) anywhere in the model is refused (phase decision 8). */
function dataModelErrors(model: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const visit = (value: unknown, path: string) => {
    if (Array.isArray(value)) {
      value.forEach((item, i) => visit(item, `${path}/${i}`));
      return;
    }
    if (!isRecord(value)) return;
    if (typeof value.op === 'string' && Array.isArray(value.args)) {
      errors.push(`${path}: a formula; the layout surface holds literal values only`);
      return;
    }
    if (typeof value.surface === 'string' && typeof value.pointer === 'string') {
      errors.push(`${path}: a ref; the layout surface holds literal values only`);
      return;
    }
    for (const [key, child] of Object.entries(value)) visit(child, `${path}/${key}`);
  };
  visit(model, '/dataModel');
  return errors;
}
