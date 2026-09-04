import {createComponentImplementation} from '@a2ui/react/v0_9';
import {SortControlApi, type SortObject} from './sort-control.schema.js';

/**
 * Displays the sort criterion and lets the user change it (SPEC §5.2): the criterion is
 * always displayed and always user-changeable, and since the caption is gone (phase
 * decision 14) this control is where the criterion is read. Runtime-driven from the
 * wiring — options are the fields, selection is `sort`; the tree only places it.
 */
export function SortControlView({
  sort,
  onChange,
}: {
  sort: SortObject | undefined;
  onChange: (next: SortObject) => void;
}) {
  if (!sort) return null;
  const asc = sort.direction === 'asc';
  const flipLabel = asc ? 'Ascending — switch to descending' : 'Descending — switch to ascending';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.4em',
        fontSize: 'var(--a2ui-font-size-sm, 13px)',
        color: 'var(--a2ui-color-on-surface)',
      }}
    >
      <label style={{opacity: 0.7}}>
        Sort by{' '}
        <select
          aria-label="Sort by"
          value={sort.field}
          onChange={e => onChange({...sort, field: e.target.value})}
          style={{font: 'inherit', color: 'inherit', background: 'transparent'}}
        >
          {sort.fields.map(f => (
            <option key={f.name} value={f.name}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        aria-label={flipLabel}
        title={flipLabel}
        onClick={() => onChange({...sort, direction: asc ? 'desc' : 'asc'})}
        style={{
          font: 'inherit',
          color: 'inherit',
          background: 'transparent',
          border: 0,
          padding: 0,
          cursor: 'pointer',
          lineHeight: 1,
        }}
      >
        {asc ? '↑' : '↓'}
      </button>
    </span>
  );
}

/**
 * Catalog entry: `sort` resolves to the evaluator's object; `setSort` is the binder's two-way
 * write to the same path. Upstream types a setter by the prop union's literal branches, and a
 * binding-only prop has none — so `setSort` arrives typed `(value: never)` although at runtime
 * it writes whatever it is given (`_dev/a2ui-findings.md` §4).
 */
export const SortControlComponent = createComponentImplementation(SortControlApi, ({props}) => (
  <SortControlView
    sort={props.sort as SortObject | undefined}
    onChange={(next: SortObject) => props.setSort(next as never)}
  />
));
