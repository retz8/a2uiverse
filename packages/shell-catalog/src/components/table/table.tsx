import {createComponentImplementation} from '@a2ui/react/v0_9';
import {Flex, Table} from '@radix-ui/themes';
import {createContext, useContext, type CSSProperties, type ReactNode} from 'react';
import {SlotStateContext, type SlotStateResolver} from '../../slot-state.js';
import {mapChildList, renderChildList, type BuildChild} from '../shared/child-list.js';
import {SkeletonBar} from '../shared/skeleton.js';
import {TableApi, TableRowApi} from './table.schema.js';

/**
 * Set inside a Table's body, so a row knows it may draw as a table row, and which of its columns
 * are reserved for a source that has not arrived.
 */
const InTableContext = createContext<{reserved: (ReservedState | undefined)[]} | null>(null);

/**
 * A column reserved for its source (task-8.2 decisions 7–8): `pending` while the source is in
 * flight, `failed` once it failed. Filled, collapsed, unmarked, or unknown to the host — the
 * column draws what was authored.
 */
export type ReservedState = 'pending' | 'failed';

export function reservedColumnState(
  resolve: SlotStateResolver,
  source: string | null | undefined,
): ReservedState | undefined {
  if (!source) return undefined;
  const state = resolve(source);
  return state === 'pending' || state === 'failed' ? state : undefined;
}

/** The heading's state word, the client's, in the heading's own register and its accessible name. */
const RESERVED_WORDS: Record<ReservedState, string> = {
  pending: 'loading',
  failed: 'unavailable',
};

/**
 * A column heading: the authored text, and "· loading" or "· unavailable" after it while the
 * column is reserved for a source that has not arrived. Shared with the reserved merge slot.
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
 * for that source is pending or failed (task 8.2): its heading says so and its cells draw a
 * skeleton bar or the empty dash in place of the authored cell, which is drawn once the source
 * has filled — the Synthesizer's own dash until a re-synthesis writes real cells.
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
    <Table.Root size="1" variant="ghost">
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

/** A body cell: 40px, over the row divider. */
export function bodyCellStyle(index: number): CSSProperties {
  return {
    ...cellPadding(index),
    height: 40,
    verticalAlign: 'middle',
    boxShadow: 'inset 0 -1px var(--a2v-line-2, var(--gray-a3))',
  };
}

/** The reserved cell's content: a skeleton bar while loading, the empty dash once failed. */
function ReservedCell({state}: {state: ReservedState}) {
  if (state === 'pending') return <SkeletonBar width="56%" height={8} />;
  return <span style={{color: 'var(--a2v-muted, var(--gray-11))'}}>—</span>;
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
  return (
    <Table.Row>
      {mapChildList(children, buildChild, (node, key, index) => {
        const reserved = table.reserved[index];
        return (
          <Table.Cell
            key={key}
            style={bodyCellStyle(index)}
            {...(reserved ? {'data-column-reserved': reserved} : {})}
          >
            {reserved ? <ReservedCell state={reserved} /> : node}
          </Table.Cell>
        );
      })}
    </Table.Row>
  );
}

/** Catalog entry: `columns` and `columnSources` are literal; the binder resolves `children`. */
export const TableComponent = createComponentImplementation(TableApi, ({props, buildChild}) => (
  <TableView columns={props.columns} columnSources={props.columnSources}>
    {renderChildList(props.children, buildChild)}
  </TableView>
));

/** Catalog entry: the binder resolves `children`; each becomes a cell. */
export const TableRowComponent = createComponentImplementation(
  TableRowApi,
  ({props, buildChild}) => <TableRowView children={props.children} buildChild={buildChild} />,
);
