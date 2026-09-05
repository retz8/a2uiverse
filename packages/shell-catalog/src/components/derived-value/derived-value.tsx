import {useState} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {parseSurfaceId} from '@a2uiverse/sdk';
import {Text} from '@radix-ui/themes';
import {type CellObject, DerivedValueApi, type Format} from './derived-value.schema.js';

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
  return String(value);
}

function detailFor(state: CellState, cell: CellObject): string {
  switch (state) {
    case 'absent':
      return 'no source is showing this';
    case 'partial': {
      const missing = cell.absent.map(s => parseSurfaceId(s)?.appId ?? s).join(', ');
      return `${cell.contributed} of ${cell.of} sources · ${missing} not showing this`;
    }
    case 'complete':
      return `${cell.contributed} of ${cell.of} sources`;
  }
}

/**
 * The only way a formula cell renders (SPEC §5.4, phase decision 17): the value with its
 * contributor state, so a partial value never looks complete. Attribution's pattern — a
 * quiet marker at rest, detail on hover or focus, the accessible name always carrying both.
 * Rendered on Radix `Text` (task-5.9 decision 5): body size for the value, gray when absent,
 * the detail in the caption register.
 */
export function DerivedValueView({cell, format}: {cell?: CellObject; format?: Format}) {
  const [open, setOpen] = useState(false);
  if (!cell) return null;
  const state = cellState(cell);
  const text = formatValue(cell.value, format);
  const detail = detailFor(state, cell);
  const marked = state !== 'complete';

  return (
    <Text
      as="span"
      size="2"
      color={state === 'absent' ? 'gray' : undefined}
      data-state={state}
      tabIndex={marked ? 0 : undefined}
      aria-label={`${text} · ${detail}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: '0.35em',
        cursor: marked ? 'help' : undefined,
      }}
    >
      <span style={{fontVariantNumeric: 'tabular-nums'}}>{text}</span>
      {marked && <Marker state={state} />}
      {marked && open && (
        <Text as="span" size="1" color="gray">
          {detail}
        </Text>
      )}
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

/** Catalog entry: the generic binder resolves `cell` to the evaluator's object, then renders. */
export const DerivedValueComponent = createComponentImplementation(DerivedValueApi, ({props}) => (
  <DerivedValueView cell={props.cell as CellObject | undefined} format={props.format} />
));
