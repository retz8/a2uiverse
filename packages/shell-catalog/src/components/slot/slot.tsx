import {useContext, type CSSProperties} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {Flex, Spinner, Text} from '@radix-ui/themes';
import {SlotContentContext} from '../../slot-content.js';
import {SlotApi, type SlotProps} from './slot.schema.js';

/**
 * Host-resolved content wins whenever the state allows it: `failed` renders the
 * failure panel even if stale content exists, and otherwise content fills the
 * slot the moment the resolver returns it.
 *
 * `collapsed` means the source contributed no surface. It renders nothing *only
 * if the host has nothing to rest it on* — a source that answered in prose
 * rather than in UI still occupied a slot, and letting that slot vanish while
 * its attribution stays would leave a label naming nothing. The host decides
 * what the resting state is; the slot only decides that there may be one.
 *
 * Shell content (task-5.5 decisions 1, 3) is the shell writing on its own page:
 * the reserved position holds, but while pending it is one quiet line beside a
 * spinner rather than a tile with a floor, and a failure is a quiet line too.
 *
 * The tile a fragment slot shows while pending or failed is drawn on Radix's own
 * panel, border and radius tokens (task-5.9 decision 5).
 */
export function SlotView({name, state = 'pending', label, content = 'fragment'}: SlotProps) {
  const resolve = useContext(SlotContentContext);
  const resolved = resolve(name);
  const shell = content === 'shell';

  if (state === 'collapsed') {
    if (resolved == null) return null;
    return (
      <div data-slot={name} data-slot-state="collapsed" style={{...panelStyle, minHeight: 0}}>
        {resolved}
      </div>
    );
  }

  if (state === 'failed') {
    if (shell) {
      return (
        <div data-slot={name} data-slot-state="failed" data-slot-content="shell">
          {quietLine('Couldn’t paint this.')}
        </div>
      );
    }
    return (
      <div data-slot={name} data-slot-state="failed" style={panelStyle}>
        <Text as="span" size="1" color="gray">
          {label ?? name} didn&rsquo;t load
        </Text>
      </div>
    );
  }

  if (resolved != null) {
    return (
      <div
        data-slot={name}
        data-slot-state="filled"
        data-slot-content={shell ? 'shell' : undefined}
        // A filled fragment slot keeps the floor it reserved while pending. Dropping it made the
        // box collapse the instant a fragment mounted and then grow again as content streamed —
        // the slot giving back space it had already claimed. Shell content reserved no floor.
        style={{minWidth: 0, minHeight: shell ? undefined : panelStyle.minHeight}}
      >
        {resolved}
      </div>
    );
  }

  if (shell) {
    return (
      <div data-slot={name} data-slot-state="pending" data-slot-content="shell">
        <Flex align="center" gap="2" display="inline-flex">
          <Spinner size="1" />
          {quietLine('Painting…')}
        </Flex>
      </div>
    );
  }

  return (
    <div data-slot={name} data-slot-state="pending" style={{...panelStyle, opacity: 0.6}}>
      <Text as="span" size="1" color="gray">
        {label ?? name}…
      </Text>
    </div>
  );
}

/** The shell's quiet register: subdued text, no box, no floor. */
function quietLine(text: string) {
  return (
    <Text size="1" color="gray">
      {text}
    </Text>
  );
}

const panelStyle: CSSProperties = {
  background: 'var(--color-panel-solid)',
  border: '1px solid var(--gray-6)',
  borderRadius: 'var(--radius-3)',
  padding: 'var(--space-3)',
  minHeight: '4rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

/** Catalog entry: the generic binder resolves props, then renders SlotView. */
export const SlotComponent = createComponentImplementation(SlotApi, ({props}) => (
  <SlotView name={props.name} state={props.state} label={props.label} content={props.content} />
));
