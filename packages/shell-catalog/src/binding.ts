import {DataBindingSchema, FunctionCallSchema} from '@a2ui/web_core/v0_9';
import {z} from 'zod';

/**
 * A binding-only dynamic prop: a data-model path or a function call, never a literal.
 *
 * The shell's synthesis primitives take one binding each to an object the
 * BindingEvaluator owns (task-4.3 decisions 3–4); a literal there is always an
 * authoring error, so the schema refuses it rather than the description asking
 * nicely. The generic binder still classifies this as `DYNAMIC`, so a two-way
 * setter is generated as for any `DynamicValue`; with no literal branch the
 * resolved prop is typed `any` and its setter takes `unknown`, which is what a
 * path to an arbitrary object holds.
 */
export const BindingSchema = z.union([DataBindingSchema, FunctionCallSchema]);
export type Binding = z.infer<typeof BindingSchema>;
