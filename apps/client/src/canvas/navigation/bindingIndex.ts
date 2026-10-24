/**
 * The reverse index (SPEC §7; task-7.7 decisions 2, 4, 5; task-16.7 decision 3): from a data path
 * of a partition to the component that renders it, read from the page at the moment of a tap.
 * Every fragment's boundary registers here while it is mounted, so the index holds what is on
 * screen, the live canvas or a parked composition alike. Inside a boundary the renderer hosts each
 * component in an element of its own and sets the component's resolved node on it — web_core's
 * `A2uiWebComponentElement` contract — so a component of a React implementation and one of a
 * custom element, the basic catalog's, are read alike, and nothing of the shell's stands in a
 * vendor's DOM.
 *
 * A component is bound to a path when one of its properties binds exactly that path, a `{path}`
 * inside a function call's arguments included; or it is the root of a template instance whose
 * base path is that path; or it owns a template child list over it. What a component binds is
 * read when it is asked, never kept: a repaint changes properties under a mounted component.
 */
import {createContext} from 'react';
import {ComponentContext} from '@a2ui/web_core/v0_9';
import type {A2uiWebComponentElement} from '@a2ui/web_core/v0_9/universal';

/** The index the mounted canvas owns; with none provided, boundaries register nowhere. */
export const BindingIndexContext = createContext<BindingIndex | null>(null);

export interface IndexedComponent {
  context: ComponentContext;
  /** It is the root of a template instance: its base path is not its parent's. */
  instanceRoot: boolean;
  /** The element the renderer hosts it in. */
  element: Element;
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

/** The context of the component an element hosts; none for an element hosting no component. */
function contextOf(element: Element): ComponentContext | undefined {
  const host = element as Partial<A2uiWebComponentElement>;
  const context = host.node?.context ?? host.context;
  return context instanceof ComponentContext ? context : undefined;
}

/** The components hosted inside a boundary, in document order. */
export function componentsIn(boundary: Element): IndexedComponent[] {
  const components: IndexedComponent[] = [];
  /** Each component element's base path, for the components hosted inside it. */
  const basePaths = new Map<Element, string>();
  for (const element of boundary.querySelectorAll('*')) {
    const context = contextOf(element);
    if (!context) continue;
    const basePath = context.dataContext.path;
    basePaths.set(element, basePath);
    let parent = element.parentElement;
    while (parent && parent !== boundary && !basePaths.has(parent)) parent = parent.parentElement;
    const parentPath = parent ? basePaths.get(parent) : undefined;
    components.push({
      context,
      element,
      instanceRoot: parentPath !== undefined && parentPath !== basePath,
    });
  }
  return components;
}

/**
 * Where a component is on the page: its element when that draws a box, else the first element
 * inside it that does — a child's, where it draws none of its own. Undefined when nothing does.
 */
export function boxOf(element: Element): HTMLElement | undefined {
  if (!(element instanceof HTMLElement)) return undefined;
  if (getComputedStyle(element).display !== 'contents') return element;
  for (const child of element.children) {
    const box = boxOf(child);
    if (box) return box;
  }
  return undefined;
}

export interface BindingIndex {
  /** A fragment's boundary mounted, holding the surface's components; the returned function is its unmount. */
  register(surfaceId: string, boundary: Element): () => void;
  /** The root data model of a surface some mounted component renders; undefined when none does. */
  modelOf(surfaceId: string): unknown;
  /**
   * The element bound to the path or, walking up one segment at a time, to its nearest bound
   * ancestor — the first in document order where several are. Undefined when nothing mounted
   * under the surface binds any prefix of the path.
   */
  nearest(surfaceId: string, path: string): HTMLElement | undefined;
}

export function createBindingIndex(): BindingIndex {
  const boundaries = new Map<Element, string>();

  const mounted = (surfaceId: string) =>
    [...boundaries]
      .filter(([, id]) => id === surfaceId)
      .flatMap(([boundary]) => componentsIn(boundary));

  return {
    register: (surfaceId, boundary) => {
      boundaries.set(boundary, surfaceId);
      return () => boundaries.delete(boundary);
    },
    modelOf: surfaceId => mounted(surfaceId)[0]?.context.dataContext.dataModel.get('/'),
    nearest: (surfaceId, path) => {
      const components = mounted(surfaceId);
      for (let at = normalize(path); at !== ''; at = at.slice(0, at.lastIndexOf('/'))) {
        const bound = components.filter(component => isBoundTo(component, at));
        const [first] = bound
          .flatMap(component => boxOf(component.element) ?? [])
          .sort((a, b) =>
            a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
          );
        if (first) return first;
      }
      return undefined;
    },
  };
}
