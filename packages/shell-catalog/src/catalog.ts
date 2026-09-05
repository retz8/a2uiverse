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
import {SlotComponent} from './components/slot/index.js';
import {AttributionComponent} from './components/attribution/index.js';
import {FrameComponent} from './components/frame/index.js';
import {DerivedValueComponent} from './components/derived-value/index.js';
import {SortControlComponent} from './components/sort-control/index.js';
import {operatorFunctions} from './functions/operators.js';

export {OPERATORS, type Operator} from './functions/operators.js';

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

/** The shell's own primitives — composition, layout and synthesis — also on Radix Themes. */
export const SHELL_IMPLEMENTATIONS: readonly ReactComponentImplementation[] = [
  SlotComponent,
  AttributionComponent,
  FrameComponent,
  DerivedValueComponent,
  SortControlComponent,
];

/**
 * The shell's runtime catalog: the basic catalog mapped onto Radix Themes, the composition
 * primitives, the basic functions as upstream implements them, and the formula operators.
 */
export const CATALOG = new Catalog<ReactComponentImplementation>(
  CATALOG_ID,
  [...BASIC_IMPLEMENTATIONS, ...SHELL_IMPLEMENTATIONS],
  [...(BASIC_FUNCTIONS as FunctionImplementation[]), ...operatorFunctions],
);
