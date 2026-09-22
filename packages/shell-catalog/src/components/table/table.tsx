import {createComponentImplementation} from '@a2ui/react/v0_9';
import {Flex, Table} from '@radix-ui/themes';
import {createContext, useContext, type CSSProperties, type ReactNode} from 'react';
import {mapChildList, renderChildList, type BuildChild} from '../shared/child-list.js';
import {TableApi, TableRowApi} from './table.schema.js';

/** Set inside a Table's body, so a row knows it may draw as a table row. */
const InTableContext = createContext(false);

/**
 * `Table` on Radix `Table`, `ghost` variant at size 1, drawn to the merged view's board (task-7.15,
 * the design canvas's F3): no box around it, a 32px heading row in the muted register over a
 * divider, then one 40px row per child, each over a lighter divider, the first column flush with
 * the view's leading edge. Rows are `TableRow`s; a heading cell exists for every column whether
 * or not a row fills it. The reserved merge slot draws its skeleton through the same geometry.
 */
export function TableView({columns, children}: {columns: string[]; children?: ReactNode}) {
  return (
    <Table.Root size="1" variant="ghost">
      <Table.Header>
        <Table.Row>
          {columns.map((column, index) => (
            <Table.ColumnHeaderCell key={`${column}-${index}`} style={headingCellStyle(index)}>
              {column}
            </Table.ColumnHeaderCell>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <InTableContext.Provider value={true}>{children}</InTableContext.Provider>
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

/**
 * `TableRow`: each resolved child in its own cell. Outside a Table — an authoring slip, or the
 * design-check sweep rendering the row alone — it draws as a plain flex row instead of a `<tr>`
 * the document has no table for.
 */
export function TableRowView({children, buildChild}: {children: unknown; buildChild: BuildChild}) {
  const inTable = useContext(InTableContext);
  if (!inTable) {
    return (
      <Flex direction="row" gap="3" align="center">
        {renderChildList(children, buildChild)}
      </Flex>
    );
  }
  return (
    <Table.Row>
      {mapChildList(children, buildChild, (node, key, index) => (
        <Table.Cell key={key} style={bodyCellStyle(index)}>
          {node}
        </Table.Cell>
      ))}
    </Table.Row>
  );
}

/** Catalog entry: `columns` are literal headings; the binder resolves `children`. */
export const TableComponent = createComponentImplementation(TableApi, ({props, buildChild}) => (
  <TableView columns={props.columns}>{renderChildList(props.children, buildChild)}</TableView>
));

/** Catalog entry: the binder resolves `children`; each becomes a cell. */
export const TableRowComponent = createComponentImplementation(
  TableRowApi,
  ({props, buildChild}) => <TableRowView children={props.children} buildChild={buildChild} />,
);
