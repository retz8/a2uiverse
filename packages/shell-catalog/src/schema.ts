/**
 * The catalog's React-free face (task-5.4 decision 5): the component APIs — upstream's basic
 * catalog from `@a2ui/web_core`, the shell primitives' own zod schemas — and the declared
 * functions, as one `Catalog` of APIs. What a headless `MessageProcessor` validates a
 * model-authored tree against, in a process that renders nothing; the same schemas the
 * rendering catalog `createCatalog` builds binds its React implementations to, so the two faces cannot disagree
 * about a prop. Imports no React and no stylesheet.
 */
import {
  BASIC_COMPONENTS,
  BASIC_FUNCTIONS,
  Catalog,
  type ComponentApi,
  type FunctionImplementation,
} from '@a2ui/web_core/v0_9';
import {CATALOG_ID} from './catalog-id.js';
import {AttributionApi} from './components/attribution/attribution.schema.js';
import {DerivedValueApi} from './components/derived-value/derived-value.schema.js';
import {FrameApi} from './components/frame/frame.schema.js';
import {SlotApi} from './components/slot/slot.schema.js';
import {SortControlApi} from './components/sort-control/sort-control.schema.js';
import {TableApi, TableRowApi} from './components/table/table.schema.js';
import {DataListApi, DataListItemApi} from './components/data-list/data-list.schema.js';
import {operatorFunctions, OPERATORS, type Operator} from './functions/operators.js';
import {SHELL_ACTIONS, shellActionFunctions} from './functions/shell-actions.js';

export {CATALOG_ID, OPERATORS, SHELL_ACTIONS, type Operator};
export {
  AttributionApi,
  DataListApi,
  DataListItemApi,
  DerivedValueApi,
  FrameApi,
  SlotApi,
  SortControlApi,
  TableApi,
  TableRowApi,
};

/** The shell primitives' APIs: what this catalog adds to the basic catalog. */
export const SHELL_COMPONENT_APIS: readonly ComponentApi[] = [
  SlotApi,
  AttributionApi,
  FrameApi,
  DerivedValueApi,
  SortControlApi,
  TableApi,
  TableRowApi,
  DataListApi,
  DataListItemApi,
];

/**
 * The catalog as APIs only — for validation, never for rendering. Its shell actions are bound to a
 * handler that does nothing: a validating process opens no page (task-6.2 decision 2).
 */
export const SCHEMA_CATALOG: Catalog<ComponentApi> = new Catalog<ComponentApi>(
  CATALOG_ID,
  [...BASIC_COMPONENTS, ...SHELL_COMPONENT_APIS],
  [
    ...(BASIC_FUNCTIONS as FunctionImplementation[]),
    ...operatorFunctions,
    ...shellActionFunctions(() => {}),
  ],
);
