/**
 * The contract's validator over the synthesis payload: what the client runs over what it receives,
 * and what the orchestrator runs over the derived model and sorts the Synthesizer wrote. Checks what
 * the contract states on its own — the schema, then the structure the schema cannot express: every
 * leaf a formula, every pointer parses, every relation of a match claim joins two different apps,
 * every sort names an array of the model — once, reaching through `*` the list inside every
 * element of the arrays enclosing it — whose elements carry every option key as a formula with at
 * least one ref, and the initial key is an option. Whether a relation's operator
 * is a relation, and whether it holds, is the consumer's: the sdk knows no catalog and no partition.
 */
import {Ajv2020, type ErrorObject, type ValidateFunction} from 'ajv/dist/2020.js';
import {parseSurfaceId} from './composition.js';
import {parsePointer, PointerSyntaxError, resolvePointer} from './pointer.js';
import {
  SYNTHESIS_SCHEMA,
  type DerivedModel,
  type SortDeclaration,
  type SynthesisPayload,
} from './synthesis.js';
import {isFormula, reachSortPath, walkModel} from './walk.js';

export type Validation<T> = {ok: true; value: T} | {ok: false; errors: string[]};

const ajv = new Ajv2020({allErrors: true, strict: true, allowUnionTypes: true});
const payloadSchema = ajv.compile(SYNTHESIS_SCHEMA);

export function schemaErrors(validate: ValidateFunction, input: unknown): string[] {
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
  const {leaves, claims, violations} = walkModel(model);
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
  for (const claim of claims) {
    for (const {path: where, formula} of claim.relations) {
      const apps = formula.args.map(ref => parseSurfaceId(ref.surface)?.appId);
      const bare = formula.args.find((_, i) => apps[i] === undefined);
      if (bare) {
        errors.push(
          `${where}: ref surface ${JSON.stringify(bare.surface)} names no app — a surface is <appId>:<surfaceId>`,
        );
      } else if (apps[0] === apps[1]) {
        errors.push(`${where}: a relation joins two different apps; both refs are in ${apps[0]}`);
      }
    }
  }
  return errors;
}

function sortErrors(model: DerivedModel, sorts: SortDeclaration[]): string[] {
  const errors: string[] = [];
  const declaredAt = new Map<string, number>();
  sorts.forEach((sort, index) => {
    const where = `/sorts/${index}`;
    // One declaration per array (task-5.7): a second one paints a second control and the
    // runtime would apply both, the last silently winning.
    const earlier = declaredAt.get(sort.path);
    if (earlier !== undefined) {
      errors.push(
        `${where}: path ${sort.path} is already declared at /sorts/${earlier} — one declaration per array`,
      );
      return;
    }
    declaredAt.set(sort.path, index);
    const {targets, faults} = reachSortPath(model, sort.path);
    if (faults.length > 0) {
      for (const fault of faults) errors.push(`${where}: ${fault}`);
      return;
    }
    if (!sort.options.some(option => option.key === sort.key)) {
      errors.push(`${where}: key ${sort.key} is not one of the options`);
    }
    for (const option of sort.options) {
      for (const {location, array} of targets) {
        array.forEach((element, position) => {
          const cell = resolvePointer(element, option.key);
          if (!cell.found || !isFormula(cell.value)) {
            errors.push(
              `${where}: option key ${option.key} does not resolve to a formula in element ${position} of ${location}`,
            );
          } else if (cell.value.args.length === 0) {
            // A key with no refs is absent by construction (task-5.7): the element can never
            // take a place on this axis, so it does not belong in the array — the composition
            // doc's own-array rule, checked where it can be.
            errors.push(
              `${where}: option key ${option.key} is a formula with no refs in element ${position} of ${location} — an element whose key can never resolve does not belong in a sorted array; give it its own array`,
            );
          }
        });
      }
    }
  });
  return errors;
}

function result<T>(errors: string[], value: T): Validation<T> {
  return errors.length === 0 ? {ok: true, value} : {ok: false, errors};
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
