import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, test} from 'vitest';
import {DerivedValueView} from './derived-value';
import {DerivedValueApi} from './derived-value.schema';

const usd = {kind: 'currency', currency: 'USD'} as const;

test('a complete value renders bare and formatted, with its source count as the accessible name', () => {
  render(<DerivedValueView cell={{value: 899, contributed: 2, of: 2, absent: []}} format={usd} />);
  const cell = screen.getByLabelText('$899.00 · 2 of 2 sources');
  expect(cell).toHaveAttribute('data-state', 'complete');
  expect(cell).toHaveTextContent('$899.00');
  expect(cell.querySelector('[data-marker]')).toBeNull();
});

test('a partial value carries a marker at rest and names the missing source on focus', async () => {
  const user = userEvent.setup();
  render(
    <DerivedValueView
      cell={{value: 899, contributed: 1, of: 2, absent: ['shop-b:list']}}
      format={usd}
    />,
  );
  const cell = screen.getByLabelText('$899.00 · 1 of 2 sources · shop-b not showing this');
  expect(cell).toHaveAttribute('data-state', 'partial');
  expect(cell.querySelector('[data-marker="partial"]')).not.toBeNull();
  expect(cell).not.toHaveTextContent('1 of 2');
  await user.tab();
  expect(cell).toHaveTextContent('1 of 2 sources · shop-b not showing this');
});

test('an absent value renders a dash in place of the value', () => {
  render(
    <DerivedValueView
      cell={{value: undefined, contributed: 0, of: 2, absent: ['shop-a:list', 'shop-b:list']}}
    />,
  );
  const cell = screen.getByLabelText('— · no source is showing this');
  expect(cell).toHaveAttribute('data-state', 'absent');
  expect(cell).toHaveTextContent('—');
  expect(cell.querySelector('[data-marker="absent"]')).not.toBeNull();
});

test('a stale value keeps the previous value and says a source changed', () => {
  render(
    <DerivedValueView
      cell={{value: 899, contributed: 2, of: 2, absent: [], stale: true}}
      format={usd}
    />,
  );
  const cell = screen.getByLabelText('$899.00 · a source changed — recomputing');
  expect(cell).toHaveAttribute('data-state', 'stale');
  expect(cell).toHaveTextContent('$899.00');
  expect(cell.querySelector('[data-marker="stale"]')).not.toBeNull();
});

test('format is fixed configuration: number groups, text stringifies, default is text', () => {
  const {rerender} = render(
    <DerivedValueView
      cell={{value: 12345.5, contributed: 1, of: 1, absent: []}}
      format={{kind: 'number'}}
    />,
  );
  expect(screen.getByText('12,345.5')).toBeInTheDocument();
  rerender(<DerivedValueView cell={{value: 'X100', contributed: 1, of: 1, absent: []}} />);
  expect(screen.getByText('X100')).toBeInTheDocument();
});

test('cell is binding-only: a path or a call, never a literal', () => {
  expect(DerivedValueApi.schema.safeParse({cell: 899}).success).toBe(false);
  expect(DerivedValueApi.schema.safeParse({cell: 'best'}).success).toBe(false);
  expect(
    DerivedValueApi.schema.safeParse({cell: {call: 'value', args: {values: [1]}}}).success,
  ).toBe(true);
});

test('schema binds cell as a dynamic value and keeps format plain', () => {
  const ok = DerivedValueApi.schema.safeParse({cell: {path: 'best'}, format: usd});
  expect(ok.success).toBe(true);
  expect(DerivedValueApi.schema.safeParse({cell: {path: 'best'}}).success).toBe(true);
  expect(DerivedValueApi.schema.safeParse({format: usd}).success).toBe(false);
  expect(DerivedValueApi.schema.safeParse({cell: {path: 'best'}, style: 'loud'}).success).toBe(
    false,
  );
  expect(
    DerivedValueApi.schema.safeParse({cell: {path: 'best'}, format: {kind: 'currency'}}).success,
  ).toBe(false);
});
