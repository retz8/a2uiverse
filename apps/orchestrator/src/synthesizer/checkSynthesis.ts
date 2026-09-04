import type {SynthesizerOutput} from '@a2uiverse/sdk';
import type {Partitions} from '../composition/partitions.js';

/** Output that passed the schema but fails sense. Behaves as a decline (task-4.4 decision 4). */
export class MalformedSynthesisError extends Error {
  constructor(reason: string) {
    super(`Malformed synthesis: ${reason}`);
    this.name = 'MalformedSynthesisError';
  }
}

/**
 * The deterministic checklist after parse: operators the shell catalog declares, a declared sort
 * field, uniform entity width, refs into partitions the composition holds whose pointers resolve
 * now. A ref that never resolved is malformed, not absent — absent is for refs that resolved when
 * written and later stopped.
 */
export function checkSynthesis(
  output: SynthesizerOutput,
  ctx: {operators: readonly string[]; partitions: Pick<Partitions, 'has' | 'resolve'>},
): void {
  if (output.declined) return;
  const {fields, entities, sort} = output;
  if (!fields || !entities || !sort) {
    throw new MalformedSynthesisError('a synthesis needs fields, entities and sort');
  }
  if (!fields.some(f => f.name === sort.field)) {
    throw new MalformedSynthesisError(`sort field '${sort.field}' is not a declared field`);
  }
  entities.forEach((entity, i) => {
    if (entity.cells.length !== fields.length) {
      throw new MalformedSynthesisError(
        `entity ${i} has ${entity.cells.length} cell(s) for ${fields.length} field(s)`,
      );
    }
    for (const cell of entity.cells) {
      if (!ctx.operators.includes(cell.op)) {
        throw new MalformedSynthesisError(
          `operator '${cell.op}' is not declared by the shell catalog`,
        );
      }
      for (const ref of cell.args) {
        if (!ctx.partitions.has(ref.surface)) {
          throw new MalformedSynthesisError(
            `surface '${ref.surface}' is not a partition of this composition`,
          );
        }
        if (!ctx.partitions.resolve(ref).found) {
          throw new MalformedSynthesisError(`ref ${ref.surface}${ref.pointer} does not resolve`);
        }
      }
    }
  });
}
