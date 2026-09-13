/**
 * The shell catalog's two keep-sets (task-6.3 decision 5), one per author, named by the surface
 * each paints: what of the catalog the Synthesizer may write into the synthesis surface, and what
 * the Planner may write into the layout surface. An author is shown the catalog pruned to its
 * keep-set, and its output is validated against that same pruned catalog.
 */
import type {KeepSet} from '@a2uiverse/sdk';
import {OPERATORS} from './functions/operators.js';
import {SHELL_ACTIONS} from './functions/shell-actions.js';

/** The synthesis surface (`shell:synthesis`): the merged view's shapes over the formula operators. */
export const SYNTHESIS_SURFACE_KEEP_SET: KeepSet = {
  components: [
    'DerivedValue',
    'SortControl',
    'Table',
    'TableRow',
    'DataList',
    'DataListItem',
    'Text',
    'Column',
    'Row',
    'Card',
    'Divider',
  ],
  functions: [...OPERATORS],
};

/** The layout surface (`shell:main`): slots, the shell's own words around them, and the shell's actions. */
export const LAYOUT_SURFACE_KEEP_SET: KeepSet = {
  components: [
    'Slot',
    'Row',
    'Column',
    'Card',
    'Text',
    'Divider',
    'DataList',
    'DataListItem',
    'Table',
    'TableRow',
    'Button',
  ],
  functions: [...SHELL_ACTIONS],
};
