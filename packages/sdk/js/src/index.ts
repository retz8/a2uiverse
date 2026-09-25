/** @a2uiverse/sdk — the wire contract and generic A2UI tools. The composition extension is its first real content; the manifest schema lands with Phase 11. */
export const SDK_NAME = '@a2uiverse/sdk';
export * from './composition.js';
export * from './synthesis.js';
export * from './pointer.js';
export * from './walk.js';
export * from './validate.js';
export * from './a2ui/types.js';
export * from './a2ui/validator.js';
export * from './a2ui/prune.js';
export {A2UI_SPEC_COMMIT} from './a2ui/spec.generated.js';
