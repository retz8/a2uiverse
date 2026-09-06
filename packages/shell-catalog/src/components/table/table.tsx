import {createComponentImplementation} from '@a2ui/react/v0_9';
import {Flex, Table} from '@radix-ui/themes';
import {createContext, useContext, type ReactNode} from 'react';
import {mapChildList, renderChildList, type BuildChild} from '../shared/child-list.js';
import {TableApi, TableRowApi} from './table.schema.js';

/** Set inside a Table's body, so a row knows it may draw as a table row. */
const InTableContext = createContext(false);

/**
 * `Table` on Radix `Table`, `surface` variant at size 1: a heading row from `columns`, then one
 * row per child. Rows are `TableRow`s; a heading cell exists for every column whether or not a
 * row fills it.
 */
export function TableView({columns, children}: {columns: string[]; children?: ReactNode}) {
  return (
    <Table.Root size="1" variant="surface">
      <Table.Header>
        <Table.Row>
          {columns.map((column, index) => (
            <Table.ColumnHeaderCell key={`${column}-${index}`}>{column}</Table.ColumnHeaderCell>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <InTableContext.Provider value={true}>{children}</InTableContext.Provider>
      </Table.Body>
    </Table.Root>
  );
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
      {mapChildList(children, buildChild, (node, key) => (
        <Table.Cell key={key}>{node}</Table.Cell>
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
