/**
 * Validation of an incoming wiring (task-4.5 decisions 11–12). The sdk ships the JSON Schema
 * and its types but no validator; this is the client's zod mirror, declared against the sdk's
 * type so a mirror whose shape drifts fails to compile. The structural checks the evaluator
 * cannot run without — a known operator, a declared sort field, one cell per field — are
 * validation; whether a ref resolves is not, that is a runtime state.
 */
import {z} from 'zod';
import type {SynthesisWiring} from '@a2uiverse/sdk';

const RefSchema = z
  .object({
    surface: z.string(),
    // RFC 6901: empty, or starting with a slash.
    pointer: z.string().regex(/^(|\/.*)$/),
  })
  .strict();

// No refs is a cell no source contributes to — absent by construction (a product one store does
// not carry); the evaluator renders it as absent with a contributor count of 0 of 0.
const CellSchema = z.object({op: z.string(), args: z.array(RefSchema)}).strict();

const FieldSchema = z
  .object({
    // A data-model key: a valid JSON Pointer segment.
    name: z.string().regex(/^[^/~]+$/),
    label: z.string(),
  })
  .strict();

const EntitySchema = z.object({cells: z.array(CellSchema)}).strict();

const SortSchema = z.object({field: z.string(), direction: z.enum(['asc', 'desc'])}).strict();

const WiringObject = z
  .object({
    fields: z.array(FieldSchema).min(1),
    entities: z.array(EntitySchema),
    sort: SortSchema,
    computedAgainst: z.record(z.number().int().min(0)),
  })
  .strict();

// The mirror is pinned to the sdk's type in both directions, the way the sdk pins its own types
// to the schema: a field added on either side without the other is a type error.
type Pin<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const _pinned: Pin<z.infer<typeof WiringObject>, SynthesisWiring> = true;
void _pinned;

export const WiringSchema: z.ZodType<SynthesisWiring> = WiringObject;

export type WiringValidation =
  {ok: true; wiring: SynthesisWiring} | {ok: false; path: string; message: string};

/** Shape, then the structural checks; the first failure is the report. */
export function validateWiring(raw: unknown, operators: readonly string[]): WiringValidation {
  const parsed = WiringSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      path: `/${(issue?.path ?? []).join('/')}`,
      message: issue?.message ?? 'invalid',
    };
  }
  const wiring = parsed.data;
  if (!wiring.fields.some(f => f.name === wiring.sort.field)) {
    return {
      ok: false,
      path: '/sort/field',
      message: `sort names an undeclared field: ${wiring.sort.field}`,
    };
  }
  const known = new Set(operators);
  for (const [i, entity] of wiring.entities.entries()) {
    if (entity.cells.length !== wiring.fields.length) {
      return {
        ok: false,
        path: `/entities/${i}/cells`,
        message: `entity has ${entity.cells.length} cells for ${wiring.fields.length} fields`,
      };
    }
    for (const [j, cell] of entity.cells.entries()) {
      if (!known.has(cell.op)) {
        return {
          ok: false,
          path: `/entities/${i}/cells/${j}/op`,
          message: `unknown operator: ${cell.op}`,
        };
      }
    }
  }
  return {ok: true, wiring};
}
