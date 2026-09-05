/** @a2uiverse/shell-catalog — the shell's paint vocabulary: the basic catalog on Radix Themes + composition primitives. */
export {
  BASIC_IMPLEMENTATIONS,
  CATALOG,
  OPERATORS,
  SHELL_IMPLEMENTATIONS,
  type Operator,
} from './catalog.js';
export {CATALOG_ID} from './catalog-id.js';
export {PortalRootContext, Provider} from './provider.js';
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
export {ICON_GLYPHS, ICON_NAMES, type GlyphEntry, type IconName} from './components/icon/index.js';
