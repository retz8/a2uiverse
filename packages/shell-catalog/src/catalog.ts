import {Catalog} from '@a2ui/web_core/v0_9';
import {basicCatalog, type ReactComponentImplementation} from '@a2ui/react/v0_9';
import {CATALOG_ID} from './catalog-id.js';
import {SlotComponent} from './components/slot/index.js';
import {AttributionComponent} from './components/attribution/index.js';

/**
 * The shell's runtime catalog: the basic catalog's implementations and functions
 * re-used as-is (SPEC §4.2 — no mapping of its own for those), plus the two
 * composition primitives, which are its own.
 */
export const CATALOG = new Catalog<ReactComponentImplementation>(
  CATALOG_ID,
  [...basicCatalog.components.values(), SlotComponent, AttributionComponent],
  [...basicCatalog.functions.values()],
);
