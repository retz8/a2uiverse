import {useContext} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {SlotContentContext} from '../../slot-content.js';
import {SlotApi, type SlotProps} from './slot.schema.js';

/**
 * Host-resolved content wins whenever the state allows it: `collapsed` renders
 * nothing, `failed` renders the failure panel even if stale content exists, and
 * otherwise content fills the slot the moment the resolver returns it.
 */
export function SlotView({name, state = 'pending', label}: SlotProps) {
  const resolve = useContext(SlotContentContext);
  const content = resolve(name);

  if (state === 'collapsed') return null;

  if (state === 'failed') {
    return (
      <div data-slot={name} data-slot-state="failed" style={panelStyle}>
        <span style={{color: 'var(--a2ui-color-on-surface)', opacity: 0.75}}>
          {label ?? name} didn&rsquo;t load
        </span>
      </div>
    );
  }

  if (content != null) {
    return (
      <div data-slot={name} data-slot-state="filled" style={{minWidth: 0}}>
        {content}
      </div>
    );
  }

  return (
    <div data-slot={name} data-slot-state="pending" style={{...panelStyle, opacity: 0.6}}>
      <span style={{color: 'var(--a2ui-color-on-surface)', opacity: 0.6}}>{label ?? name}…</span>
    </div>
  );
}

const panelStyle = {
  background: 'var(--a2ui-color-surface)',
  border: '1px solid var(--a2ui-color-border)',
  borderRadius: 'var(--a2ui-border-radius)',
  padding: 'var(--a2ui-spacing-m, 12px)',
  minHeight: '4rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 'var(--a2ui-font-size-s, 13px)',
} as const;

/** Catalog entry: the generic binder resolves props, then renders SlotView. */
export const SlotComponent = createComponentImplementation(SlotApi, ({props}) => (
  <SlotView name={props.name} state={props.state} label={props.label} />
));
