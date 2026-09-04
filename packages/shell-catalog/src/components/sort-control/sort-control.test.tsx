import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, test, vi} from 'vitest';
import {SortControlView} from './sort-control';
import {SortControlApi} from './sort-control.schema';

const sort = {
  field: 'best',
  direction: 'asc',
  fields: [
    {name: 'product', label: 'Camera'},
    {name: 'best', label: 'Best price'},
  ],
} as const;

test('shows the current criterion by label and offers every field', () => {
  render(<SortControlView sort={sort} onChange={() => {}} />);
  const select = screen.getByRole('combobox', {name: 'Sort by'});
  expect(select).toHaveValue('best');
  expect(screen.getAllByRole('option').map(o => o.textContent)).toEqual(['Camera', 'Best price']);
});

test('choosing another field writes the whole object back, fields preserved', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<SortControlView sort={sort} onChange={onChange} />);
  await user.selectOptions(screen.getByRole('combobox', {name: 'Sort by'}), 'product');
  expect(onChange).toHaveBeenCalledWith({...sort, field: 'product'});
});

test('the direction toggle flips asc and desc', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<SortControlView sort={sort} onChange={onChange} />);
  await user.click(screen.getByRole('button', {name: 'Ascending — switch to descending'}));
  expect(onChange).toHaveBeenCalledWith({...sort, direction: 'desc'});
});

test('renders nothing usable when the binding has not resolved yet', () => {
  render(<SortControlView sort={undefined} onChange={() => {}} />);
  expect(screen.queryByRole('combobox')).toBeNull();
});

test('schema binds sort as a dynamic value and rejects extras', () => {
  expect(SortControlApi.schema.safeParse({sort: {path: '/sort'}}).success).toBe(true);
  expect(SortControlApi.schema.safeParse({}).success).toBe(false);
  expect(SortControlApi.schema.safeParse({sort: {path: '/sort'}, label: 'x'}).success).toBe(false);
});
