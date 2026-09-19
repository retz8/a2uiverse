/**
 * The reverse index (SPEC §7; task-7.7 decisions 2, 4, 5): from a data path of a partition to the
 * component that renders it, built from what the renderer binds. Every vendor component registers
 * here while it is mounted — its surface, its component model and its data context — so the index
 * holds what is on screen, the live canvas or a parked composition alike.
 *
 * A component is bound to a path when one of its properties binds exactly that path, a `{path}`
 * inside a function call's arguments included; or it is the root of a template instance whose
 * base path is that path; or it owns a template child list over it. What a component binds is
 * read when it is asked, never kept: a repaint changes properties under a mounted component.
 *
 * Which element a component put on the page is asked only at the moment of a tap. A vendor's
 * stylesheet is written against the vendor's own DOM — child selectors, `:first-child`,
 * `:only-child` — and any element of the shell's standing in it changes what it matches. So the
 * components asked about render a pair of hidden markers around their output for the length of
 * one synchronous read, and the markers are gone before the browser paints.
 */
import type {ComponentContext} from '@a2ui/web_core/v0_9';

/** The attribute a component's opening marker carries while it is being located: its id. */
export const NODE_ATTR = 'data-a2ui-node';
/** Its closing marker's. */
export const NODE_END_ATTR = 'data-a2ui-node-end';

export interface IndexedComponent {
  /** The namespaced surface id the component renders in. */
  surfaceId: string;
  context: ComponentContext;
  /** It is the root of a template instance: its base path is not its parent's. */
  instanceRoot: boolean;
  /** The opening marker, mounted while the component is being located. */
  marker: {readonly current: HTMLElement | null};
}

/** A data path as the renderer spells it, without a trailing slash; the root is `''`. */
function normalize(path: string): string {
  return path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path === '/' ? '' : path;
}

/** Every path the component's properties bind, a template child list's among them. */
function propertyPaths(context: ComponentContext): Set<string> {
  const paths = new Set<string>();
  const visit = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (typeof node !== 'object' || node === null) return;
    const record = node as Record<string, unknown>;
    if (typeof record.path === 'string') {
      paths.add(normalize(context.dataContext.nested(record.path).path));
    }
    Object.values(record).forEach(visit);
  };
  visit(context.componentModel.properties);
  return paths;
}

export function isBoundTo(component: IndexedComponent, path: string): boolean {
  if (component.instanceRoot && normalize(component.context.dataContext.path) === path) return true;
  return propertyPaths(component.context).has(path);
}

/**
 * The element a component put on the page: the first one between its markers that is not a
 * marker — its own, or a child's where it renders none of its own. Undefined when it rendered no
 * element at all.
 */
export function elementOf(marker: Element): HTMLElement | undefined {
  let depth = 0;
  for (let at = marker.nextElementSibling; at; at = at.nextElementSibling) {
    if (at.hasAttribute(NODE_ATTR)) depth += 1;
    else if (at.hasAttribute(NODE_END_ATTR)) {
      if (depth === 0) return undefined;
      depth -= 1;
    } else if (at instanceof HTMLElement) return at;
  }
  return undefined;
}

export interface BindingIndex {
  /** A component mounted; the returned function is its unmount. */
  register(component: IndexedComponent): () => void;
  /** Whether the component is being located now: it renders its markers while it is. */
  isLocating(component: IndexedComponent): boolean;
  subscribe(listener: () => void): () => void;
  /** The root data model of a surface some mounted component renders; undefined when none does. */
  modelOf(surfaceId: string): unknown;
  /**
   * The element bound to the path or, walking up one segment at a time, to its nearest bound
   * ancestor — the first in document order where several are. Undefined when nothing mounted
   * under the surface binds any prefix of the path.
   */
  nearest(surfaceId: string, path: string): HTMLElement | undefined;
}

/** Runs a state change and renders it before returning — `flushSync`, given by the host. */
export type RenderNow = (change: () => void) => void;

export function createBindingIndex(renderNow: RenderNow): BindingIndex {
  const components = new Set<IndexedComponent>();
  const listeners = new Set<() => void>();
  let locating: ReadonlySet<IndexedComponent> = new Set();

  const locate = (next: ReadonlySet<IndexedComponent>) =>
    renderNow(() => {
      locating = next;
      listeners.forEach(listener => listener());
    });

  /** The candidates' elements, read between two synchronous renders: markers in, markers out. */
  const elementsOf = (candidates: IndexedComponent[]): HTMLElement[] => {
    locate(new Set(candidates));
    const elements = candidates.flatMap(c =>
      c.marker.current ? (elementOf(c.marker.current) ?? []) : [],
    );
    locate(new Set());
    return elements;
  };

  const mounted = (surfaceId: string) => [...components].filter(c => c.surfaceId === surfaceId);

  return {
    register: component => {
      components.add(component);
      return () => components.delete(component);
    },
    isLocating: component => locating.has(component),
    subscribe: listener => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    modelOf: surfaceId => mounted(surfaceId)[0]?.context.dataContext.dataModel.get('/'),
    nearest: (surfaceId, path) => {
      for (let at = normalize(path); at !== ''; at = at.slice(0, at.lastIndexOf('/'))) {
        const candidates = mounted(surfaceId).filter(component => isBoundTo(component, at));
        if (candidates.length === 0) continue;
        const [first] = elementsOf(candidates).sort((a, b) =>
          a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
        );
        if (first) return first;
      }
      return undefined;
    },
  };
}
