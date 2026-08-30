import {useState} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {AttributionApi, type AttributionProps} from './attribution.schema.js';

/**
 * The quiet marker (SPEC §4.3): a small grayish caption with an info glyph,
 * always present, expanding to full attribution on hover or keyboard focus.
 * The accessible name always carries the full detail, independent of pointer
 * state.
 */
export function AttributionView({displayName, account}: AttributionProps) {
  const [open, setOpen] = useState(false);
  const detail = `Painted by ${displayName}${account ? ` · ${account}` : ''}`;

  return (
    <span
      tabIndex={0}
      aria-label={detail}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        alignSelf: 'flex-start',
        width: 'fit-content',
        maxWidth: '100%',
        gap: '0.3em',
        fontSize: 'var(--a2ui-font-size-xs, 11px)',
        lineHeight: 1.2,
        color: 'var(--a2ui-color-on-surface)',
        opacity: open ? 0.9 : 0.55,
        transition: 'opacity 120ms ease',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <InfoGlyph />
      {open ? detail : displayName}
    </span>
  );
}

function InfoGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
      <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm9-3a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.9 7h1.6a.5.5 0 0 1 .5.55l-.3 3.2h.8a.5.5 0 0 1 0 1H7a.5.5 0 0 1-.5-.55l.3-3.2h-.4a.5.5 0 0 1 0-1Z" />
    </svg>
  );
}

/** Catalog entry: the generic binder resolves props, then renders AttributionView. */
export const AttributionComponent = createComponentImplementation(AttributionApi, ({props}) => (
  <AttributionView displayName={props.displayName} appId={props.appId} account={props.account} />
));
