import type {ComponentProps, ComponentType} from 'react';
import {
  ArchiveIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  AvatarIcon,
  BackpackIcon,
  BellIcon,
  CalendarIcon,
  CameraIcon,
  CheckIcon,
  Cross1Icon,
  CrossCircledIcon,
  DotsHorizontalIcon,
  DotsVerticalIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
  DownloadIcon,
  EnvelopeClosedIcon,
  ExclamationTriangleIcon,
  EyeNoneIcon,
  EyeOpenIcon,
  FileTextIcon,
  GearIcon,
  Half2Icon,
  HamburgerMenuIcon,
  HeartFilledIcon,
  HeartIcon,
  HomeIcon,
  IdCardIcon,
  ImageIcon,
  InfoCircledIcon,
  Link1Icon,
  LockClosedIcon,
  LockOpen1Icon,
  MagnifyingGlassIcon,
  MobileIcon,
  PaperPlaneIcon,
  PauseIcon,
  Pencil1Icon,
  PersonIcon,
  PlayIcon,
  PlusIcon,
  QuestionMarkCircledIcon,
  ReloadIcon,
  SewingPinFilledIcon,
  Share1Icon,
  SpeakerLoudIcon,
  SpeakerOffIcon,
  SpeakerQuietIcon,
  StarFilledIcon,
  StarIcon,
  StopIcon,
  TrackNextIcon,
  TrackPreviousIcon,
  TrashIcon,
  UploadIcon,
} from '@radix-ui/react-icons';

/** A Radix Icons component: every glyph shares one prop shape, taken from any one of them. */
export type Glyph = ComponentType<ComponentProps<typeof CheckIcon>>;

/** One entry per name of the basic schema's `Icon.name` enum: the Radix Icons glyph that renders it. */
export interface GlyphEntry {
  glyph: Glyph;
  /**
   * Set when Radix Icons has no honest counterpart and this is the stated nearest glyph
   * (decision 3): the name still renders something legible in the icon's spirit, never a blank.
   */
  nearest?: string;
}

/**
 * The basic catalog's sixty icon names onto Radix Icons. Material's vocabulary (what the schema
 * enumerates) is wider than Radix's; where Radix has the glyph the mapping is direct, and where
 * it does not the entry names what it stands in with, so the substitution is on record beside
 * the name rather than discovered on screen.
 */
export const ICON_GLYPHS: Readonly<Record<IconName, GlyphEntry>> = {
  accountCircle: {glyph: AvatarIcon},
  add: {glyph: PlusIcon},
  arrowBack: {glyph: ArrowLeftIcon},
  arrowForward: {glyph: ArrowRightIcon},
  attachFile: {glyph: Link1Icon, nearest: 'a link, for want of a paperclip'},
  calendarToday: {glyph: CalendarIcon},
  call: {glyph: MobileIcon, nearest: 'a handset, for want of a receiver'},
  camera: {glyph: CameraIcon},
  check: {glyph: CheckIcon},
  close: {glyph: Cross1Icon},
  delete: {glyph: TrashIcon},
  download: {glyph: DownloadIcon},
  edit: {glyph: Pencil1Icon},
  event: {glyph: CalendarIcon, nearest: 'the calendar itself, for want of a dated one'},
  error: {glyph: CrossCircledIcon},
  fastForward: {glyph: DoubleArrowRightIcon},
  favorite: {glyph: HeartFilledIcon},
  favoriteOff: {glyph: HeartIcon},
  folder: {glyph: ArchiveIcon, nearest: 'an archive box, for want of a folder'},
  help: {glyph: QuestionMarkCircledIcon},
  home: {glyph: HomeIcon},
  info: {glyph: InfoCircledIcon},
  locationOn: {glyph: SewingPinFilledIcon, nearest: 'a pin, for want of a map marker'},
  lock: {glyph: LockClosedIcon},
  lockOpen: {glyph: LockOpen1Icon},
  mail: {glyph: EnvelopeClosedIcon},
  menu: {glyph: HamburgerMenuIcon},
  moreVert: {glyph: DotsVerticalIcon},
  moreHoriz: {glyph: DotsHorizontalIcon},
  notificationsOff: {glyph: BellIcon, nearest: 'the bell, for want of a struck-through one'},
  notifications: {glyph: BellIcon},
  pause: {glyph: PauseIcon},
  payment: {glyph: IdCardIcon, nearest: 'a card, for want of a payment card'},
  person: {glyph: PersonIcon},
  phone: {glyph: MobileIcon},
  photo: {glyph: ImageIcon},
  play: {glyph: PlayIcon},
  print: {glyph: FileTextIcon, nearest: 'a document, for want of a printer'},
  refresh: {glyph: ReloadIcon},
  rewind: {glyph: DoubleArrowLeftIcon},
  search: {glyph: MagnifyingGlassIcon},
  send: {glyph: PaperPlaneIcon},
  settings: {glyph: GearIcon},
  share: {glyph: Share1Icon},
  shoppingCart: {glyph: BackpackIcon, nearest: 'a bag, for want of a cart'},
  skipNext: {glyph: TrackNextIcon},
  skipPrevious: {glyph: TrackPreviousIcon},
  star: {glyph: StarFilledIcon},
  starHalf: {glyph: Half2Icon, nearest: 'a half-filled disc, for want of a half star'},
  starOff: {glyph: StarIcon},
  stop: {glyph: StopIcon},
  upload: {glyph: UploadIcon},
  visibility: {glyph: EyeOpenIcon},
  visibilityOff: {glyph: EyeNoneIcon},
  volumeDown: {glyph: SpeakerQuietIcon},
  volumeMute: {glyph: SpeakerOffIcon, nearest: 'the muted speaker, for want of a silent one'},
  volumeOff: {glyph: SpeakerOffIcon},
  volumeUp: {glyph: SpeakerLoudIcon},
  warning: {glyph: ExclamationTriangleIcon},
};

/** The basic schema's `Icon.name` enum, as `@a2ui/web_core` declares it. */
export type IconName =
  | 'accountCircle'
  | 'add'
  | 'arrowBack'
  | 'arrowForward'
  | 'attachFile'
  | 'calendarToday'
  | 'call'
  | 'camera'
  | 'check'
  | 'close'
  | 'delete'
  | 'download'
  | 'edit'
  | 'event'
  | 'error'
  | 'fastForward'
  | 'favorite'
  | 'favoriteOff'
  | 'folder'
  | 'help'
  | 'home'
  | 'info'
  | 'locationOn'
  | 'lock'
  | 'lockOpen'
  | 'mail'
  | 'menu'
  | 'moreVert'
  | 'moreHoriz'
  | 'notificationsOff'
  | 'notifications'
  | 'pause'
  | 'payment'
  | 'person'
  | 'phone'
  | 'photo'
  | 'play'
  | 'print'
  | 'refresh'
  | 'rewind'
  | 'search'
  | 'send'
  | 'settings'
  | 'share'
  | 'shoppingCart'
  | 'skipNext'
  | 'skipPrevious'
  | 'star'
  | 'starHalf'
  | 'starOff'
  | 'stop'
  | 'upload'
  | 'visibility'
  | 'visibilityOff'
  | 'volumeDown'
  | 'volumeMute'
  | 'volumeOff'
  | 'volumeUp'
  | 'warning';

export const ICON_NAMES = Object.keys(ICON_GLYPHS) as readonly IconName[];

export function isIconName(name: string): name is IconName {
  return Object.prototype.hasOwnProperty.call(ICON_GLYPHS, name);
}
