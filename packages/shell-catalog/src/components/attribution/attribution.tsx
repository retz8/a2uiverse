import {useState} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {InfoCircledIcon} from '@radix-ui/react-icons';
import {Text} from '@radix-ui/themes';
import {AttributionApi, type AttributionProps} from './attribution.schema.js';

/**
 * The quiet marker (SPEC §4.3): a small gray caption with an info glyph, always present,
 * expanding to full attribution on hover or keyboard focus. The accessible name always
 * carries the full detail, independent of pointer state. Rendered on Radix `Text` in the
 * caption register with Radix's own info glyph (task-5.9 decision 5).
 */
export function AttributionView({displayName, account}: AttributionProps) {
  const [open, setOpen] = useState(false);
  const detail = `Painted by ${displayName}${account ? ` · ${account}` : ''}`;

  return (
    <Text
      as="span"
      size="1"
      color="gray"
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
        lineHeight: 1.2,
        opacity: open ? 1 : 0.8,
        transition: 'opacity 120ms ease',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <InfoCircledIcon width={11} height={11} aria-hidden="true" />
      {open ? detail : displayName}
    </Text>
  );
}

/** Catalog entry: the generic binder resolves props, then renders AttributionView. */
export const AttributionComponent = createComponentImplementation(AttributionApi, ({props}) => (
  <AttributionView displayName={props.displayName} appId={props.appId} account={props.account} />
));
