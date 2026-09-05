/** @a2uiverse/shell-catalog — the shell's paint vocabulary: basic catalog + composition primitives. */
export {CATALOG, OPERATORS, type Operator} from './catalog.js';
export {CATALOG_ID} from './catalog-id.js';
export {PortalRootContext, Provider, SHELL_TOKENS} from './provider.js';
export {SlotContentContext, type SlotContentResolver} from './slot-content.js';
export {FrameComponent, FrameView, FrameApi, type FrameProps} from './components/frame/index.js';
export {SlotApi, SlotView, type SlotProps} from './components/slot/index.js';
export {
  AttributionApi,
  AttributionView,
  type AttributionProps,
} from './components/attribution/index.js';
export {
  type CellObject,
  type CellState,
  cellState,
  DerivedValueApi,
  type DerivedValueProps,
  DerivedValueView,
  type Format,
} from './components/derived-value/index.js';
export {
  SortControlApi,
  type SortControlProps,
  SortControlView,
} from './components/sort-control/index.js';
