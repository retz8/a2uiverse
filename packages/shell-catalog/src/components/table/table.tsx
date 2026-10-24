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
 */
export function TableView({
  columns,
  columnSources,
  children,
}: {
  columns: string[];
  columnSources?: (string | null)[];
  children?: ReactNode;
}) {
  const resolve = useContext(SlotStateContext);
  const reserved = columns.map((_, index) => reservedColumnState(resolve, columnSources?.[index]));
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
 * A body cell: 40px, over the row divider. The first column names the row's own thing and reads
 * on one line; every other column wraps, capped so one long-text column cannot take the whole
 * width from the rest (task-8.7 decision 29).
 */
export function bodyCellStyle(index: number): CSSProperties {
  return {
    ...cellPadding(index),
    // 8px above and below: a wrapped cell keeps clear of its dividers; a one-line row stays 40px.
    paddingBlock: 8,
    height: 40,
    verticalAlign: 'middle',
    boxShadow: 'inset 0 -1px var(--a2v-line-2, var(--gray-a3))',
    ...(index === 0 ? {whiteSpace: 'nowrap'} : {maxWidth: '56ch', overflowWrap: 'anywhere'}),
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
  return (
    <TableView columns={columns} columnSources={columnSources}>
      {childNodes(children).map(row =>
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
