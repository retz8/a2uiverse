/**
 * Renders an A2UI tree through the real renderer — `MessageProcessor` → `A2uiSurface` — under the
 * Provider, so a test exercises the binder path and the schemas, not a view in isolation. The
 * surface is returned so a test can read what a two-way binding wrote to its data model.
 */
import {render, type RenderResult} from '@testing-library/react';
import type {ReactNode} from 'react';
import {A2uiSurface, type ReactComponentImplementation} from '@a2ui/react/v0_9';
import {MessageProcessor, type SurfaceModel} from '@a2ui/web_core/v0_9';
import type {A2uiClientAction} from '@a2ui/web_core/v0_9';
import {CATALOG} from '../catalog.js';
import {CATALOG_ID} from '../catalog-id.js';
import {Provider} from '../provider.js';

export type TreeComponent = {id: string; component: string} & Record<string, unknown>;

export interface TreeOptions {
  /** The surface's data model root, written before the components. */
  data?: Record<string, unknown>;
  /** Wraps the Provider — a context the tree needs, such as a slot-content resolver. */
  wrap?: (node: ReactNode) => ReactNode;
  /** Receives every action the surface dispatches. */
  onAction?: (action: A2uiClientAction) => void;
}

export const SURFACE_ID = 'test';

/** A surface holding the tree, validated by the processor against the catalog's schemas. */
export function surfaceFor(
  components: TreeComponent[],
  options: TreeOptions = {},
): {
  surface: SurfaceModel<ReactComponentImplementation>;
  processor: MessageProcessor<ReactComponentImplementation>;
} {
  const processor = new MessageProcessor<ReactComponentImplementation>([CATALOG], options.onAction);
  processor.processMessages([
    {version: 'v0.9', createSurface: {surfaceId: SURFACE_ID, catalogId: CATALOG_ID}},
    ...(options.data
      ? [
          {
            version: 'v0.9',
            updateDataModel: {surfaceId: SURFACE_ID, path: '/', value: options.data},
          },
        ]
      : []),
    {version: 'v0.9', updateComponents: {surfaceId: SURFACE_ID, components}},
  ] as never);
  const surface = processor.model.surfacesMap.get(SURFACE_ID);
  if (!surface) throw new Error('surface was not created');
  return {surface, processor};
}

export function renderTree(
  components: TreeComponent[],
  options: TreeOptions = {},
): RenderResult & {surface: SurfaceModel<ReactComponentImplementation>} {
  const {surface} = surfaceFor(components, options);
  const node = (
    <Provider>
      <A2uiSurface surface={surface} />
    </Provider>
  );
  const result = render(options.wrap ? options.wrap(node) : node);
  return {...result, surface};
}

/** The elements the tree rendered inside the Provider's wrapper — everything but the portal anchor. */
export function renderedElements(container: HTMLElement): Element[] {
  const wrapper = container.querySelector('.a2uiverse-shell-catalog');
  if (!wrapper) return [];
  return [...wrapper.children].filter(el => !el.hasAttribute('data-a2uiverse-portal-root'));
}
