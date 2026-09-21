import {useContext, type CSSProperties} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {Button, Flex, Spinner, Text} from '@radix-ui/themes';
import type {ShellActionHandler} from '../../functions/shell-actions.js';
import {SlotContentContext} from '../../slot-content.js';
import {weightStyle} from '../shared/layout.js';
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
 * While pending or failed a fragment slot holds the space it reserved and draws nothing around it
 * (task-7.9 decision 23).
 *
 * A slot holding a `gap` is the capability tile (task-6.2 decision 6): fixed shell UI, no model
 * wording — a minimal line and a button searching the Store for the missing capability, the gap.
 *
 * `weight` is the region's flex share inside a `Row` or `Column`, proportional among its
 * siblings and 1 when the Planner wrote none (task-6.4 decision 2): unweighted regions share
 * their axis equally, and a wrapped slot fills the `Attribution` box that carries its weight.
 */
export function SlotView({
  source,
  gap,
  weight,
  state = 'pending',
  label,
  content = 'fragment',
  onSearchStore,
}: SlotProps & {onSearchStore?: (query: string | undefined) => void}) {
  const resolve = useContext(SlotContentContext);
  const shell = content === 'shell';
  const weighted = weightStyle(weight ?? 1);

  if (gap !== undefined) {
    return (
      <div data-slot-gap={gap} data-slot-state="gap" style={{...weighted, ...panelStyle}}>
        <Flex direction="column" align="center" gap="2">
          <Text as="span" size="2">
            No installed app can do this.
          </Text>
          <Button size="1" variant="soft" onClick={() => onSearchStore?.(gap)}>
            Search the Store
          </Button>
        </Flex>
      </div>
    );
  }

  const resolved = source === undefined ? null : resolve(source);

  if (state === 'collapsed') {
    if (resolved == null) return null;
    return (
      <div
        data-slot={source}
        data-slot-state="collapsed"
        style={{...weighted, ...reservedStyle, minHeight: 0}}
      >
        {resolved}
      </div>
    );
  }

  if (state === 'failed') {
    if (shell) {
      return (
        <div data-slot={source} data-slot-state="failed" data-slot-content="shell" style={weighted}>
          {quietLine('Couldn’t paint this.')}
        </div>
      );
    }
    return (
      <div data-slot={source} data-slot-state="failed" style={{...weighted, ...reservedStyle}}>
        <Text as="span" size="1" color="gray">
          {label ?? source} didn&rsquo;t load
        </Text>
      </div>
    );
  }

  if (resolved != null) {
    return (
      <div
        data-slot={source}
        data-slot-state="filled"
        data-slot-content={shell ? 'shell' : undefined}
        // A filled fragment slot keeps the floor it reserved while pending. Dropping it made the
        // box collapse the instant a fragment mounted and then grow again as content streamed —
        // the slot giving back space it had already claimed. Shell content reserved no floor.
        // The floor is written after the flex share, whose `minHeight: 0` would erase it.
        style={{...weighted, minWidth: 0, minHeight: shell ? 0 : reservedStyle.minHeight}}
      >
        {resolved}
      </div>
    );
  }

  if (shell) {
    return (
      <div data-slot={source} data-slot-state="pending" data-slot-content="shell" style={weighted}>
        <Flex align="center" gap="2" display="inline-flex">
          <Spinner size="1" />
          {quietLine('Painting…')}
        </Flex>
      </div>
    );
  }

  return (
    <div
      data-slot={source}
      data-slot-state="pending"
      style={{...weighted, ...reservedStyle, opacity: 0.6}}
    >
      <Text as="span" size="1" color="gray">
        {label ?? source}…
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

/**
 * The capability tile's look. SPEC §8 calls it a tile and it is the shell's own deterministic UI
 * with an action in it — not a placeholder for a vendor's pixels — so it keeps its box.
 */
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

/**
 * What a fragment slot holds before its fragment arrives (task-7.9 decision 23): the space it has
 * reserved and nothing drawn around it — no border, no background, no edge. The floor stays, so
 * the layout does not jump as fragments stream in; the quiet line sits flush at the leading edge,
 * under the attribution marker, where the fragment will start.
 */
const reservedStyle: CSSProperties = {
  minHeight: '4rem',
  display: 'flex',
  // Top, not centred: a row stretches the slot to its tallest neighbour, and a centred line
  // would float halfway down the canvas, away from the marker naming it.
  alignItems: 'flex-start',
  justifyContent: 'flex-start',
};

/**
 * Catalog entry, bound to the host's shell-action handler: the generic binder resolves props,
 * then renders SlotView, whose capability tile raises `openStore` from this slot's surface.
 */
export function createSlotComponent(onShellAction: ShellActionHandler) {
  return createComponentImplementation(SlotApi, ({props, context}) => (
    <SlotView
      source={props.source}
      gap={props.gap}
      weight={props.weight}
      state={props.state}
      label={props.label}
      content={props.content}
      onSearchStore={query => {
        const surfaceId = context.dataContext.surface.id;
        const componentId = context.componentModel.id;
        onShellAction({name: 'openStore', surfaceId, componentId, ...(query ? {query} : {})});
      }}
    />
  ));
}
