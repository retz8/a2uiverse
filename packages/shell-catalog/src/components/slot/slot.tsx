import {useContext, type CSSProperties} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {UpdateIcon} from '@radix-ui/react-icons';
import {Button, Flex, Table, Text} from '@radix-ui/themes';
import type {ShellActionHandler} from '../../functions/shell-actions.js';
import {SlotContentContext} from '../../slot-content.js';
import {SlotStateContext} from '../../slot-state.js';
import {weightStyle} from '../shared/layout.js';
import {SkeletonBar} from '../shared/skeleton.js';
import {
  bodyCellStyle,
  ColumnHeading,
  headingCellStyle,
  reservedColumnState,
} from '../table/table.js';
import {SlotApi, type SlotCollapse, type SlotFailure, type SlotProps} from './slot.schema.js';

/** What the host does when the reader presses Retry on a failed slot: the slot's source, and where it was raised. */
export type RetryHandler = (retry: {
  source: string;
  surfaceId: string;
  componentId: string;
}) => void;

/**
 * Host-resolved content wins whenever the state allows it: `failed` renders the
 * failure panel even if stale content exists, and otherwise content fills the
 * slot the moment the resolver returns it.
 *
 * `collapsed` means the source contributed no surface. It renders nothing *only
 * if the host has nothing to rest it on* — a source that answered in prose
 * rather than in UI still occupied a slot, and letting that slot vanish while
 * its attribution stays would leave a label naming nothing. The host decides
 * what the resting state is; the slot only decides that there may be one. A
 * collapsed merge is the exception: the shell slot collapses to one line at the 24px row where
 * the merged view's label would have sat, the skeleton's height given back — the Synthesizer's
 * words for a decline (task-8.2 decision 9), the shell's own for every other cause (task-8.3
 * decision 9).
 *
 * A failed fragment slot is the failure tile (task 8.2, the design canvas's F6): the failure
 * said at body size in the shell's words, composed from the label and the noun the source was
 * asked for; Retry, under a host that retries; and beneath, the vendor's own words under a
 * heading naming it, or the shell's reason under "What happened", per the painted cause. No
 * box, the reserved floor, one face throughout.
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
  noun,
  failure,
  content = 'fragment',
  columns,
  columnSources,
  declined,
  collapse,
  onSearchStore,
  onRetry,
}: SlotProps & {
  onSearchStore?: (query: string | undefined) => void;
  onRetry?: (source: string) => void;
}) {
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
    const line = shell ? (declined?.reason ?? (collapse && collapseLine(collapse))) : undefined;
    if (line) {
      return (
        <div
          data-slot={source}
          data-slot-state="collapsed"
          data-slot-content="shell"
          style={{...weighted, minHeight: 0}}
        >
          <Flex
            align="center"
            style={{height: 24}}
            {...(declined ? {'data-slot-declined': ''} : {'data-slot-collapse': collapse!.cause})}
          >
            {quietLine(line)}
          </Flex>
        </div>
      );
    }
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
    const name = label ?? source ?? '';
    const words = failureWords(name, failure);
    return (
      <div data-slot={source} data-slot-state="failed" style={{...weighted, ...reservedStyle}}>
        <Flex direction="column" align="start" gap="4">
          <Text as="p" size="2" data-slot-failure-line="">
            {failureLine(name, noun)}
          </Text>
          {onRetry && source !== undefined && (
            <Button size="2" variant="outline" color="gray" onClick={() => onRetry(source)}>
              <UpdateIcon aria-hidden />
              Retry
            </Button>
          )}
          {words && (
            <Flex direction="column" gap="1" data-slot-failure-words="">
              <Text as="span" size="1" color="gray">
                {words.heading}
              </Text>
              <Text as="span" size="1" color="gray">
                {words.text}
              </Text>
            </Flex>
          )}
        </Flex>
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
        <ReservedView columns={columns} columnSources={columnSources} />
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
 * The failure tile's line (task-8.2 decision 3): the source's name and what it was asked for.
 * A noun that starts with the name — "CircleCI runs" — reads as "its runs"; another noun is
 * shown as written; with no noun the source simply couldn't answer.
 */
export function failureLine(name: string, noun: string | undefined): string {
  if (!noun) return `${name} couldn’t answer.`;
  const own = name && noun.startsWith(`${name} `) ? `its ${noun.slice(name.length + 1)}` : noun;
  return `${name} couldn’t show ${own}.`;
}

/**
 * The collapsed merge's line when it was not declined (task-8.3 decision 9), in the shell's
 * words: the home source it cannot join without, the one source that answered — or none — or the
 * view that could not be made.
 */
export function collapseLine(collapse: SlotCollapse): string {
  switch (collapse.cause) {
    case 'home':
      return `Can’t join without ${collapse.home ?? 'the home source'}.`;
    case 'few': {
      const answered = collapse.answered ?? [];
      return answered.length === 0
        ? 'No app answered, so there’s nothing to merge.'
        : `Only ${listed(answered)} answered, so there’s nothing to merge.`;
    }
    case 'unmade':
      return 'The merged view couldn’t be made.';
  }
}

function listed(names: readonly string[]): string {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/**
 * What stands beneath Retry (task-8.2 decision 4): the vendor's own words under a heading naming
 * it, or the shell's reason under "What happened"; nothing when the vendor ended its task without
 * a word, and nothing when no cause was painted.
 */
export function failureWords(
  name: string,
  failure: SlotFailure | undefined,
): {heading: string; text: string} | null {
  if (!failure) return null;
  switch (failure.cause) {
    case 'vendor':
      return failure.message ? {heading: `${name} said`, text: failure.message} : null;
    case 'unreachable':
      return {heading: 'What happened', text: `${name} couldn’t be reached.`};
    case 'timeout':
      return {heading: 'What happened', text: 'No answer within the time allowed.'};
    case 'invalid':
      return {
        heading: 'What happened',
        text: `${name} answered, but its screen couldn’t be shown.`,
      };
  }
}

/**
 * The merged view before it lands: the label row with a bar in it, then a table — the planned
 * headers when the plan named columns, one full-width column otherwise — over four rows of bars.
 * A column marked to a source says in its heading when that source is still loading or has
 * failed, as the landed table does (task 8.2).
 */
function ReservedView({
  columns,
  columnSources,
}: {
  columns?: string[];
  columnSources?: (string | null)[];
}) {
  const resolve = useContext(SlotStateContext);
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
                  <ColumnHeading
                    column={column}
                    reserved={reservedColumnState(resolve, columnSources?.[index])}
                  />
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
 * Catalog entry, bound to the host's handlers: the generic binder resolves props, then renders
 * SlotView, whose capability tile raises `openStore` and whose failure tile raises a retry from
 * this slot's surface. Without a retry handler the tile draws no Retry.
 */
export function createSlotComponent(onShellAction: ShellActionHandler, onRetry?: RetryHandler) {
  return createComponentImplementation(SlotApi, ({props, context}) => (
    <SlotView
      source={props.source}
      gap={props.gap}
      weight={props.weight}
      state={props.state}
      label={props.label}
      noun={props.noun}
      failure={props.failure}
      content={props.content}
      columns={props.columns}
      columnSources={props.columnSources}
      declined={props.declined}
      collapse={props.collapse}
      onSearchStore={query => {
        const surfaceId = context.dataContext.surface.id;
        const componentId = context.componentModel.id;
        onShellAction({name: 'openStore', surfaceId, componentId, ...(query ? {query} : {})});
      }}
      onRetry={
        onRetry &&
        (source =>
          onRetry({
            source,
            surfaceId: context.dataContext.surface.id,
            componentId: context.componentModel.id,
          }))
      }
    />
  ));
}
