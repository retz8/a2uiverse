import {useContext, type CSSProperties} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {Button, Flex, Table, Text} from '@radix-ui/themes';
import type {ShellActionHandler} from '../../functions/shell-actions.js';
import {SlotContentContext} from '../../slot-content.js';
import {weightStyle} from '../shared/layout.js';
import {bodyCellStyle, headingCellStyle} from '../table/table.js';
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
 * Shell content (task-5.5 decisions 1, 3) is the shell writing on its own page: no tile, and a
 * failure is a quiet line. While pending it is the merged view reserved at its size (task-7.15):
 * a bar where its label will be, the planned column headers, and four skeleton rows, drawn in the
 * table's own geometry. The skeleton only says a table will land here; the landed view takes its
 * own height.
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
  columns,
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
      <div
        data-slot={source}
        data-slot-state="pending"
        data-slot-content="shell"
        aria-busy="true"
        aria-label={label}
        style={weighted}
      >
        <ReservedView columns={columns} />
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

/** The skeleton rows' bar widths, per row and column, as the merged view's board draws them. */
const SKELETON_WIDTHS = [
  [62, 64, 36, 70, 58, 72],
  [48, 64, 36, 70, 58, 68],
  [56, 64, 16, 16, 16, 68],
  [70, 64, 36, 70, 58, 64],
];

/**
 * The merged view before it lands: the label row with a bar in it, then a table — the planned
 * headers when the plan named columns, one full-width column otherwise — over four rows of bars.
 */
function ReservedView({columns}: {columns?: string[]}) {
  const count = columns?.length || 1;
  return (
    <Flex direction="column" gap="2">
      <Flex align="center" style={{height: 24}}>
        <SkeletonBar width={136} height={10} />
      </Flex>
      <Table.Root size="1" variant="ghost">
        {columns && columns.length > 0 && (
          <Table.Header>
            <Table.Row>
              {columns.map((column, index) => (
                <Table.ColumnHeaderCell key={`${column}-${index}`} style={headingCellStyle(index)}>
                  {column}
                </Table.ColumnHeaderCell>
              ))}
            </Table.Row>
          </Table.Header>
        )}
        <Table.Body>
          {SKELETON_WIDTHS.map((widths, row) => (
            <Table.Row key={row} data-skeleton-row="">
              {Array.from({length: count}, (_, index) => (
                <Table.Cell key={index} style={bodyCellStyle(index)}>
                  <SkeletonBar width={`${widths[index % widths.length]}%`} height={8} />
                </Table.Cell>
              ))}
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Flex>
  );
}

function SkeletonBar({width, height}: {width: number | string; height: number}) {
  return (
    <i
      aria-hidden
      style={{
        display: 'block',
        width,
        height,
        borderRadius: height / 2,
        background: 'var(--a2v-skel, var(--gray-a3))',
      }}
    />
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
      columns={props.columns}
      onSearchStore={query => {
        const surfaceId = context.dataContext.surface.id;
        const componentId = context.componentModel.id;
        onShellAction({name: 'openStore', surfaceId, componentId, ...(query ? {query} : {})});
      }}
    />
  ));
}
