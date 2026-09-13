/** The generic A2UI tools' shared shapes. */

/** A catalog's `catalog.json`: its components, its functions, and the definitions they share. */
export interface A2uiCatalogSchema {
  components?: Record<string, unknown>;
  functions?: Record<string, unknown>;
  $defs?: Record<string, unknown>;
  [key: string]: unknown;
}

/** The kind of a finding, in upstream's error categories. */
export type A2uiFindingCategory = 'ValidationError' | 'IntegrityError' | 'RecursionError';

/** One thing wrong with a payload. */
export interface A2uiFinding {
  category: A2uiFindingCategory;
  message: string;
  /** JSON Pointer into the validated message list, when the finding sits at one place. */
  path?: string;
  /** The component the finding is about, when it is about one. */
  componentId?: string;
}

/** An A2UI v0.9 component as a payload carries it. */
export interface A2uiComponent {
  id: string;
  component: string;
  [prop: string]: unknown;
}
