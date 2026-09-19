/**
 * The tie between a rendered element and its component (task-7.7 decision 2). The renderer puts
 * nothing of its own on the page per component, and a vendor's components are not the shell's to
 * edit, so the client decorates each vendor catalog where it resolves them: every component
 * registers in the binding index while it is mounted and, for the instant the index asks where
 * it is, renders a pair of hidden markers around its output. At rest a vendor's DOM is the
 * vendor's alone. The shell catalog is not decorated — refs point into vendor partitions only.
 */
import {createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore} from 'react';
import {Catalog} from '@a2ui/web_core/v0_9';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import {NODE_ATTR, NODE_END_ATTR, type BindingIndex, type IndexedComponent} from './bindingIndex';

/** The index the mounted canvas owns; with none provided, components register nowhere. */
export const BindingIndexContext = createContext<BindingIndex | null>(null);

/** The base path of the component above: a child with another is a template instance's root. */
const ParentPathContext = createContext<string | undefined>(undefined);

const NEVER = () => () => {};

function decorate(implementation: ReactComponentImplementation): ReactComponentImplementation {
  const Render = implementation.render;
  const Marked: ReactComponentImplementation['render'] = ({context, buildChild}) => {
    const index = useContext(BindingIndexContext);
    const parentPath = useContext(ParentPathContext);
    const basePath = context.dataContext.path;
    const instanceRoot = parentPath !== undefined && parentPath !== basePath;
    const marker = useRef<HTMLElement>(null);
    const component = useMemo<IndexedComponent>(
      () => ({surfaceId: context.dataContext.surface.id, context, instanceRoot, marker}),
      [context, instanceRoot],
    );
    useEffect(() => index?.register(component), [index, component]);
    const locating = useSyncExternalStore(index?.subscribe ?? NEVER, () =>
      index ? index.isLocating(component) : false,
    );
    const id = context.componentModel.id;
    return (
      <ParentPathContext.Provider value={basePath}>
        {locating && <span hidden ref={marker} {...{[NODE_ATTR]: id}} />}
        <Render context={context} buildChild={buildChild} />
        {locating && <span hidden {...{[NODE_END_ATTR]: id}} />}
      </ParentPathContext.Provider>
    );
  };
  return {...implementation, render: Marked};
}

export function decorateCatalog(
  catalog: Catalog<ReactComponentImplementation>,
): Catalog<ReactComponentImplementation> {
  return new Catalog<ReactComponentImplementation>(
    catalog.id,
    [...catalog.components.values()].map(decorate),
    [...catalog.functions.values()],
    catalog.themeSchema,
  );
}
