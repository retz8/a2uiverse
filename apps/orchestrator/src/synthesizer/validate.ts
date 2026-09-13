import {Ajv2020} from 'ajv/dist/2020.js';
import {
  formatA2uiFinding,
  isFormula,
  parsePointer,
  schemaErrors,
  validateSynthesisPayload,
  walkModel,
  type A2uiComponent,
  type A2uiFinding,
  type A2uiValidator,
  type ModelNode,
  type Ref,
  type Resolution,
} from '@a2uiverse/sdk';
import {
  isDecline,
  SYNTHESIZE_DATA_MODEL_SCHEMA,
  type Synthesis,
  type SynthesisTree,
  type SynthesizeDataModel,
} from './document.js';

/**
 * The Synthesizer's one validator (task-6.3 decision 9), in order: the output schema; for a
 * synthesis, the derived model and sorts through the sdk's payload validator; the tree through the
 * sdk's A2UI validator against the Synthesizer's pruned catalog — known components and props, the
 * root, dangling children, cycles, orphans; the derived-value rule over that tree, resolving
 * bindings absolutely or through their enclosing template; every operator one the pruned catalog
 * declares; every ref into a held partition, resolving now. Each finding is one line with its path,
 * so the retry can hand them back.
 */
export interface SynthesisChecks {
  /** The sdk's A2UI validator over the Synthesizer's pruned catalog. */
  tree: A2uiValidator;
  /** The pruned catalog's functions: the formula operators. */
  operators: readonly string[];
  partitions: {has(surface: string): boolean; resolve(ref: Ref): Resolution};
}

export type SynthesisValidation =
  {ok: true; document: SynthesizeDataModel} | {ok: false; errors: string[]};

type TreeComponent = A2uiComponent;

const outputSchema = new Ajv2020({allErrors: true, strict: true, allowUnionTypes: true}).compile(
  SYNTHESIZE_DATA_MODEL_SCHEMA,
);

export function validateSynthesis(input: unknown, checks: SynthesisChecks): SynthesisValidation {
  const schema = schemaErrors(outputSchema, input);
  if (schema.length > 0) return {ok: false, errors: schema};
  const document = input as SynthesizeDataModel;
  if (isDecline(document)) return {ok: true, document};
  const structure = validateSynthesisPayload({
    dataModel: document.dataModel,
    sorts: document.sorts,
  });
  const tree = treeErrors(document.tree, checks.tree);
  // The checks that read the model's pointers run only over a structurally sound model.
  const errors = structure.ok
    ? [
        ...tree,
        ...derivedValueErrors(document),
        ...operatorErrors(document, checks.operators),
        ...refErrors(document, checks.partitions),
      ]
    : [...structure.errors, ...tree];
  return errors.length === 0 ? {ok: true, document} : {ok: false, errors};
}

const TREE_SURFACE = 'synthesis';

/** The tree as the surface it paints, through the A2UI validator; paths rebased onto `/tree`. */
function treeErrors(tree: SynthesisTree, validator: A2uiValidator): string[] {
  const findings = validator.validate([
    {version: 'v0.9', createSurface: {surfaceId: TREE_SURFACE, catalogId: 'shell'}},
    {version: 'v0.9', updateComponents: {surfaceId: TREE_SURFACE, components: tree.components}},
  ]);
  return findings.map((finding: A2uiFinding) => {
    const components = '/1/updateComponents/components';
    const path = finding.path?.startsWith(components)
      ? `/tree/components${finding.path.slice(components.length)}`
      : '/tree';
    return formatA2uiFinding({...finding, path});
  });
}

type Template = {path: string; componentId: string};

function isTemplate(value: unknown): value is Template {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Template).path === 'string' &&
    typeof (value as Template).componentId === 'string'
  );
}

/** The ids a component names as children: `child`, a `children` list, or a template's component. */
function childIds(component: TreeComponent): string[] {
  const ids: string[] = [];
  if (typeof component.child === 'string') ids.push(component.child);
  const {children} = component;
  if (Array.isArray(children)) {
    for (const id of children) if (typeof id === 'string') ids.push(id);
  } else if (isTemplate(children)) {
    ids.push(children.componentId);
  }
  return ids;
}

/**
 * Resolves a path in the derived model. A template context (`/rows/*`) stands for any element
 * of the array; the first element answers for all, the model's arrays being lists of like
 * things. Returns undefined when the path leaves the model.
 */
function nodeAt(model: Record<string, ModelNode>, path: string): ModelNode | undefined {
  let node: ModelNode | undefined = model;
  for (const step of parsePointer(path)) {
    if (node === undefined) return undefined;
    if (step.kind === 'predicate') return undefined;
    if (isFormula(node)) return undefined;
    if (Array.isArray(node)) {
      node = step.key === '*' ? node[0] : node[Number(step.key)];
    } else {
      node = (node as Record<string, ModelNode>)[step.key];
    }
  }
  return node;
}

function joinPath(context: string | undefined, path: string): string {
  if (path.startsWith('/')) return path;
  return `${context ?? ''}/${path}`;
}

/** Every `{path}` binding among a component's props, with the prop it sits on. */
function bindingsOf(component: TreeComponent): Array<{prop: string; path: string}> {
  const found: Array<{prop: string; path: string}> = [];
  const visit = (value: unknown, prop: string) => {
    if (typeof value !== 'object' || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((item, i) => visit(item, `${prop}/${i}`));
      return;
    }
    const record = value as Record<string, unknown>;
    if (typeof record.path === 'string' && Object.keys(record).length === 1) {
      found.push({prop, path: record.path});
      return;
    }
    for (const [key, child] of Object.entries(record)) visit(child, prop ? `${prop}/${key}` : key);
  };
  for (const [key, value] of Object.entries(component)) {
    if (key === 'id' || key === 'component' || key === 'children') continue;
    visit(value, key);
  }
  return found;
}

/**
 * The derived-value rule (phase decision 18, task decision 5): only `DerivedValue` binds a
 * formula path, and `DerivedValue` binds nothing else; a template binds a branch that is an
 * array; `SortControl` binds one of the declared sorts at `/sorts/N`.
 */
function derivedValueErrors(synthesis: Synthesis): string[] {
  const errors: string[] = [];
  const {tree, dataModel, sorts} = synthesis;
  const byId = new Map(tree.components.map(c => [c.id, c]));
  const context = new Map<string, string>();
  const contextOf = (id: string): string | undefined => context.get(id);

  // Walk from root so each template's element context reaches its subtree.
  const visited = new Set<string>();
  const walk = (id: string, ctx: string | undefined) => {
    if (visited.has(id)) return;
    visited.add(id);
    const component = byId.get(id);
    if (!component) return;
    if (ctx !== undefined) context.set(id, ctx);
    const {children} = component;
    if (isTemplate(children)) {
      const path = joinPath(ctx, children.path);
      const node = nodeAt(dataModel, path);
      if (node === undefined || !Array.isArray(node)) {
        errors.push(
          `/tree (${id}): the template path ${children.path} must name an array of the derived model`,
        );
      }
      walk(children.componentId, `${path}/*`);
      return;
    }
    for (const child of childIds(component)) walk(child, ctx);
  };
  walk('root', undefined);
  for (const component of tree.components) walk(component.id, contextOf(component.id));

  for (const component of tree.components) {
    const ctx = contextOf(component.id);
    if (component.component === 'SortControl') {
      const sort = component.sort as {path?: string} | undefined;
      const match = /^\/sorts\/(\d+)$/.exec(sort?.path ?? '');
      if (!match || Number(match[1]) >= sorts.length) {
        errors.push(
          `/tree (${component.id}): SortControl must bind /sorts/N for a declared sort; ${sorts.length} declared`,
        );
      }
      continue;
    }
    for (const {prop, path} of bindingsOf(component)) {
      if (path.startsWith('/sorts/') || path === '/sorts') continue;
      const absolute = joinPath(ctx, path);
      const node = nodeAt(dataModel, absolute);
      const formula = node !== undefined && isFormula(node);
      if (component.component === 'DerivedValue') {
        if (prop === 'cell' && !formula) {
          errors.push(
            `/tree (${component.id}): DerivedValue.cell must bind a formula leaf; ${absolute} is ${node === undefined ? 'not in the derived model' : 'a branch'}`,
          );
        }
      } else if (formula) {
        errors.push(
          `/tree (${component.id}): ${component.component}.${prop} binds the formula at ${absolute}; a formula renders only through DerivedValue`,
        );
      }
    }
  }
  return errors;
}

function operatorErrors(synthesis: Synthesis, operators: readonly string[]): string[] {
  const errors: string[] = [];
  for (const leaf of walkModel(synthesis.dataModel).leaves) {
    if (!operators.includes(leaf.formula.op)) {
      errors.push(
        `/dataModel${leaf.path}: operator '${leaf.formula.op}' is not one the shell catalog declares`,
      );
    }
  }
  return errors;
}

/** A ref that never resolved is malformed, not absent — absent is for refs that resolved when written and later stopped. */
function refErrors(synthesis: Synthesis, partitions: SynthesisChecks['partitions']): string[] {
  const errors: string[] = [];
  for (const leaf of walkModel(synthesis.dataModel).leaves) {
    leaf.formula.args.forEach((ref, i) => {
      const where = `/dataModel${leaf.path}/args/${i}`;
      if (!partitions.has(ref.surface)) {
        errors.push(`${where}: surface '${ref.surface}' is not a source of this composition`);
        return;
      }
      const resolution = partitions.resolve(ref);
      if (resolution.found) return;
      if (resolution.reason === 'positional') {
        // The data is at that position; the rule is what was broken. Saying "does not resolve"
        // would send the retry hunting for missing data instead of rewriting the pointer.
        errors.push(
          `${where}: ${ref.surface}${ref.pointer} selects an array element by position; ` +
            'elements are selected by key — use a predicate segment, ' +
            'for example /items[id="x"], conjoining fields if one does not identify the element',
        );
      } else if (resolution.reason === 'ambiguous') {
        errors.push(
          `${where}: ${ref.surface}${ref.pointer} matches more than one element; ` +
            'add fields to the predicate until exactly one matches',
        );
      } else {
        errors.push(`${where}: ${ref.surface}${ref.pointer} does not resolve in the data shown`);
      }
    });
  }
  return errors;
}
