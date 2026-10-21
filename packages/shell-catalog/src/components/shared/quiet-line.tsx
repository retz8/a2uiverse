import type {CSSProperties, ReactNode, Ref} from 'react';
import {Link} from '@radix-ui/themes';

/** A button drawn as a link: the quiet line's presses — Sign in, Cancel, Update, Search the Store. */
export const linkButtonStyle: CSSProperties = {
  background: 'none',
  border: 0,
  padding: 0,
  font: 'inherit',
  cursor: 'pointer',
};

/** The quiet line's separator: a 3px dot between the sentence and its press. */
export const dotStyle: CSSProperties = {
  width: 3,
  height: 3,
  borderRadius: 2,
  background: 'var(--gray-8)',
  flex: 'none',
};

/**
 * The link button's own look: the Link's size and weight kept — `font: inherit` would take the
 * parent's — the page's family.
 */
const linkStyle: CSSProperties = {
  background: 'none',
  border: 0,
  padding: 0,
  fontFamily: 'inherit',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

export function Dot() {
  return <span aria-hidden style={dotStyle} />;
}

/** A quiet line's press: a button in the link register; `ink` for a name, as a list's title. */
export function LinkButton({
  children,
  disabled,
  buttonRef,
  ink,
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
  ink?: boolean;
  onClick: (button: HTMLButtonElement) => void;
}) {
  return (
    <Link
      asChild
      size="2"
      weight={ink ? 'bold' : 'medium'}
      {...(ink ? {color: 'gray', highContrast: true, underline: 'hover'} : {})}
    >
      <button
        type="button"
        style={linkStyle}
        disabled={disabled}
        ref={buttonRef}
        onClick={event => onClick(event.currentTarget)}
      >
        {children}
      </button>
    </Link>
  );
}

/** The update tile's glyph: an arrow up in a circle (the design canvas's U1). */
export function UpdateGlyph() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{flex: 'none'}}
    >
      <circle cx="7" cy="7" r="5.5" />
      <path d="M7 9.8V4.4M4.8 6.4L7 4.2l2.2 2.2" />
    </svg>
  );
}

/** A refusal's glyph: a mark in a circle (the design canvas's O7 and U4). */
export function AlertGlyph() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      style={{flex: 'none'}}
    >
      <circle cx="8" cy="8" r="6.2" />
      <path d="M8 4.8v3.8" />
      <circle cx="8" cy="11" r=".6" fill="currentColor" stroke="none" />
    </svg>
  );
}
