import {
  createComponentImplementation,
  type NodeBuildChild,
  type NodeViewProps,
  type ReactCatalogComponent,
  type ReactComponentImplementation,
  useSignalValue,
} from '@a2ui/react/v0_9';
import {isComponentNode, ResolvedBinding, type ComponentNode} from '@a2ui/web_core/v0_9';
import {Flex, Table} from '@radix-ui/themes';
import {createContext, Fragment, useContext, type CSSProperties, type ReactNode} from 'react';
import {
  SlotStateContext,
  UPDATE_SLOT_STATES,
  type SlotStateResolver,
  type SourceSlotState,
  type UpdateSlotState,
} from '../../slot-state.js';
import {SynthesisStreamingContext} from '../../synthesis-streaming.js';
import {mapChildList, renderChildList, type BuildChild} from '../shared/child-list.js';
import {SkeletonBar} from '../shared/skeleton.js';
import {TableApi, TableRowApi} from './table.schema.js';

/**
 * Set inside a Table's body, so a row knows it may draw as a table row, and which of its columns
 * are reserved for a source that has not arrived.
 */
const InTableContext = createContext<{reserved: (ReservedState | undefined)[]} | null>(null);

/**
 * A column reserved for its source (task-8.2 decisions 7–8, task-8.5 decision 12): `pending` while
 * the source is in flight or being included, `failed` once it failed, `late` while it waits for
 * Include, `authority` while it needs sign-in (task-12.3 decision 8), `connect` while it needs a
 * pasted key or token (task-12.13 decision 32), `more` while its account is asked for more access
 * (task-12.13 decision 50), and each of the update tile's lines while it is on the update tile
 * (task-15.8 decision 4). Filled, collapsed, unmarked, or unknown to the host — the column draws
 * what was authored.
 */
export type ReservedState =
  'pending' | 'failed' | 'late' | 'authority' | 'connect' | 'more' | UpdateSlotState;

const RESERVED_STATES: readonly SourceSlotState[] = [
  'pending',
  'failed',
  'late',
  'authority',
  'connect',
  'more',
  ...UPDATE_SLOT_STATES,
];

export function reservedColumnState(
  resolve: SlotStateResolver,
  source: string | null | undefined,
): ReservedState | undefined {
  if (!source) return undefined;
  const state = resolve(source);
  return state !== undefined && RESERVED_STATES.includes(state)
    ? (state as ReservedState)
    : undefined;
}

/** The heading's state word, the client's, in the heading's own register and its accessible name. */
const RESERVED_WORDS: Record<ReservedState, string> = {
  pending: 'loading',
  failed: 'unavailable',
  late: 'not included',
  authority: 'not signed in',
  connect: 'not connected',
  more: 'needs more access',
  update: 'needs an update',
  'update-waiting': 'waiting on its publisher',
  'update-unreached': 'couldn’t check for updates',
  'update-none': 'no update available',
};

/**
 * A column heading: the authored text, and "· loading", "· unavailable", "· not included" or
 * "· not signed in" after it while the column is reserved for its source. Shared with the reserved merge slot.
 */
export function ColumnHeading({column, reserved}: {column: string; reserved?: ReservedState}) {
  if (!reserved) return <>{column}</>;
  return (
    <>
      {column}
      <span data-column-heading-state={reserved}> · {RESERVED_WORDS[reserved]}</span>
    </>
  );
}

/** The rows the reserved merged view draws as skeleton bars, which the view's rows take one for one. */
export const RESERVED_ROWS = 4;

/** The skeleton rows' bar widths, per row and column, as the merged view's board draws them. */
const SKELETON_WIDTHS = [
  [62, 64, 36, 70, 58, 72],
  [48, 64, 36, 70, 58, 68],
  [56, 64, 16, 16, 16, 68],
  [70, 64, 36, 70, 58, 64],
];

/**
 * Rows of skeleton bars in the table's own geometry: the reserved merged view's four (task-7.15),
 * and the rows still to come below a view drawn as it is written (task-17.10 decision 4). `from`
 * says which of the four widths the first one takes, so a row below the view's last keeps its
 * place's shape.
 */
export function SkeletonRows({
  count,
  columns,
  from = 0,
}: {
  count: number;
  columns: number;
  from?: number;
}) {
  return (
    <>
      {Array.from({length: count}, (_, row) => {
        const widths = SKELETON_WIDTHS[(from + row) % SKELETON_WIDTHS.length]!;
        return (
          <Table.Row key={`skeleton-${row}`} data-skeleton-row="">
            {Array.from({length: columns}, (_, index) => (
              <Table.Cell key={index} style={bodyCellStyle(index)}>
                <SkeletonBar width={`${widths[index % widths.length]}%`} height={8} />
              </Table.Cell>
            ))}
          </Table.Row>
        );
      })}
    </>
  );
}

/**
 * `Table` on Radix `Table`, `ghost` variant at size 1, drawn to the merged view's board (task-7.15,
 * the design canvas's F3): no box around it, a 32px heading row in the muted register over a
 * divider, then one 40px row per child, each over a lighter divider, the first column flush with
 * the view's leading edge. Rows are `TableRow`s; a heading cell exists for every column whether
 * or not a row fills it. The reserved merge slot draws its skeleton through the same geometry.
 *
 * A column marked to a source through `columnSources` is reserved while the host's slot state
 * for that source is pending, failed, late or needs sign-in (tasks 8.2, 8.5, 12.3): its heading
 * says so; while pending its cells draw a skeleton bar, while failed or needing sign-in the empty
 * dash, in place of the authored cell, and while late the authored cells stand — the Synthesizer's own dashes until an Include writes real cells.
 *
 * While the host says the merged view is still being written (task-17.10 decision 4), the rows
 * take the reserved slot's four skeleton rows' places one for one, and one skeleton row stays
 * below the last; it goes once the document is accepted. `rows` is how many the table holds.
 */
export function TableView({
  columns,
  columnSources,
  rows = 0,
  children,
}: {
  columns: string[];
  columnSources?: (string | null)[];
  rows?: number;
  children?: ReactNode;
}) {
  const resolve = useContext(SlotStateContext);
  const streaming = useContext(SynthesisStreamingContext);
  const reserved = columns.map((_, index) => reservedColumnState(resolve, columnSources?.[index]));
  const toCome = streaming ? Math.max(RESERVED_ROWS - rows, 1) : 0;
  return (
    // A table that cannot fit its slot scrolls sideways inside it rather than crushing a column
    // (task-8.7 decision 29).
    <Table.Root size="1" variant="ghost" style={{overflowX: 'auto', maxWidth: '100%'}}>
      <Table.Header>
        <Table.Row>
          {columns.map((column, index) => (
            <Table.ColumnHeaderCell key={`${column}-${index}`} style={headingCellStyle(index)}>
              <ColumnHeading column={column} reserved={reserved[index]} />
            </Table.ColumnHeaderCell>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <InTableContext.Provider value={{reserved}}>{children}</InTableContext.Provider>
        {toCome > 0 && <SkeletonRows count={toCome} columns={columns.length} from={rows} />}
      </Table.Body>
    </Table.Root>
  );
}

/** A cell's side padding: 12px, none on the leading edge of the first column. */
function cellPadding(index: number): CSSProperties {
  return {paddingBlock: 0, paddingInline: index === 0 ? '0 12px' : '12px'};
}

/** A heading cell: 32px, 12px medium in the muted register, over the heading divider. */
export function headingCellStyle(index: number): CSSProperties {
  return {
    ...cellPadding(index),
    height: 32,
    verticalAlign: 'middle',
    fontSize: 12,
    lineHeight: '16px',
    fontWeight: 500,
    color: 'var(--a2v-muted, var(--gray-11))',
    boxShadow: 'inset 0 -1px var(--a2v-line, var(--gray-a5))',
    whiteSpace: 'nowrap',
  };
}

/**
 * A body cell: 40px, over the row divider. Every column wraps, capped so one long-text column
 * cannot take the whole width from the rest; the first column names the row's own thing and keeps
 * room for a short name on one line (task-8.7 decision 29, the first column wrapping since
 * task 17.10's live check).
 */
export function bodyCellStyle(index: number): CSSProperties {
  return {
    ...cellPadding(index),
    // 8px above and below: a wrapped cell keeps clear of its dividers; a one-line row stays 40px.
    paddingBlock: 8,
    height: 40,
    verticalAlign: 'middle',
    boxShadow: 'inset 0 -1px var(--a2v-line-2, var(--gray-a3))',
    maxWidth: '56ch',
    overflowWrap: 'anywhere',
    ...(index === 0 ? {minWidth: '16ch'} : {}),
  };
}

/**
 * The reserved cell's content: a skeleton bar while loading, the empty dash once failed, while it
 * needs sign-in and while it is on the update tile.
 */
function ReservedCell({state}: {state: Exclude<ReservedState, 'late'>}) {
  if (state === 'pending') return <SkeletonBar width="56%" height={8} />;
  return <span style={{color: 'var(--a2v-muted, var(--gray-11))'}}>—</span>;
}

/** A body row inside a Table: each built cell in its own `<td>`, a reserved column's drawn for it. */
function TableBodyRow({cells}: {cells: {key: string; node: ReactNode}[]}) {
  const table = useContext(InTableContext);
  return (
    <Table.Row>
      {cells.map(({key, node}, index) => {
        const reserved = table?.reserved[index];
        return (
          <Table.Cell
            key={key}
            style={bodyCellStyle(index)}
            {...(reserved ? {'data-column-reserved': reserved} : {})}
          >
            {reserved && reserved !== 'late' ? <ReservedCell state={reserved} /> : node}
          </Table.Cell>
        );
      })}
    </Table.Row>
  );
}

/**
 * `TableRow`: each resolved child in its own cell. Outside a Table — an authoring slip, or the
 * design-check sweep rendering the row alone — it draws as a plain flex row instead of a `<tr>`
 * the document has no table for.
 */
export function TableRowView({children, buildChild}: {children: unknown; buildChild: BuildChild}) {
  const table = useContext(InTableContext);
  if (!table) {
    return (
      <Flex direction="row" gap="3" align="center">
        {renderChildList(children, buildChild)}
      </Flex>
    );
  }
  const cells: {key: string; node: ReactNode}[] = [];
  mapChildList(children, buildChild, (node, key) => cells.push({key, node}));
  return <TableBodyRow cells={cells} />;
}

/** The component nodes a resolved child list holds, through a template's binding. */
function childNodes(value: unknown): ComponentNode<ReactCatalogComponent>[] {
  if (value instanceof ResolvedBinding) return childNodes(value.value);
  if (Array.isArray(value)) return value.flatMap(childNodes);
  return isComponentNode(value) ? [value as ComponentNode<ReactCatalogComponent>] : [];
}

/** A `TableRow` node drawn by its Table: its cells, each rendered in its own `<td>`. */
function TableRowNode({
  row,
  buildChild,
}: {
  row: ComponentNode<ReactCatalogComponent>;
  buildChild: NodeBuildChild;
}) {
  const {children} = useSignalValue(row.props) as {children?: unknown};
  return (
    <TableBodyRow
      cells={childNodes(children).map(cell => ({key: cell.id, node: buildChild(cell)}))}
    />
  );
}

/**
 * The Table as the renderer draws it: the renderer hosts each component in an element of its own,
 * which a `<tbody>` cannot hold (`_dev/a2ui-findings.md` §18), so the Table draws each `TableRow`
 * child's `<tr>` itself and renders only the cells' content through the renderer (task-16.6
 * decision 4). A child that is not a `TableRow` renders as itself.
 */
function TableNodeView({node, buildChild}: NodeViewProps) {
  const {columns, columnSources, children} = useSignalValue(node.props) as {
    columns: string[];
    columnSources?: (string | null)[];
    children?: unknown;
  };
  const rows = childNodes(children);
  return (
    <TableView columns={columns} columnSources={columnSources} rows={rows.length}>
      {rows.map(row =>
        row.type === TableRowApi.name ? (
          <TableRowNode key={row.id} row={row} buildChild={buildChild} />
        ) : (
          <Fragment key={row.id}>{buildChild(row)}</Fragment>
        ),
      )}
    </TableView>
  );
}

/**
 * Catalog entry: `columns` and `columnSources` are literal; the binder resolves `children`.
 * `columns` is a plain list of headings, which upstream types as a child list
 * (`_dev/a2ui-findings.md` §17).
 */
export const TableComponent: ReactComponentImplementation = {
  ...createComponentImplementation(TableApi, ({props, buildChild}) => (
    <TableView columns={props.columns as string[]} columnSources={props.columnSources}>
      {renderChildList(props.children, buildChild)}
    </TableView>
  )),
  view: TableNodeView,
};

/** Catalog entry: the binder resolves `children`; each becomes a cell. */
export const TableRowComponent = createComponentImplementation(
  TableRowApi,
  ({props, buildChild}) => <TableRowView children={props.children} buildChild={buildChild} />,
);
