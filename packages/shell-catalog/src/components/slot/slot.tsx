import {useContext, useRef, type CSSProperties, type MutableRefObject} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {UpdateIcon} from '@radix-ui/react-icons';
import {Button, Flex, Spinner, Table, Text} from '@radix-ui/themes';
import type {CompositionOperation} from '@a2uiverse/sdk';
import type {ShellActionHandler} from '../../functions/shell-actions.js';
import type {AppDisplayName} from '../derived-value/join.js';
import {PressStateContext} from '../../press-state.js';
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
import {
  collapsedLines,
  landedLines,
  LOST_WORDS,
  retryStatus,
  UNREACHED_WORDS,
  type PressLine,
} from './press-lines.js';
import {SlotApi, type SlotCollapse, type SlotFailure, type SlotProps} from './slot.schema.js';

/**
 * What the host does when the reader presses Retry, Include or Try again (task-8.5 decision 5):
 * the composition operation as the wire carries it, and where it was raised.
 */
export type PressHandler = (press: {
  operation: CompositionOperation;
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
 * A failed fragment slot is the failure tile (task 8.2, the design canvas's F6, as task-8.7
 * decision 17 pared it): one statement at body size — the vendor's own words when it spoke, else
 * the shell's reason for the painted cause, neither naming the source, since the attribution
 * marker above already does; then Retry, under a host that takes presses. No box, the reserved
 * floor, one face throughout. The plan's noun for the source stays a painted prop; the tile no
 * longer says it.
 *
 * The reader's presses (task 8.5): Retry gives the tile way to the pending line the moment it is
 * pressed; over a landed merged view a row of the shell's own, above the view's label row, carries
 * the working sentence, "couldn't be updated" with Try again, and the late sources with Include; a
 * collapsed merge's line becomes the working or waiting sentence, "couldn't be made" carries Try
 * again, and a decline's line gains the late sources with Include beneath it. The words are
 * composed here from the painted facts and the presses the host holds; a press that never reached
 * the orchestrator, or whose stream broke, is said in place.
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
  failure,
  content = 'fragment',
  columns,
  columnSources,
  join,
  declined,
  collapse,
  late,
  working,
  callFailed,
  retrying,
  onSearchStore,
  onPress,
  nameOf = appId => appId,
}: SlotProps & {
  onSearchStore?: (query: string | undefined) => void;
  /** The reader's press, as the operation the wire carries; without it no press button is drawn. */
  onPress?: (operation: CompositionOperation) => void;
  /** The host's display name for an app id; the id itself without one. */
  nameOf?: (appId: string) => string;
}) {
  const resolve = useContext(SlotContentContext);
  const {enabled, presses} = useContext(PressStateContext);
  // Set by a press whose button held focus: the line that replaces the button takes it (task-8.5
  // decision 15), so a keyboard reader's place is not dropped to the page.
  const focusLine = useRef(false);
  const shell = content === 'shell';
  const weighted = weightStyle(weight ?? 1);
  const press = (operation: CompositionOperation, button: HTMLElement) => {
    if (button.ownerDocument.activeElement === button) focusLine.current = true;
    onPress?.(operation);
  };
  const facts = {
    home: join?.home ?? undefined,
    late,
    working,
    callFailed,
    retrying,
    declined,
    collapse,
  };
  const retry = source === undefined || shell ? undefined : retryStatus(presses, source);

  // The outcomes the progress line does not say, spoken politely from the slot; the region stands
  // across the slot's states so a change of words inside it is announced.
  let announcement = '';
  const announced = (lines: PressLine[]) => {
    announcement = lines.find(line => line.announce)?.text ?? '';
    return lines;
  };

  const body = (() => {
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
      const lines = shell ? announced(collapsedLines(facts, presses, nameOf, line)) : [];
      if (lines.length > 0) {
        return (
          <div
            data-slot={source}
            data-slot-state="collapsed"
            data-slot-content="shell"
            style={{...weighted, minHeight: 0}}
          >
            <PressRows
              lines={lines}
              first={
                declined
                  ? {'data-slot-declined': ''}
                  : collapse
                    ? {'data-slot-collapse': collapse.cause}
                    : {}
              }
              enabled={enabled}
              onPress={onPress && press}
              focusLine={focusLine}
            />
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

    if (state === 'failed' && retry !== 'sent') {
      if (shell) {
        return (
          <div
            data-slot={source}
            data-slot-state="failed"
            data-slot-content="shell"
            style={weighted}
          >
            {quietLine('Couldn’t paint this.')}
          </div>
        );
      }
      if (retry === 'unreached') announcement = UNREACHED_WORDS;
      return (
        <div data-slot={source} data-slot-state="failed" style={{...weighted, ...reservedStyle}}>
          <Flex direction="column" align="start" gap="4">
            <Text as="p" size="2" data-slot-failure-line="">
              {failureStatement(failure)}
            </Text>
            {onPress && source !== undefined && (
              <Flex align="center" gap="3">
                <Button
                  size="2"
                  variant="outline"
                  color="gray"
                  disabled={!enabled}
                  onClick={event => press({kind: 'retry', sources: [source]}, event.currentTarget)}
                >
                  <UpdateIcon aria-hidden />
                  Retry
                </Button>
                {retry === 'unreached' && (
                  <Text as="span" size="1" color="gray" data-slot-press-note="">
                    {UNREACHED_WORDS}
                  </Text>
                )}
              </Flex>
            )}
          </Flex>
        </div>
      );
    }

    if (resolved != null && retry !== 'sent') {
      const lines = shell ? announced(landedLines(facts, presses, nameOf)) : [];
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
          {lines.length > 0 && (
            // The press lines' own row above the view's label row (task-8.5 decision 4).
            <div style={{marginBottom: 8}}>
              <PressRows
                lines={lines}
                enabled={enabled}
                onPress={onPress && press}
                focusLine={focusLine}
              />
            </div>
          )}
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

    // Pending: before the source's first answer, or again from the reader's Retry — drawn at the
    // press, before the paint says so (task-8.5 decision 8). A spinner and "Loading…", naming
    // nobody: the attribution marker above says whose the slot is (task-8.7 decision 19). A Retry
    // whose stream broke says so here.
    const lost = retry === 'lost' && state !== 'failed';
    if (lost) announcement = LOST_WORDS;
    return (
      <div
        data-slot={source}
        data-slot-state="pending"
        style={{...weighted, ...reservedStyle, opacity: lost ? 1 : 0.6}}
      >
        <Text
          as="span"
          size="1"
          color="gray"
          tabIndex={-1}
          data-press-line=""
          ref={element => takeFocus(element, focusLine)}
          style={{display: 'inline-flex', alignItems: 'center', gap: 6}}
        >
          {!lost && <Spinner size="1" />}
          {lost ? LOST_WORDS : 'Loading…'}
        </Text>
      </div>
    );
  })();

  // A slot that draws nothing, or the capability tile, has no press to speak of.
  if (body === null || gap !== undefined) return body;
  return (
    <>
      {body}
      <span role="status" style={visuallyHidden} data-slot-announce={source}>
        {announcement}
      </span>
    </>
  );
}

/** Hands focus to the line a press put in its button's place, once. */
function takeFocus(element: HTMLElement | null, focusLine: MutableRefObject<boolean>) {
  if (!element || !focusLine.current) return;
  focusLine.current = false;
  element.focus();
}

/**
 * The press lines, each a 24px row in the collapse line's geometry (task-8.5 decision 4): a
 * spinner before the sentence while something runs, the press inline at its end. A row that asks
 * the reader for a press is the view's action, so it reads at body size in ink with a soft accent
 * button (task-8.7 decision 21); a row that only tells stays at caption size in the quiet
 * register. The first row carries the collapse's markers when it stands for one.
 */
function PressRows({
  lines,
  first = {},
  enabled,
  onPress,
  focusLine,
}: {
  lines: PressLine[];
  first?: Record<string, string>;
  enabled: boolean;
  onPress?: (operation: CompositionOperation, button: HTMLElement) => void;
  focusLine: MutableRefObject<boolean>;
}) {
  return (
    <>
      {lines.map((line, index) => (
        <Flex
          key={index}
          align="center"
          gap="2"
          style={{height: 24}}
          data-slot-press-row=""
          {...(index === 0 ? first : {})}
        >
          {line.working && <Spinner size="1" />}
          <Text
            size={line.press || line.ink ? '2' : '1'}
            color={line.press || line.ink ? undefined : 'gray'}
            tabIndex={-1}
            data-press-line=""
            ref={element => takeFocus(element, focusLine)}
          >
            {line.text}
          </Text>
          {line.press && onPress && (
            <Button
              size="1"
              variant="soft"
              disabled={!enabled}
              onClick={event => onPress(line.press!.operation, event.currentTarget)}
            >
              {line.press.label}
            </Button>
          )}
        </Flex>
      ))}
    </>
  );
}

/** Present to assistive technology, absent from the page: the slot's polite announcements. */
const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/** The skeleton rows' bar widths, per row and column, as the merged view's board draws them. */
const SKELETON_WIDTHS = [
  [62, 64, 36, 70, 58, 72],
  [48, 64, 36, 70, 58, 68],
  [56, 64, 16, 16, 16, 68],
  [70, 64, 36, 70, 58, 64],
];

/**
 * The failure tile's one statement (task-8.7 decision 17): the vendor's own words when it spoke,
 * else the shell's reason for the painted cause — with no name in it, since the attribution
 * marker above the tile already says whose it is — and "Couldn't answer." when the vendor ended
 * its task without a word or no cause was painted.
 */
export function failureStatement(failure: SlotFailure | undefined): string {
  switch (failure?.cause) {
    case 'vendor':
      return failure.message ?? 'Couldn’t answer.';
    case 'unreachable':
      return 'Couldn’t be reached.';
    case 'timeout':
      return 'No answer within the time allowed.';
    case 'invalid':
      return 'Answered, but its screen couldn’t be shown.';
    default:
      return 'Couldn’t answer.';
  }
}

/**
 * The collapsed merge's line when it was not declined (task-8.3 decision 9), in the shell's
 * words: the home source it cannot join without, the one source that answered — or none — or the
 * view that could not be made.
 */
export function collapseLine(collapse: SlotCollapse): string {
  switch (collapse.cause) {
    case 'home':
      // Said for the reader (task-8.7 decision 23): what the view needs and what happened to it.
      return `The merged view needs ${collapse.home ?? 'the home source'}, which didn’t load.`;
    case 'few': {
      // Said for the reader (task-8.7 decision 24): what the view needs and who answered.
      const answered = collapse.answered ?? [];
      return answered.length === 0
        ? 'The merged view needs at least two sources, and none answered.'
        : `The merged view needs at least two sources, and only ${listed(answered)} answered.`;
    }
    case 'unmade':
      return 'The merged view couldn’t be made.';
  }
}

function listed(names: readonly string[]): string {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
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
 * SlotView, whose capability tile raises `openStore` and whose presses — Retry on the failure tile,
 * Include and Try again on the merged view's lines — raise the host's press from this slot's
 * surface. Without a press handler no press button is drawn. Sources are named by the host's
 * lookup, the app id without one.
 */
export function createSlotComponent(
  onShellAction: ShellActionHandler,
  {onPress, appDisplayName}: {onPress?: PressHandler; appDisplayName?: AppDisplayName} = {},
) {
  return createComponentImplementation(SlotApi, ({context}) => {
    // Read from the component's own model, not the binder's resolved props: upstream's binder
    // merges each repaint over the last, so a prop the runtime stops painting — `working`, `late`,
    // `retrying` — would keep its old value (`_dev/a2ui-findings.md` §9). Every Slot prop is a
    // literal the runtime paints and repaints, so the model is the whole truth.
    const props = context.componentModel.properties as SlotProps;
    return (
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
        join={props.join}
        declined={props.declined}
        collapse={props.collapse}
        late={props.late}
        working={props.working}
        callFailed={props.callFailed}
        retrying={props.retrying}
        onSearchStore={query => {
          const surfaceId = context.dataContext.surface.id;
          const componentId = context.componentModel.id;
          onShellAction({name: 'openStore', surfaceId, componentId, ...(query ? {query} : {})});
        }}
        onPress={
          onPress &&
          (operation =>
            onPress({
              operation,
              surfaceId: context.dataContext.surface.id,
              componentId: context.componentModel.id,
            }))
        }
        nameOf={appId => appDisplayName?.(appId) ?? appId}
      />
    );
  });
}
