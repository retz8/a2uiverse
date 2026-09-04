import {Catalog} from '@a2ui/web_core/v0_9';
import {basicCatalog, type ReactComponentImplementation} from '@a2ui/react/v0_9';
import {CATALOG_ID} from './catalog-id.js';
import {SlotComponent} from './components/slot/index.js';
import {AttributionComponent} from './components/attribution/index.js';
import {FrameComponent} from './components/frame/index.js';
import {DerivedValueComponent} from './components/derived-value/index.js';
import {SortControlComponent} from './components/sort-control/index.js';
import {operatorFunctions} from './functions/operators.js';

export {OPERATORS, type Operator} from './functions/operators.js';

/**
 * The shell's runtime catalog: the basic catalog's implementations and functions
 * re-used as-is (SPEC §4.2 — no mapping of its own for those), plus the
 * composition primitives and the formula operators, which are its own.
 */
export const CATALOG = new Catalog<ReactComponentImplementation>(
  CATALOG_ID,
  [
    ...basicCatalog.components.values(),
    SlotComponent,
    AttributionComponent,
    FrameComponent,
    DerivedValueComponent,
    SortControlComponent,
  ],
  [...basicCatalog.functions.values(), ...operatorFunctions],
);
