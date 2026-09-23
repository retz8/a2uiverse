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
import {createSlotComponent, type PressHandler} from './components/slot/index.js';
import {AttributionComponent} from './components/attribution/index.js';
import {
  type AppDisplayName,
  createDerivedValueComponent,
  type NavigationHandler,
} from './components/derived-value/index.js';
import {SortControlComponent} from './components/sort-control/index.js';
import {TableComponent, TableRowComponent} from './components/table/index.js';
import {DataListComponent, DataListItemComponent} from './components/data-list/index.js';
import {operatorFunctions} from './functions/operators.js';
import {relationFunctions} from './functions/relations.js';
import {shellActionFunctions, type ShellActionHandler} from './functions/shell-actions.js';

export {OPERATORS, type Operator} from './functions/operators.js';
export {
  RELATIONS,
  relationFunctions,
  relationKind,
  type RelationKind,
  type RelationOp,
} from './functions/relations.js';
export type {AppDisplayName, NavigationHandler} from './components/derived-value/index.js';
export type {PressHandler} from './components/slot/index.js';
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
 * The shell's own primitives — composition, synthesis and the merged view's shapes — also on
 * Radix Themes. `Slot` is bound to the host's shell-action and press handlers and its app names:
 * its capability tile raises `openStore`, its failure tile and the merged view's lines the reader's
 * presses. `DerivedValue` is bound to the host's navigation handler and app names (task-7.5
 * decisions 11, 13). Layout is the basic catalog's `Row` and `Column` (task-6.4 decision 4).
 */
function shellImplementations({
  onShellAction,
  onPress,
  onNavigate,
  appDisplayName,
}: CreateCatalogOptions): ReactComponentImplementation[] {
  return [
    createSlotComponent(onShellAction, {onPress, appDisplayName}),
    AttributionComponent,
    createDerivedValueComponent({onNavigate, appDisplayName}),
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
  /**
   * What the host does when the reader presses Retry, Include or Try again: send the composition
   * operation. Without it, no press button is drawn (task-8.5 decision 5).
   */
  onPress?: PressHandler;
  /**
   * What the host does when a derived-value cell is activated: land on the element its target
   * names. Without it, cells are not interactive.
   */
  onNavigate?: NavigationHandler;
  /** The host's display name for an app id; without one, the app id is shown. */
  appDisplayName?: AppDisplayName;
}

/**
 * The shell's runtime catalog, built for one host (task-6.2 decision 2): the basic catalog mapped
 * onto Radix Themes, the shell primitives, the basic functions as upstream implements them, the
 * formula operators, the relations, and the shell's two actions bound to the host's handler.
 */
export function createCatalog(
  options: CreateCatalogOptions,
): Catalog<ReactComponentImplementation> {
  const {onShellAction} = options;
  return new Catalog<ReactComponentImplementation>(
    CATALOG_ID,
    [...BASIC_IMPLEMENTATIONS, ...shellImplementations(options)],
    [
      ...(BASIC_FUNCTIONS as FunctionImplementation[]),
      ...operatorFunctions,
      ...relationFunctions,
      ...shellActionFunctions(onShellAction),
    ],
  );
}
