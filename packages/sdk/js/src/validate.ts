/**
 * The contract's validator: what the orchestrator runs over the Synthesizer's
 * output and the client over the payload. Checks what the contract states on
 * its own — the schema, then the structure the schema cannot express: every
 * pointer parses, every sort names an array of the model whose elements carry
 * every option key as a formula, the initial key is an option, the tree has
 * one `root` and unique ids. The tree against the shell catalog and the
 * derived-value rule are the orchestrator's checks, after this one.
 */
import {Ajv2020, type ErrorObject, type ValidateFunction} from 'ajv/dist/2020.js';
import {parsePointer, PointerSyntaxError, resolvePointer} from './pointer.js';
import {
  isDecline,
  SYNTHESIS_SCHEMA,
  SYNTHESIZE_DATA_MODEL_SCHEMA,
  type DerivedModel,
  type SortDeclaration,
  type SynthesisPayload,
  type SynthesisTree,
  type SynthesizeDataModel,
} from './synthesis.js';
import {isFormula, walkModel} from './walk.js';

export type Validation<T> = {ok: true; value: T} | {ok: false; errors: string[]};

const ajv = new Ajv2020({allErrors: true, strict: true, allowUnionTypes: true});
const outputSchema = ajv.compile(SYNTHESIZE_DATA_MODEL_SCHEMA);
const payloadSchema = ajv.compile(SYNTHESIS_SCHEMA);

function schemaErrors(validate: ValidateFunction, input: unknown): string[] {
  if (validate(input)) return [];
  return (validate.errors ?? []).map((error: ErrorObject) => {
    const params = error.params as {propertyName?: string; additionalProperty?: string};
    const subject = params.propertyName ?? params.additionalProperty;
    const detail = subject === undefined ? '' : ` (${JSON.stringify(subject)})`;
    return `${error.instancePath || '/'}: ${error.message ?? 'invalid'}${detail}`;
  });
}

function modelErrors(model: DerivedModel): string[] {
  const errors: string[] = [];
  const {leaves, violations} = walkModel(model);
  for (const path of violations) errors.push(`${path}: a leaf must be a formula, not a scalar`);
  for (const leaf of leaves) {
    for (const ref of leaf.formula.args) {
      try {
        parsePointer(ref.pointer);
      } catch (error) {
        if (!(error instanceof PointerSyntaxError)) throw error;
        errors.push(`${leaf.path}: ${error.message}`);
      }
    }
  }
  return errors;
}

function sortErrors(model: DerivedModel, sorts: SortDeclaration[]): string[] {
  const errors: string[] = [];
  sorts.forEach((sort, index) => {
    const where = `/sorts/${index}`;
    const target = resolvePointer(model, sort.path);
    if (!target.found || !Array.isArray(target.value)) {
      errors.push(`${where}: path ${sort.path} is not an array of the derived model`);
      return;
    }
    if (!sort.options.some(option => option.key === sort.key)) {
      errors.push(`${where}: key ${sort.key} is not one of the options`);
    }
    for (const option of sort.options) {
      (target.value as unknown[]).forEach((element, position) => {
        const cell = resolvePointer(element, option.key);
        if (!cell.found || !isFormula(cell.value)) {
          errors.push(
            `${where}: option key ${option.key} does not resolve to a formula in element ${position} of ${sort.path}`,
          );
        }
      });
    }
  });
  return errors;
}

function treeErrors(tree: SynthesisTree): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const component of tree.components) {
    if (ids.has(component.id)) errors.push(`/tree: duplicate component id ${component.id}`);
    ids.add(component.id);
  }
  if (!ids.has('root')) errors.push('/tree: no component has the id "root"');
  return errors;
}

function result<T>(errors: string[], value: T): Validation<T> {
  return errors.length === 0 ? {ok: true, value} : {ok: false, errors};
}

/** The Synthesizer's output, as written: a synthesis or a decline. */
export function validateSynthesizeDataModel(input: unknown): Validation<SynthesizeDataModel> {
  const errors = schemaErrors(outputSchema, input);
  if (errors.length > 0) return {ok: false, errors};
  const output = input as SynthesizeDataModel;
  if (isDecline(output)) return {ok: true, value: output};
  return result(
    [
      ...modelErrors(output.dataModel),
      ...sortErrors(output.dataModel, output.sorts),
      ...treeErrors(output.tree),
    ],
    output,
  );
}

/** The client-facing payload under the synthesis key. */
export function validateSynthesisPayload(input: unknown): Validation<SynthesisPayload> {
  const errors = schemaErrors(payloadSchema, input);
  if (errors.length > 0) return {ok: false, errors};
  const payload = input as SynthesisPayload;
  return result(
    [...modelErrors(payload.dataModel), ...sortErrors(payload.dataModel, payload.sorts)],
    payload,
  );
}
