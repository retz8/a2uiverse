/**
 * The frame a component is drawn in when its catalog differs from the one around it (task-21.14
 * decision 2): its own catalog's Provider inside the catalog's mark, the basic catalog taking a
 * mark and no Provider. A run of components from one catalog shares one frame, and a build's
 * stylesheet stops at the mark of another catalog's frame (`scopeToBuild`). What is inherited
 * comes from what surrounds the component, as a fragment inherits from the shell's page.
 *
 * Which catalog encloses a component is said by the frame around it, through React context: the
 * surface's frame sets it to the surface's default catalog, and each component of a resolved
 * catalog drawn in React sets it to its own for what it draws. A component of a catalog drawn as
 * a web component — the basic catalog's — cannot frame itself, so the component that builds it
 * frames it, or the surface's frame when it is the root.
 */
import {createContext, useCallback, useContext, type ReactNode} from 'react';
import {isComponentNode, type ComponentNode} from '@a2ui/web_core/v1_0';
import type {NodeBuildChild, NodeViewProps, ReactCatalogComponent} from '@a2ui/react';
import {BUILD_ATTRIBUTE, FRAME_ATTRIBUTE} from './host';
import type {ResolvedCatalog} from './clientCatalogs';

/** The catalog of the frame around what is drawn, as the object a surface holds; none on the page. */
export const FrameCatalogContext = createContext<object | undefined>(undefined);

/** A frame's mark: no box of its own, so the component lays out as if it were not there. */
const MARK_STYLE = {display: 'contents'} as const;

export interface CatalogFrameProps {
  /** The catalog drawn inside, as the object the surface holds. */
  catalog: object & {readonly id: string};
  /** How the client resolved it — its Provider and its build; none draws it bare. */
  resolved: ResolvedCatalog | undefined;
  children: ReactNode;
}

/** A change of catalog: the catalog's mark, its build named when it has one, and its Provider. */
export function CatalogFrame({catalog, resolved, children}: CatalogFrameProps) {
  const Provider = resolved?.Provider;
  return (
    <div
      {...{[FRAME_ATTRIBUTE]: catalog.id}}
      {...(resolved?.build ? {[BUILD_ATTRIBUTE]: resolved.build} : {})}
      style={MARK_STYLE}
    >
      <FrameCatalogContext.Provider value={catalog}>
        {Provider ? <Provider>{children}</Provider> : children}
      </FrameCatalogContext.Provider>
    </div>
  );
}

/** The catalog a node was drawn in, as its surface holds it. */
const catalogOf = (node: ComponentNode): (object & {readonly id: string}) | undefined =>
  node.context?.componentModel.catalog ?? undefined;

/** An entry drawn in React: its `view` is what the client wraps. */
type ReactEntry = Extract<ReactCatalogComponent, {render: unknown}>;

/** Whether an entry is drawn in React rather than as a web component. */
const drawnInReact = (impl: unknown): impl is ReactEntry =>
  typeof impl === 'object' && impl !== null && 'render' in impl;

/** The catalogs whose entries were wrapped, so a catalog is wrapped once. */
const FRAMED = new WeakSet<object>();

/**
 * Each entry of `catalog` drawn in React, wrapped so that it frames itself when the catalog
 * around it is another, and frames each child it builds that is drawn as a web component of
 * another catalog. `resolve` answers how the client resolved a catalog a node was drawn in.
 */
export function frameComponents(
  catalog: object & {readonly components: ReadonlyMap<string, unknown>},
  resolve: (catalog: object) => ResolvedCatalog | undefined,
): void {
  if (FRAMED.has(catalog)) return;
  FRAMED.add(catalog);
  const components = catalog.components as Map<string, unknown>;
  for (const [name, impl] of components) {
    if (!drawnInReact(impl) || !impl.view) continue;
    const View = impl.view;
    const FramedView = ({node, buildChild}: NodeViewProps) => {
      const around = useContext(FrameCatalogContext);
      const own = catalogOf(node);
      const build = useCallback<NodeBuildChild>(
        (child, basePath) => {
          const element = buildChild(child, basePath);
          if (!isComponentNode(child)) return element;
          const theirs = catalogOf(child);
          if (!theirs || theirs === own || drawnInReact(child.impl)) return element;
          return (
            <CatalogFrame key={child.id} catalog={theirs} resolved={resolve(theirs)}>
              {element}
            </CatalogFrame>
          );
        },
        [buildChild, own],
      );
      const body = <View node={node} buildChild={build} />;
      if (!own) return body;
      return own === around ? (
        <FrameCatalogContext.Provider value={own}>{body}</FrameCatalogContext.Provider>
      ) : (
        <CatalogFrame catalog={own} resolved={resolve(own)}>
          {body}
        </CatalogFrame>
      );
    };
    FramedView.displayName = `${name}.framed`;
    components.set(name, {...impl, view: FramedView});
  }
}
