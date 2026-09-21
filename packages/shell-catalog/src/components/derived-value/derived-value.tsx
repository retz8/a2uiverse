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

/**
 * Four readings, not three (task-7.9 decision 21). `empty` and `absent` both show no value, and
 * they are not the same fact: `empty` is a formula with no refs — the attachment a row never had,
 * disclosed as 0 of 0 (SPEC §5.2) — while `absent` is refs that existed and stopped resolving
 * (SPEC §6.2). The first is the world being empty and the shell says nothing about it; the second
 * is the shell losing sight of a value it had, and it is marked.
 */
export type CellState = 'complete' | 'partial' | 'absent' | 'empty';

export function cellState(cell: CellObject): CellState {
  if (cell.of === 0) return 'empty';
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
    case 'empty':
      return 'nothing attached here';
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
 * One channel, not three (task-7.9 decision 21). Contributor state and the join of a claimed
 * object (task-7.5 decisions 7–10) used to be two families of glyph sitting beside the value,
 * which spent the vocabulary's redundancy on the states that already announce themselves and left
 * `partial` — the one state whose value reads as whole — carrying a single 10px mark. Both now
 * ride the value's own contrast: less solid a basis, softer the value reads. A value complete and
 * held by facts is drawn at full strength and gains nothing; every other reading — partial, absent,
 * empty, guessed — steps back to the gray register; `broken` goes amber and keeps its ⚠, the one
 * state that escalates because it means the value may belong to the wrong thing.
 *
 * Contrast rather than ink (task-7.9 decision 24). A stroke under the value — the first form of
 * this — borrowed the idiom that means "misspelled" or "error", attached the mark to the
 * typography when the fact is about provenance, and multiplied on a value that wraps in a table
 * column. It also stopped discriminating: a match claim belongs to the row, so its values are
 * marked together, and a fully-marked row of underlines says nothing. Contrast costs no space, no
 * glyph and no extra line, and a whole guessed column simply reads quieter.
 *
 * Its known weakness, accepted: `guessed` is carried visually by color alone. What holds it up is
 * that the detail still fires on hover or focus for every marked cell, the accessible name always
 * carries the full disclosure, and the one state where being wrong costs something — `broken` —
 * keeps a glyph of its own.
 *
 * The shell speaks when it is unsure and shows when it is sure (task-7.9 decision 22): the detail
 * appears on hover or focus only where the shell has admitted something — a mark, or a contributor
 * set short of complete. On a confirmed complete cell the audit is the tap, which lands the user on
 * the vendor's own pixels (SPEC §7), and that is a better answer than a sentence. The accessible
 * name carries the whole detail either way, as `Attribution`'s does (SPEC §4.3): a screen-reader
 * user cannot hover to discover anything.
 *
 * A cell with a target, under a host that navigates, is the button that takes the user to the
 * element it names (decision 13); its detail is text, and nothing in it navigates.
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
  // What the shell has admitted about this cell: a mark, or a source set short of what it declared.
  // `empty` admits nothing — the row never had this attachment — so it stays silent.
  const shortOfComplete = state === 'partial' || state === 'absent';
  const speaks = shortOfComplete || mark !== 'none';
  const detail = speaks
    ? [shortOfComplete ? contributors : undefined, provenance].filter(Boolean).join(' · ')
    : '';
  // The one mark: how solid the value's basis is, carried by the value's own contrast.
  const marked =
    state !== 'complete' || mark !== 'none' ? (mark === 'none' ? state : mark) : undefined;
  const label = [text, contributors, mark === 'none' ? undefined : MARK_WORDS[mark], provenance]
    .filter(Boolean)
    .join(' · ');
  const target = cell.target;
  const navigate = onNavigate && target ? () => onNavigate(target) : undefined;

  const value = (
    <Text
      as="span"
      size="2"
      color={mark === 'broken' ? 'amber' : marked ? 'gray' : undefined}
      data-state={state}
      data-join={cell.join ? mark : undefined}
      data-marked={marked}
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
      <span data-value="" style={{fontVariantNumeric: 'tabular-nums'}}>
        {text}
      </span>
      {mark === 'broken' && <BrokenMarker />}
    </Text>
  );
  if (!detail) return value;
  return (
    <Tooltip content={detail} container={portalRoot ?? undefined}>
      {value}
    </Tooltip>
  );
}

/** The one state that escalates out of the quiet register: the value may belong to another thing. */
function BrokenMarker() {
  return (
    <Text as="span" size="1" color="amber" aria-hidden data-join-marker="broken">
      ⚠
    </Text>
  );
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
