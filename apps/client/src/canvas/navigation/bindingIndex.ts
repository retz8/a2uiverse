/**
 * The reverse index (SPEC §7; task-7.7 decisions 2, 4, 5; task-16.7 decision 3): from a data path
 * of a partition to the component that renders it, read from the page at the moment of a tap.
 * Every fragment's boundary registers here, with the surface it holds, while it is mounted, so the
 * index holds what is on screen, the live canvas or a parked composition alike. Inside a boundary
 * the renderer hosts each component in an element of its own and sets the component's resolved
 * node on it — web_core's `A2uiWebComponentElement` contract — so a component of a React
 * implementation and one of a custom element, the basic catalog's, are read alike, and nothing of
 * the shell's stands in a vendor's DOM.
 *
 * A component is bound to a path when one of its properties binds exactly that path, a
 * `{"@path"}` inside a function call's arguments included; or it is the root of a template
 * instance whose base path is that path; or it owns a template child list over it, whose `path`
 * v1.0 writes plain. What a component binds is
 * read from the surface's component model, by the node's component id, and resolved against the
 * node's data path, its base path (task-21.5 decision 6): the node's resolved props keep the path
 * of a property bound directly, and none inside a function call's arguments or of a template child
 * list. It is read when it is asked, never kept: a repaint changes properties under a mounted
 * component.
 */
import {createContext} from 'react';
import {DataContext, isComponentNode} from '@a2ui/web_core/v1_0';
import type {ComponentNode, SurfaceModel} from '@a2ui/web_core/v1_0';
import type {A2uiWebComponentElement} from '@a2ui/web_core/universal';
import type {ReactCatalogComponent} from '@a2ui/react';

/** The index the mounted canvas owns; with none provided, boundaries register nowhere. */
export const BindingIndexContext = createContext<BindingIndex | null>(null);

type Surface = SurfaceModel<ReactCatalogComponent>;

export interface IndexedComponent {
  /** The surface it is drawn on. */
  surface: Surface;
  /** The node the renderer resolved it to: its component id and its base path. */
  node: ComponentNode;
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
function propertyPaths({surface, node}: IndexedComponent): Set<string> {
  const paths = new Set<string>();
  const scope = new DataContext(surface.dataModel, node.dataPath);
  const visit = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (typeof value !== 'object' || value === null) return;
    const record = value as Record<string, unknown>;
    const bound = record['@path'] ?? record.path;
    if (typeof bound === 'string') paths.add(normalize(scope.resolvePath(bound)));
    Object.values(record).forEach(visit);
  };
  visit(surface.componentsModel.get(node.componentId)?.properties);
  return paths;
}

export function isBoundTo(component: IndexedComponent, path: string): boolean {
  if (component.instanceRoot && normalize(component.node.dataPath) === path) return true;
  return propertyPaths(component).has(path);
}

/** The resolved node an element hosts; none for an element hosting no component. */
function nodeOf(element: Element): ComponentNode | undefined {
  const {node} = element as Partial<A2uiWebComponentElement>;
  return isComponentNode(node) && !node.isPlaceholder ? node : undefined;
}

/** The components of `surface` hosted inside a boundary, in document order. */
export function componentsIn(surface: Surface, boundary: Element): IndexedComponent[] {
  const components: IndexedComponent[] = [];
  /** Each component element's base path, for the components hosted inside it. */
  const basePaths = new Map<Element, string>();
  for (const element of boundary.querySelectorAll('*')) {
    const node = nodeOf(element);
    if (!node) continue;
    const basePath = node.dataPath;
    basePaths.set(element, basePath);
    let parent = element.parentElement;
    while (parent && parent !== boundary && !basePaths.has(parent)) parent = parent.parentElement;
    const parentPath = parent ? basePaths.get(parent) : undefined;
    components.push({
      surface,
      node,
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
  register(surface: Surface, boundary: Element): () => void;
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
  const boundaries = new Map<Element, Surface>();

  const mounted = (surfaceId: string) =>
    [...boundaries]
      .filter(([, surface]) => surface.id === surfaceId)
      .flatMap(([boundary, surface]) => componentsIn(surface, boundary));

  return {
    register: (surface, boundary) => {
      boundaries.set(boundary, surface);
      return () => boundaries.delete(boundary);
    },
    modelOf: surfaceId => mounted(surfaceId)[0]?.surface.dataModel.get('/'),
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
