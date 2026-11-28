/**
 * Renders an A2UI tree through the real renderer — `MessageProcessor` → `A2uiSurface` — under the
 * Provider, so a test exercises the binder path and the schemas, not a view in isolation. Every
 * tree is first held to the sdk's schema-form check against the v1.0 catalog document (task-21.12
 * decision 9), so no test passes on a form the v1.0 schema refuses. The surface is returned so a
 * test can read what a two-way binding wrote to its data model, with every error the surface
 * reported.
 */
import {readFileSync} from 'node:fs';
import {render, type RenderResult} from '@testing-library/react';
import {createSchemaFormCheck, type A2uiCatalogSchema} from '@a2uiverse/sdk';
import type {ReactNode} from 'react';
import {A2uiSurface, type ReactComponentImplementation} from '@a2ui/react';
import {MessageProcessor, type A2uiErrorPayload, type SurfaceModel} from '@a2ui/web_core/v1_0';
import type {ActionListener} from '@a2ui/web_core/v1_0';
import {
  type SourceName,
  createCatalog,
  type NavigationHandler,
  type PressHandler,
  type ShellActionHandler,
  type SignInHandler,
} from '../catalog.js';
import type {AppActHandler} from '../app-act.js';
import {CATALOG_ID} from '../catalog-id.js';
import {Provider} from '../provider.js';

export type TreeComponent = {id: string; component: string} & Record<string, unknown>;

export interface TreeOptions {
  /** The surface's data model root, written before the components. */
  data?: Record<string, unknown>;
  /** Wraps the Provider — a context the tree needs, such as a slot-content resolver. */
  wrap?: (node: ReactNode) => ReactNode;
  /** Receives every action the surface dispatches. */
  onAction?: ActionListener;
  /** Receives every shell action a button or a capability tile raises. */
  onShellAction?: ShellActionHandler;
  /** Receives every press a failure tile or a merged view's line raises. */
  onPress?: PressHandler;
  /** Receives every sign-in an authority tile or an escalation card raises. */
  onSignIn?: SignInHandler;
  /** Receives every Install, Update and Show it here an offer or an update tile raises. */
  onAppAct?: AppActHandler;
  /** Receives every navigation a derived-value cell raises. */
  onNavigate?: NavigationHandler;
  /** The host's display names for apps. */
  sourceName?: SourceName;
  /**
   * The tree is one the v1.0 schema refuses, on purpose: the schema-form check must find something
   * in it, and the tree is still handed to the processor.
   */
  refused?: boolean;
}

export const SURFACE_ID = 'test';

// Path from the package root (vitest's cwd); import.meta.url is http-scheme under jsdom.
const SCHEMA_FORM = createSchemaFormCheck({
  catalog: JSON.parse(readFileSync('catalogs/v1.0/catalog.json', 'utf8')) as A2uiCatalogSchema,
});

/** The messages that paint the tree, held to the v1.0 schema's form. */
export function holdToSchemaForm(messages: unknown[], refused = false): void {
  const findings = SCHEMA_FORM.agentToRenderer(messages);
  if (refused) {
    if (findings.length === 0) throw new Error('a tree marked refused passes the v1.0 schema');
    return;
  }
  if (findings.length > 0) {
    throw new Error(
      `the tree is not in the v1.0 schema's form:\n${findings
        .map(f => `  ${f.path}: ${f.message}`)
        .join('\n')}`,
    );
  }
}

/**
 * A surface holding the tree, validated by the processor against the catalog's schemas, and the
 * errors the surface reports from its creation on.
 */
export function surfaceFor(
  components: TreeComponent[],
  options: TreeOptions = {},
): {
  surface: SurfaceModel<ReactComponentImplementation>;
  processor: MessageProcessor<ReactComponentImplementation>;
  errors: A2uiErrorPayload[];
} {
  const processor = new MessageProcessor<ReactComponentImplementation>(
    [
      createCatalog({
        onShellAction: options.onShellAction ?? (() => {}),
        onPress: options.onPress,
        onSignIn: options.onSignIn,
        onAppAct: options.onAppAct,
        onNavigate: options.onNavigate,
        sourceName: options.sourceName,
      }),
    ],
    options.onAction,
  );
  const create = {version: '1.0', createSurface: {surfaceId: SURFACE_ID, catalogId: CATALOG_ID}};
  const paint = [
    ...(options.data
      ? [
          {
            version: '1.0',
            updateDataModel: {surfaceId: SURFACE_ID, path: '/', value: options.data},
          },
        ]
      : []),
    {version: '1.0', updateComponents: {surfaceId: SURFACE_ID, components}},
  ];
  holdToSchemaForm([create, ...paint], options.refused);
  processor.processMessages([create] as never);
  const surface = processor.model.surfacesMap.get(SURFACE_ID);
  if (!surface) throw new Error('surface was not created');
  const errors: A2uiErrorPayload[] = [];
  surface.onError.subscribe(error => {
    errors.push(error);
  });
  processor.processMessages(paint as never);
  return {surface, processor, errors};
}

export function renderTree(
  components: TreeComponent[],
  options: TreeOptions = {},
): RenderResult & {
  surface: SurfaceModel<ReactComponentImplementation>;
  processor: MessageProcessor<ReactComponentImplementation>;
  errors: A2uiErrorPayload[];
} {
  const {surface, processor, errors} = surfaceFor(components, options);
  const node = (
    <Provider>
      <A2uiSurface surface={surface} />
    </Provider>
  );
  const result = render(options.wrap ? options.wrap(node) : node);
  return {...result, surface, processor, errors};
}

/** The renderer hosts each component in an element of its own, `a2ui-react-<name>`. */
const COMPONENT_ELEMENT = /^A2UI-REACT-/;

/** The elements the renderer hosts the tree's components in. */
export function componentElements(container: HTMLElement): Element[] {
  return [...container.querySelectorAll('*')].filter(el => COMPONENT_ELEMENT.test(el.tagName));
}

/**
 * The elements the tree's components drew inside the Provider's wrapper — everything but the
 * elements hosting them and the portal anchor.
 */
export function renderedElements(container: HTMLElement): Element[] {
  const wrapper = container.querySelector('.a2uiverse-shell-catalog');
  if (!wrapper) return [];
  return [...wrapper.querySelectorAll('*')].filter(
    el => !COMPONENT_ELEMENT.test(el.tagName) && !el.closest('[data-a2uiverse-portal-root]'),
  );
}
