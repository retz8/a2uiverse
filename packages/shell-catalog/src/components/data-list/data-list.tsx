import {createComponentImplementation} from '@a2ui/react/v0_9';
import {DataList, Flex, Text} from '@radix-ui/themes';
import {createContext, useContext, type ReactNode} from 'react';
import {renderChildList, type BuildChild} from '../shared/child-list.js';
import {DataListApi, DataListItemApi} from './data-list.schema.js';

/** Set inside a DataList, so an item knows it may draw as a definition-list item. */
const InDataListContext = createContext(false);

/** `DataList` on Radix `DataList`, size 2: its children are `DataListItem`s. */
export function DataListView({
  orientation = 'horizontal',
  children,
}: {
  orientation?: 'horizontal' | 'vertical';
  children?: ReactNode;
}) {
  return (
    <DataList.Root size="2" orientation={orientation}>
      <InDataListContext.Provider value={true}>{children}</InDataListContext.Provider>
    </DataList.Root>
  );
}

/**
 * `DataListItem`: the label beside its one child. Outside a DataList it draws as a labelled row,
 * for the same reason `TableRow` does.
 */
export function DataListItemView({label, children}: {label: string; children?: ReactNode}) {
  const inList = useContext(InDataListContext);
  if (!inList) {
    return (
      <Flex direction="row" gap="3" align="center">
        <Text size="1" color="gray">
          {label}
        </Text>
        {children}
      </Flex>
    );
  }
  return (
    <DataList.Item>
      <DataList.Label>{label}</DataList.Label>
      <DataList.Value>{children}</DataList.Value>
    </DataList.Item>
  );
}

/** Catalog entry: the binder resolves `children`. */
export const DataListComponent = createComponentImplementation(
  DataListApi,
  ({props, buildChild}) => (
    <DataListView orientation={props.orientation}>
      {renderChildList(props.children, buildChild)}
    </DataListView>
  ),
);

/** Catalog entry: `label` resolves through the binder; `child` is built by the renderer. */
export const DataListItemComponent = createComponentImplementation(
  DataListItemApi,
  ({props, buildChild}: {props: {label: unknown; child: string}; buildChild: BuildChild}) => (
    <DataListItemView label={String(props.label ?? '')}>
      {props.child ? buildChild(props.child) : null}
    </DataListItemView>
  ),
);
