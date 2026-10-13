/**
 * Publish's small parts, drawn to the design canvas's Publish boards: its buttons, a field with
 * its hint and what is wrong with it, Stellify's term beside a plain word (task-14.2 decision 12),
 * the Store's findings kept verbatim (task-14.9 decision 10), and a notice in the page's notice
 * shape.
 */
import {useId, type ComponentProps, type InputHTMLAttributes, type ReactNode} from 'react';
import {Button} from '@radix-ui/themes';
import {BadIcon, DoneIcon, ErrorIcon, WarnIcon} from '../icons';
import type {Spoken, Words} from './publishWords';

/** The canvas's buttons: its looks, and its three heights — 28, 32 and 36px. */
export type ButtonLook = 'default' | 'primary' | 'soft' | 'quiet' | 'danger' | 'danger-quiet';

const LOOKS: Record<
  ButtonLook,
  Pick<ComponentProps<typeof Button>, 'variant' | 'color' | 'highContrast'>
> = {
  default: {variant: 'outline', color: 'gray', highContrast: true},
  primary: {variant: 'solid'},
  soft: {variant: 'soft'},
  quiet: {variant: 'soft', color: 'gray'},
  danger: {variant: 'solid', color: 'red'},
  'danger-quiet': {variant: 'outline', color: 'red'},
};

/** A button as the canvas draws it, on Radix: its look, and small, regular or large. */
export function PageButton({
  look = 'default',
  height = 'regular',
  className,
  ...props
}: {look?: ButtonLook; height?: 'small' | 'regular' | 'large'} & Omit<
  ComponentProps<typeof Button>,
  'variant' | 'color' | 'size'
>) {
  const classes = [
    'publish-btn',
    `publish-btn--${look}`,
    height === 'small' && 'publish-btn--small',
    height === 'large' && 'publish-btn--large',
    className,
  ].filter(Boolean);
  return <Button size="2" {...LOOKS[look]} className={classes.join(' ')} {...props} />;
}

/** Stellify's term beside a plain word. */
export const Term = ({children}: {children: ReactNode}) => (
  <span className="publish-term">{children}</span>
);

/** A sentence with its terms drawn beside its plain words, a space before each. */
export const SpokenText = ({spoken}: {spoken: Spoken}) => (
  <>
    {spoken.map((part, index) =>
      typeof part === 'string' ? (
        part
      ) : (
        <span key={index}>
          {' '}
          <Term>{part.term}</Term>
        </span>
      ),
    )}
  </>
);

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
  hint?: string;
  error?: string;
}

/** One field: its label, the input, and what is wrong with it in place of its hint. */
export function Field({label, hint, error, ...input}: FieldProps) {
  const id = useId();
  const described = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className="publish-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={described}
        {...input}
      />
      {error && (
        <span className="publish-error" id={`${id}-error`}>
          <ErrorIcon />
          {error}
        </span>
      )}
      {hint && !error && (
        <span className="publish-hint" id={`${id}-hint`}>
          {hint}
        </span>
      )}
    </div>
  );
}

/** What the Store found, or its summary and notes, as it worded them, under a plain label. */
export function Findings({
  label,
  term,
  lines,
}: {
  label: string;
  term: string;
  lines: readonly string[];
}) {
  if (lines.length === 0) return null;
  return (
    <div className="publish-findings-block">
      <span className="publish-note">
        {label} <Term>({term})</Term>
      </span>
      <ul className="publish-findings">
        {lines.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

/** Each tone's icon, as the canvas draws it: refused or failed a circled mark, a warning a triangle. */
const TONE_ICONS = {
  done: <DoneIcon />,
  warn: <WarnIcon />,
  bad: <BadIcon />,
  quiet: null,
} as const;

/** A notice in the page's shape: its tone and its icon, its lead in bold and the rest. */
export function Notice({
  tone,
  icon,
  words,
  children,
  testId,
  role,
}: {
  tone: 'done' | 'warn' | 'bad' | 'quiet';
  icon?: ReactNode;
  words: Words;
  children?: ReactNode;
  testId?: string;
  role?: 'status' | 'alert';
}) {
  return (
    <div
      className={tone === 'quiet' ? 'store-notice' : `store-notice store-notice--${tone}`}
      role={role}
      data-testid={testId}
    >
      {icon ?? TONE_ICONS[tone]}
      <div className="store-notice__grow">
        <span>
          <b>{words.lead}</b>
          {words.rest && ` ${words.rest}`}
        </span>
        {children}
      </div>
    </div>
  );
}
