/**
 * The basic catalog's `accessibility` object, resolved: its `label` and `description` are
 * `DynamicString`s on the wire and plain strings once the binder has resolved them, but the
 * binder's inferred type still shows the nested union — so a view takes the resolved shape and
 * the catalog entry casts to it (the same convention `primer-a2ui-adapter` uses).
 */
export type ResolvedAccessibility = {label?: string; description?: string};

export function ariaProps(accessibility: ResolvedAccessibility | undefined): {
  'aria-label'?: string;
  'aria-description'?: string;
} {
  return {
    'aria-label': accessibility?.label,
    'aria-description': accessibility?.description,
  };
}
