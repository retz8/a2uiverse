import {BASIC_FUNCTIONS, Catalog, type FunctionImplementation} from '@a2ui/web_core/v0_9';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import {CATALOG_ID} from './catalog-id.js';
import {TextComponent} from './components/text/index.js';
import {ImageComponent} from './components/image/index.js';
import {IconComponent} from './components/icon/index.js';
import {VideoComponent} from './components/video/index.js';
import {AudioPlayerComponent} from './components/audio-player/index.js';
import {RowComponent} from './components/row/index.js';
import {ColumnComponent} from './components/column/index.js';
import {ListComponent} from './components/list/index.js';
import {CardComponent} from './components/card/index.js';
import {TabsComponent} from './components/tabs/index.js';
import {ModalComponent} from './components/modal/index.js';
import {DividerComponent} from './components/divider/index.js';
import {ButtonComponent} from './components/button/index.js';
import {TextFieldComponent} from './components/text-field/index.js';
import {CheckBoxComponent} from './components/check-box/index.js';
import {ChoicePickerComponent} from './components/choice-picker/index.js';
import {SliderComponent} from './components/slider/index.js';
import {DateTimeInputComponent} from './components/date-time-input/index.js';
import {createSlotComponent} from './components/slot/index.js';
import {AttributionComponent} from './components/attribution/index.js';
import {FrameComponent} from './components/frame/index.js';
import {DerivedValueComponent} from './components/derived-value/index.js';
import {SortControlComponent} from './components/sort-control/index.js';
import {TableComponent, TableRowComponent} from './components/table/index.js';
import {DataListComponent, DataListItemComponent} from './components/data-list/index.js';
import {operatorFunctions} from './functions/operators.js';
import {shellActionFunctions, type ShellActionHandler} from './functions/shell-actions.js';

export {OPERATORS, type Operator} from './functions/operators.js';
export {
  SHELL_ACTIONS,
  type ShellAction,
  type ShellActionHandler,
  type ShellActionName,
} from './functions/shell-actions.js';

/**
 * The basic catalog's eighteen components, each implemented on Radix Themes (SPEC §4.2,
 * task-5.9 decisions 1–2) against the API `@a2ui/web_core` declares for it — the same API the
 * React-free face (`schema.ts`) validates against, so the two faces cannot disagree about a prop.
 */
export const BASIC_IMPLEMENTATIONS: readonly ReactComponentImplementation[] = [
  TextComponent,
  ImageComponent,
  IconComponent,
  VideoComponent,
  AudioPlayerComponent,
  RowComponent,
  ColumnComponent,
  ListComponent,
  CardComponent,
  TabsComponent,
  ModalComponent,
  DividerComponent,
  ButtonComponent,
  TextFieldComponent,
  CheckBoxComponent,
  ChoicePickerComponent,
  SliderComponent,
  DateTimeInputComponent,
];

/**
 * The shell's own primitives — composition, layout, synthesis and the merged view's shapes — also
 * on Radix Themes. `Slot` is bound to the host's shell-action handler: its capability tile raises
 * `openStore`.
 */
function shellImplementations(onShellAction: ShellActionHandler): ReactComponentImplementation[] {
  return [
    createSlotComponent(onShellAction),
    AttributionComponent,
    FrameComponent,
    DerivedValueComponent,
    SortControlComponent,
    TableComponent,
    TableRowComponent,
    DataListComponent,
    DataListItemComponent,
  ];
}

export interface CreateCatalogOptions {
  /** What the host does when a shell surface raises `openStore` or `openAppLibrary`. */
  onShellAction: ShellActionHandler;
}

/**
 * The shell's runtime catalog, built for one host (task-6.2 decision 2): the basic catalog mapped
 * onto Radix Themes, the shell primitives, the basic functions as upstream implements them, the
 * formula operators, and the shell's two actions bound to the host's handler.
 */
export function createCatalog({
  onShellAction,
}: CreateCatalogOptions): Catalog<ReactComponentImplementation> {
  return new Catalog<ReactComponentImplementation>(
    CATALOG_ID,
    [...BASIC_IMPLEMENTATIONS, ...shellImplementations(onShellAction)],
    [
      ...(BASIC_FUNCTIONS as FunctionImplementation[]),
      ...operatorFunctions,
      ...shellActionFunctions(onShellAction),
    ],
  );
}
