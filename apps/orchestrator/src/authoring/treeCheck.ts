/**
 * The check a model-authored tree in the shell catalog passes (task-21.13 decisions 15 to 17): the
 * tree as the surface it paints, under the shell catalog's own id and the sdk's stamp, through the
 * sdk's validator — the release's verdicts, a component id that is no UAX #31 identifier among
 * them — and through the sdk's schema-form check beside it, which refuses what the release accepts
 * and the v1.0 schema does not: a binding written `path`, a call written `call`. Each finding is
 * said at its place in the tree, so it feeds the one retry as any other finding does.
 */
import {
  A2UI_VERSION,
  createA2uiValidator,
  createSchemaFormCheck,
  formatA2uiFinding,
  type A2uiCatalogSchema,
  type A2uiFinding,
} from '@a2uiverse/sdk';
import {CATALOG_ID} from '@a2uiverse/shell-catalog/id';

export interface TreeCheck {
  /** The whole tree, created on its surface: each finding at `/tree/components/<i>…`, or `/tree`. */
  tree(components: readonly unknown[]): string[];
  /**
   * One component as an update of a surface already on the client: what is said of the component
   * itself, its type and its props, and nothing of a graph one component cannot complete; each
   * finding at `/tree (<id>)…`.
   */
  component(component: {id: string}): string[];
}

/** The two checks' findings over one payload. */
type Judge = (payload: unknown) => A2uiFinding[];

/** The component a finding's path lies in — `/1/updateComponents/components/3` — or the path. */
const componentOf = (path: string | undefined): string =>
  /^\/\d+\/\w+\/components\/\d+/.exec(path ?? '')?.[0] ?? path ?? '';

export function createTreeCheck(catalog: A2uiCatalogSchema, surfaceId: string): TreeCheck {
  const validator = createA2uiValidator({catalogs: [catalog]});
  const schemaForm = createSchemaFormCheck({catalog});
  // The schema form says what the release accepts and the v1.0 schema does not; on a component
  // the release already refused, it would say the same thing again in the schema's words.
  const judge: Judge = payload => {
    const released = validator.validate(payload);
    const refused = new Set(released.map(finding => componentOf(finding.path)));
    const schema = schemaForm
      .agentToRenderer(payload)
      .filter(finding => !refused.has(componentOf(finding.path)));
    return [...released, ...schema];
  };
  const stamped = (message: Record<string, unknown>) => ({version: A2UI_VERSION, ...message});
  return {
    tree(components) {
      const findings = judge([
        stamped({createSurface: {surfaceId, catalogId: CATALOG_ID}}),
        stamped({updateComponents: {surfaceId, components}}),
      ]);
      const at = '/1/updateComponents/components';
      return said(findings, finding =>
        finding.path?.startsWith(at) ? `/tree/components${finding.path.slice(at.length)}` : '/tree',
      );
    },
    component(component) {
      const own = '/0/updateComponents/components/0';
      const findings = judge([stamped({updateComponents: {surfaceId, components: [component]}})]);
      return said(
        findings.filter(finding => finding.path?.startsWith(own)),
        finding => `/tree (${component.id})${finding.path!.slice(own.length)}`,
      );
    },
  };
}

/** The findings in words, each at its place in the tree, each said once. */
function said(findings: readonly A2uiFinding[], at: (finding: A2uiFinding) => string): string[] {
  return [...new Set(findings.map(finding => formatA2uiFinding({...finding, path: at(finding)})))];
}
