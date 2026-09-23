import {Ajv2020} from 'ajv/dist/2020.js';
import {
  formatA2uiFinding,
  schemaErrors,
  type A2uiComponent,
  type A2uiFinding,
  type A2uiValidator,
} from '@a2uiverse/sdk';
import {SHELL_SOURCE_ID} from '../registry/types.js';
import {isGap, LAYOUT_SURFACE_SCHEMA, type LayoutSurface} from './document.js';

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
 * a `Slot` (`source` or `gap`, and a positive `weight`; the rest are the painter's); and a data
 * model of literals. One line per finding, with its path, so the retry can hand them back.
 */
export interface LayoutChecks {
  /** The sdk's A2UI validator over the layout surface's pruned catalog. */
  tree: A2uiValidator;
  /** The app ids on this turn's shortlist — the only sources the dispatch may name. */
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
  const document = input as LayoutSurface;
  const errors = [
    ...treeErrors(document, checks.tree),
    ...dispatchErrors(document, checks.shortlist),
    ...slotErrors(document),
    ...dataModelErrors(document.dataModel),
  ];
  return errors.length === 0 ? {ok: true, document} : {ok: false, errors};
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
  let merged = false;
  document.dispatch.forEach((entry, i) => {
    if (isGap(entry)) {
      if (seen.has(`gap:${entry.gap}`))
        errors.push(`/dispatch/${i}/gap: '${entry.gap}' is named twice`);
      seen.add(`gap:${entry.gap}`);
      return;
    }
    const {source, request, columns, columnSources, join} = entry;
    if (seen.has(source)) errors.push(`/dispatch/${i}/source: '${source}' is dispatched twice`);
    seen.add(source);
    if (source === SHELL_SOURCE_ID) merged = true;
    else if (!shortlist.includes(source)) {
      errors.push(`/dispatch/${i}/source: '${source}' is not on this turn's shortlist`);
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
  const i = document.dispatch.findIndex(entry => !isGap(entry) && entry.source === SHELL_SOURCE_ID);
  const shell = document.dispatch[i];
  if (shell === undefined || isGap(shell)) return [];
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

/** The merged view's join names its home and a noun for each dispatched vendor source, and nothing else. */
function joinErrors(document: LayoutSurface, vendorSources: readonly string[]): string[] {
  const i = document.dispatch.findIndex(entry => !isGap(entry) && entry.source === SHELL_SOURCE_ID);
  const shell = document.dispatch[i];
  if (shell === undefined || isGap(shell) || shell.join === undefined) return [];
  const {home, nouns} = shell.join;
  const errors: string[] = [];
  if (!vendorSources.includes(home)) {
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
] as const;

/** Slot accounting against the dispatch list, and what the Planner may write on a `Slot`. */
function slotErrors(document: LayoutSurface): string[] {
  const errors: string[] = [];
  const wanted = new Map<string, string>();
  for (const entry of document.dispatch) {
    if (isGap(entry)) wanted.set(`gap:${entry.gap}`, `gap '${entry.gap}'`);
    else wanted.set(`source:${entry.source}`, `source '${entry.source}'`);
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
      weight?: unknown;
    };
    const key =
      typeof slot.source === 'string'
        ? `source:${slot.source}`
        : typeof slot.gap === 'string'
          ? `gap:${slot.gap}`
          : undefined;
    if (key !== undefined) {
      const name = key.startsWith('gap:') ? `gap '${slot.gap}'` : `source '${slot.source}'`;
      if (!wanted.has(key)) {
        errors.push(`/tree (${slot.id}): Slot holds ${name}, which the dispatch does not name`);
      } else if (held.has(key)) {
        errors.push(`/tree (${slot.id}): a second Slot holds ${name}; one Slot per dispatch entry`);
      }
      held.add(key);
    }
    if (PAINTER_PROPS.some(prop => prop in slot)) {
      errors.push(
        `/tree (${slot.id}): Slot.${PAINTER_PROPS.filter(prop => prop in slot).join(', Slot.')} ${PAINTER_PROPS.filter(prop => prop in slot).length > 1 ? 'are' : 'is'} written by the shell; write only source or gap, and weight — the merged view's columns, column marks and join go on its dispatch entry`,
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
