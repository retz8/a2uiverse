import type {SortDeclaration} from '@a2uiverse/sdk';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {Flex, IconButton, Select, Text} from '@radix-ui/themes';
import {useContext} from 'react';
import {PortalRootContext} from '../../provider.js';
import {SortControlApi} from './sort-control.schema.js';

/**
 * Displays the sort criterion and lets the user change it (SPEC §5.2): the criterion is
 * always displayed and always user-changeable, and with no caption on the merged view
 * this control is where the criterion is read. Runtime-driven from the sort declaration
 * the runtime writes at `/sorts/N` — options and labels are the model's, the choice is
 * the user's; the tree only places it. Built on Radix Themes (task-5.3 decision 1).
 */
export function SortControlView({
  sort,
  onChange,
}: {
  sort: SortDeclaration | undefined;
  onChange: (next: SortDeclaration) => void;
}) {
  // Not a declaration (unresolved): nothing usable.
  const portalRoot = useContext(PortalRootContext);
  if (!sort || !Array.isArray(sort.options)) return null;
  const asc = sort.direction === 'asc';
  const flipLabel = asc ? 'Ascending — switch to descending' : 'Descending — switch to ascending';

  return (
    <Flex align="center" gap="2" display="inline-flex">
      <Text size="1" color="gray">
        Sort by
      </Text>
      <Select.Root size="1" value={sort.key} onValueChange={key => onChange({...sort, key})}>
        <Select.Trigger variant="soft" aria-label="Sort by" />
        <Select.Content position="popper" container={portalRoot ?? undefined}>
          {sort.options.map(option => (
            <Select.Item key={option.key} value={option.key}>
              {option.label}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
      <IconButton
        size="1"
        variant="soft"
        color="gray"
        aria-label={flipLabel}
        title={flipLabel}
        onClick={() => onChange({...sort, direction: asc ? 'desc' : 'asc'})}
      >
        {asc ? '↑' : '↓'}
      </IconButton>
    </Flex>
  );
}

/**
 * Catalog entry: `sort` resolves to the runtime's declaration; `setSort` is the binder's
 * two-way write to the same path. Upstream types a setter by the prop union's literal
 * branches, and a binding-only prop has none — so `setSort` arrives typed `(value: never)`
 * although at runtime it writes whatever it is given (`_dev/a2ui-findings.md` §4).
 */
export const SortControlComponent = createComponentImplementation(SortControlApi, ({props}) => (
  <SortControlView
    sort={props.sort as SortDeclaration | undefined}
    onChange={(next: SortDeclaration) => props.setSort(next as never)}
  />
));
