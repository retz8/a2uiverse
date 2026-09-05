import type {SortDeclaration} from '@a2uiverse/sdk';
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, test, vi} from 'vitest';
import {Provider} from '../../provider';
import {SortControlView} from './sort-control';
import {SortControlApi} from './sort-control.schema';

const sort: SortDeclaration = {
  path: '/entries',
  options: [
    {key: '/when', label: 'Time'},
    {key: '/what', label: 'Title'},
  ],
  key: '/when',
  direction: 'asc',
};

const renderControl = (props: Parameters<typeof SortControlView>[0]) =>
  render(
    <Provider>
      <SortControlView {...props} />
    </Provider>,
  );

test('shows the current criterion by its label', () => {
  renderControl({sort, onChange: () => {}});
  expect(screen.getByRole('combobox', {name: 'Sort by'})).toHaveTextContent('Time');
});

test('offers every option by label when opened', async () => {
  const user = userEvent.setup();
  renderControl({sort, onChange: () => {}});
  await user.click(screen.getByRole('combobox', {name: 'Sort by'}));
  expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(['Time', 'Title']);
});

test('choosing another option writes the declaration back with its key changed', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  renderControl({sort, onChange});
  await user.click(screen.getByRole('combobox', {name: 'Sort by'}));
  await user.click(screen.getByRole('option', {name: 'Title'}));
  expect(onChange).toHaveBeenCalledWith({...sort, key: '/what'});
});

test('the direction toggle flips asc and desc', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  renderControl({sort, onChange});
  await user.click(screen.getByRole('button', {name: 'Ascending — switch to descending'}));
  expect(onChange).toHaveBeenCalledWith({...sort, direction: 'desc'});
});

test('renders nothing usable when the binding has not resolved yet', () => {
  renderControl({sort: undefined, onChange: () => {}});
  expect(screen.queryByRole('combobox')).toBeNull();
});

test('renders on Radix Themes: the control is a Radix select trigger', () => {
  renderControl({sort, onChange: () => {}});
  expect(screen.getByRole('combobox', {name: 'Sort by'}).className).toMatch(/rt-SelectTrigger/);
});

test('sort is binding-only: a literal object is rejected', () => {
  const literal = {key: '/when', direction: 'asc', options: [{key: '/when', label: 'Time'}]};
  expect(SortControlApi.schema.safeParse({sort: literal}).success).toBe(false);
});

test('schema binds sort as a dynamic value and rejects extras', () => {
  expect(SortControlApi.schema.safeParse({sort: {path: '/sorts/0'}}).success).toBe(true);
  expect(SortControlApi.schema.safeParse({}).success).toBe(false);
  expect(SortControlApi.schema.safeParse({sort: {path: '/sorts/0'}, label: 'x'}).success).toBe(
    false,
  );
});

test('a bound object that is not a sort declaration renders nothing usable', () => {
  // The Phase 4 client still writes {field, direction, fields} at /sort until 5.5 switches it.
  const legacy = {field: 'best', direction: 'asc', fields: [{name: 'best', label: 'Best'}]};
  renderControl({sort: legacy as never, onChange: () => {}});
  expect(screen.queryByRole('combobox')).toBeNull();
});

test('the options open inside the bundle boundary, never on body (SPEC §9.2 portal anchoring)', async () => {
  const user = userEvent.setup();
  const {container} = renderControl({sort, onChange: () => {}});
  await user.click(screen.getByRole('combobox', {name: 'Sort by'}));
  const listbox = screen.getByRole('listbox');
  expect(container.querySelector('.a2uiverse-shell-catalog')!.contains(listbox)).toBe(true);
});
