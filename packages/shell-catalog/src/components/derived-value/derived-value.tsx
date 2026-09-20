import {useContext, useState, type KeyboardEvent} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {parseSurfaceId} from '@a2uiverse/sdk';
import {Text, Tooltip} from '@radix-ui/themes';
import {PortalRootContext} from '../../provider.js';
import {formatInstant} from '../shared/instant.js';
import {type CellObject, DerivedValueApi, type Format} from './derived-value.schema.js';
import type {
  AppDisplayName,
  CellJoin,
  EvaluatedRelation,
  JoinMark,
  NavigationHandler,
} from './join.js';

export type CellState = 'complete' | 'partial' | 'absent';

export function cellState(cell: CellObject): CellState {
  if (cell.contributed === 0) return 'absent';
  if (cell.contributed < cell.of) return 'partial';
  return 'complete';
}

function formatValue(value: unknown, format: Format | undefined): string {
  if (value === undefined || value === null) return '—';
  if (format?.kind === 'currency' && typeof value === 'number') {
    return new Intl.NumberFormat(undefined, {style: 'currency', currency: format.currency}).format(
      value,
    );
  }
  if (format?.kind === 'number' && typeof value === 'number') return value.toLocaleString();
  if (format?.kind === 'datetime') return formatInstant(value);
  return String(value);
}

/** An app as the user knows it: the host's display name, the app id when the host has none. */
type NameOf = (appId: string) => string;

function contributorDetail(state: CellState, cell: CellObject, nameOf: NameOf): string {
  switch (state) {
    case 'absent':
      return 'no source is showing this';
    case 'partial': {
      const missing = cell.absent.map(s => nameOf(parseSurfaceId(s)?.appId ?? s)).join(', ');
      return `${cell.contributed} of ${cell.of} sources · ${missing} not showing this`;
    }
    case 'complete':
      return `${cell.contributed} of ${cell.of} sources`;
  }
}

function listed(names: string[]): string {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

function sideValue(value: unknown): string {
  if (value === undefined || value === null) return '—';
  return `“${Array.isArray(value) ? value.join(', ') : String(value)}”`;
}

/**
 * Where the value came from and what matched, in the Synthesizer's words; for a value whose tie is
 * in doubt, each relation's two values beside its name.
 */
function joinDetail(join: CellJoin, nameOf: NameOf): string | undefined {
  if (join.evidence.length === 0) return undefined;
  const withValues = join.mark !== 'none';
  const relations = join.evidence.map((relation: EvaluatedRelation) =>
    withValues
      ? `${relation.name}: ${relation.sides.map(side => sideValue(side.value)).join(' / ')}`
      : relation.name,
  );
  return [`From ${listed(join.apps.map(nameOf))}`, ...relations].join(' · ');
}

const MARK_WORDS: Record<Exclude<JoinMark, 'none'>, string> = {
  guessed: 'guessed match',
  broken: 'broken match',
};

/**
 * The only way a formula cell renders (SPEC §5.4, phase decision 17): the value with its
 * contributor state, so a partial value never looks complete. Attribution's pattern — a
 * quiet marker at rest, detail on hover or focus, the accessible name always carrying both.
 * Rendered on Radix `Text` (task-5.9 decision 5): body size for the value, gray when absent.
 * The detail floats in a Radix `Tooltip` mounted in the bundle's portal root, so showing it moves
 * nothing on the page — not the value, not a table's columns.
 *
 * A cell of a claimed object also carries its join (task-7.5 decisions 7–10), a second family of
 * marks beside the contributor markers: a guessed value underlined dotted with a small "?", a
 * broken one with an amber ⚠; its detail says where the value came from and what matched. A cell
 * with a target, under a host that navigates, is the button that takes the user to the element it
 * names (decision 13); its detail is text, and nothing in it navigates.
 */
export function DerivedValueView({
  cell,
  format,
  appDisplayName,
  onNavigate,
}: {
  cell?: CellObject;
  format?: Format;
  appDisplayName?: AppDisplayName;
  onNavigate?: NavigationHandler;
}) {
  const [active, setActive] = useState(false);
  const portalRoot = useContext(PortalRootContext);
  if (!cell) return null;
  const nameOf: NameOf = appId => appDisplayName?.(appId) || appId;
  const state = cellState(cell);
  const text =
    cell.names === 'app' && typeof cell.value === 'string'
      ? nameOf(cell.value)
      : formatValue(cell.value, format);
  const mark = cell.join?.mark ?? 'none';
  const contributors = contributorDetail(state, cell, nameOf);
  const provenance = cell.join ? joinDetail(cell.join, nameOf) : undefined;
  const marked = state !== 'complete';
  const detail = [marked ? contributors : undefined, provenance].filter(Boolean).join(' · ');
  const label = [text, contributors, mark === 'none' ? undefined : MARK_WORDS[mark], provenance]
    .filter(Boolean)
    .join(' · ');
  const target = cell.target;
  const navigate = onNavigate && target ? () => onNavigate(target) : undefined;

  const value = (
    <Text
      as="span"
      size="2"
      color={state === 'absent' ? 'gray' : undefined}
      data-state={state}
      data-join={cell.join ? mark : undefined}
      role={navigate ? 'button' : undefined}
      tabIndex={navigate || detail ? 0 : undefined}
      aria-label={label}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      onClick={navigate}
      onKeyDown={
        navigate
          ? (event: KeyboardEvent) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              navigate();
            }
          : undefined
      }
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '0.35em',
        cursor: navigate ? 'pointer' : detail ? 'help' : undefined,
        ...(navigate && active
          ? {background: 'var(--gray-a3)', borderRadius: 'var(--radius-1)'}
          : undefined),
      }}
    >
      <span
        data-value=""
        style={{
          fontVariantNumeric: 'tabular-nums',
          ...(mark === 'guessed'
            ? {
                textDecorationLine: 'underline',
                textDecorationStyle: 'dotted',
                textUnderlineOffset: '0.2em',
              }
            : undefined),
        }}
      >
        {text}
      </span>
      {marked && <Marker state={state} />}
      {mark !== 'none' && <JoinMarker mark={mark} />}
    </Text>
  );
  if (!detail) return value;
  return (
    <Tooltip content={detail} container={portalRoot ?? undefined}>
      {value}
    </Tooltip>
  );
}

/** The join's own family: a small question mark for a guess, an amber warning for a broken tie. */
function JoinMarker({mark}: {mark: Exclude<JoinMark, 'none'>}) {
  return mark === 'guessed' ? (
    <Text as="span" size="1" color="gray" aria-hidden data-join-marker="guessed">
      ?
    </Text>
  ) : (
    <Text as="span" size="1" color="amber" aria-hidden data-join-marker="broken">
      ⚠
    </Text>
  );
}

/** Two shapes, distinct from each other and from Attribution's info glyph. */
function Marker({state}: {state: Exclude<CellState, 'complete'>}) {
  const common = {
    width: 10,
    height: 10,
    viewBox: '0 0 16 16',
    'aria-hidden': true,
    'data-marker': state,
    style: {alignSelf: 'center', opacity: 0.7},
  } as const;
  switch (state) {
    case 'partial':
      // half-filled circle: some of the inputs
      return (
        <svg {...common} fill="currentColor">
          <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Zm0 1.5v13a6.5 6.5 0 0 1 0-13Z" />
        </svg>
      );
    case 'absent':
      // dashed ring: nothing inside
      return (
        <svg
          {...common}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeDasharray="3 2.5"
        >
          <circle cx="8" cy="8" r="6.5" />
        </svg>
      );
  }
}

export interface DerivedValueHost {
  /** What the host does when a cell is activated; without it, cells are not interactive. */
  onNavigate?: NavigationHandler;
  /** The host's display name for an app. */
  appDisplayName?: AppDisplayName;
}

/**
 * Catalog entry, built for one host: the generic binder resolves `cell` to the evaluator's
 * object, then renders it with the host's names and navigation.
 */
export function createDerivedValueComponent({onNavigate, appDisplayName}: DerivedValueHost = {}) {
  return createComponentImplementation(DerivedValueApi, ({props}) => (
    <DerivedValueView
      cell={props.cell as CellObject | undefined}
      format={props.format}
      appDisplayName={appDisplayName}
      onNavigate={onNavigate}
    />
  ));
}
