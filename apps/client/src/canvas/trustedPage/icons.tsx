/**
 * The trusted page's icons, drawn to the design canvas's boards: stroke icons in the text's color,
 * hidden from assistive technology — the words beside each carry the meaning.
 */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Up to date, installed, a permission held. */
export const TickIcon = ({size = 12}: {size?: number}) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 12 12"
    {...stroke}
    strokeWidth="1.6"
  >
    <path d="M2.5 6.2l2.2 2.1L9.5 3.5" />
  </svg>
);

/** The way back to a list. */
export const BackIcon = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" {...stroke} strokeWidth="1.5">
    <path d="M8.5 3L4.5 7l4 4" />
  </svg>
);

/** A row that opens a view. */
export const ChevronIcon = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" {...stroke} strokeWidth="1.5">
    <path d="M5.5 3l4 4-4 4" />
  </svg>
);

/** Something done. */
export const DoneIcon = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" {...stroke} strokeWidth="1.6">
    <circle cx="8" cy="8" r="6.2" />
    <path d="M5.2 8.2l2 1.9 3.6-3.8" />
  </svg>
);

/** Something to look at before going on. */
export const WarnIcon = ({size = 16}: {size?: number}) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 16 16"
    {...stroke}
    strokeWidth="1.5"
  >
    <path d="M8 2.2l6.2 11H1.8z" />
    <path d="M8 6.4v3" />
    <circle cx="8" cy="11.3" r=".5" fill="currentColor" stroke="none" />
  </svg>
);

/** An update waiting. */
export const UpdateIcon = () => (
  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" {...stroke} strokeWidth="1.4">
    <circle cx="6" cy="6" r="4.8" />
    <path d="M6 8.2V3.9M4.2 5.6L6 3.8l1.8 1.8" />
  </svg>
);

/** On its way. */
export const ClockIcon = () => (
  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" {...stroke} strokeWidth="1.4">
    <circle cx="6" cy="6" r="4.8" />
    <path d="M6 3.6V6l1.6 1" />
  </svg>
);

/** Installed from this computer. */
export const ComputerIcon = () => (
  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" {...stroke} strokeWidth="1.3">
    <rect x="1.5" y="2" width="9" height="6" rx="1" />
    <path d="M4 10.2h4M6 8v2.2" />
  </svg>
);

/** Add another. */
export const PlusIcon = ({size = 14}: {size?: number}) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 14 14"
    {...stroke}
    strokeWidth="1.5"
  >
    <path d="M7 2.5v9M2.5 7h9" />
  </svg>
);

/** An account connected with a key. */
export const KeyIcon = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" {...stroke} strokeWidth="1.4">
    <circle cx="4.5" cy="9.5" r="2.5" />
    <path d="M6.3 7.7L11.5 2.5M9.5 4.5l1.5 1.5" />
  </svg>
);

/** A packed folder. */
export const FolderIcon = ({size = 16}: {size?: number}) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 20 20"
    {...stroke}
    strokeWidth="1.4"
  >
    <path d="M2.5 6.5a1.5 1.5 0 0 1 1.5-1.5h3.6l1.6 1.8H16a1.5 1.5 0 0 1 1.5 1.5v6.7A1.5 1.5 0 0 1 16 16.5H4A1.5 1.5 0 0 1 2.5 15z" />
  </svg>
);

/** A file. */
export const FileIcon = ({size = 16}: {size?: number}) => (
  <svg
    aria-hidden="true"
    width={size}
    height={size}
    viewBox="0 0 20 20"
    {...stroke}
    strokeWidth="1.4"
  >
    <path d="M5 2.5h6.5L15 6v11.5H5z" />
    <path d="M11.5 2.5V6H15" />
  </svg>
);

/** Copy to the clipboard. */
export const CopyIcon = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" {...stroke} strokeWidth="1.3">
    <rect x="4.5" y="4.5" width="7" height="7" rx="1.4" />
    <path d="M9.5 4.5V3.2a.7.7 0 0 0-.7-.7H3.2a.7.7 0 0 0-.7.7v5.6c0 .4.3.7.7.7h1.3" />
  </svg>
);

/** See it bigger. */
export const EnlargeIcon = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" {...stroke} strokeWidth="1.4">
    <path d="M8.5 2.5h3v3M11.5 2.5L8 6M5.5 11.5h-3v-3M2.5 11.5L6 8" />
  </svg>
);

/** Take it off the list. */
export const RemoveIcon = () => (
  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16" {...stroke} strokeWidth="1.8">
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

/** What is wrong with a field. */
export const ErrorIcon = () => (
  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" {...stroke} strokeWidth="1.4">
    <circle cx="6" cy="6" r="4.8" />
    <path d="M6 3.8v2.6" />
    <circle cx="6" cy="8.4" r=".4" fill="currentColor" stroke="none" />
  </svg>
);

/** Something refused or failed. */
export const BadIcon = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" {...stroke} strokeWidth="1.5">
    <circle cx="8" cy="8" r="6.2" />
    <path d="M8 4.8v3.8" />
    <circle cx="8" cy="11" r=".6" fill="currentColor" stroke="none" />
  </svg>
);
