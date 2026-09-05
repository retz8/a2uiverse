import {fireEvent, screen} from '@testing-library/react';
import {expect, test} from 'vitest';
import {normalizeDateTimeValue} from './date-time-input';
import {renderTree, renderedElements} from '../../testing/render';

test('a change writes the value back to the bound path', () => {
  const {surface} = renderTree(
    [
      {
        id: 'root',
        component: 'DateTimeInput',
        label: 'When',
        enableDate: true,
        value: {path: '/when'},
      },
    ],
    {data: {when: '2026-09-05T11:00:00Z'}},
  );
  const input = screen.getByLabelText('When') as HTMLInputElement;
  expect(input).toHaveAttribute('type', 'date');
  expect(input.value).toBe('2026-09-05');
  fireEvent.change(input, {target: {value: '2026-09-06'}});
  expect(surface.dataModel.get('/when')).toBe('2026-09-06');
});

test('date and time together is a datetime-local input; time alone a time input', () => {
  const both = renderTree([
    {
      id: 'root',
      component: 'DateTimeInput',
      label: 'When',
      enableDate: true,
      enableTime: true,
      value: '2026-09-05T11:00',
    },
  ]);
  expect(screen.getByLabelText('When')).toHaveAttribute('type', 'datetime-local');
  expect((screen.getByLabelText('When') as HTMLInputElement).value).toBe('2026-09-05T11:00');
  both.unmount();
  renderTree([
    {id: 'root', component: 'DateTimeInput', label: 'At', enableTime: true, value: '11:30'},
  ]);
  expect(screen.getByLabelText('At')).toHaveAttribute('type', 'time');
  expect((screen.getByLabelText('At') as HTMLInputElement).value).toBe('11:30');
});

test('with neither date nor time enabled nothing renders, as upstream', () => {
  const {container} = renderTree([{id: 'root', component: 'DateTimeInput', value: ''}]);
  expect(renderedElements(container)).toEqual([]);
});

test('renders the native input through Radix TextField', () => {
  const {container} = renderTree([
    {id: 'root', component: 'DateTimeInput', label: 'When', enableDate: true, value: ''},
  ]);
  expect(container.querySelector('.rt-TextFieldRoot input[type="date"]')).not.toBeNull();
});

test('normalizes an ISO value to what each input type accepts', () => {
  expect(normalizeDateTimeValue('2026-09-05T11:00:00Z', 'date')).toBe('2026-09-05');
  expect(normalizeDateTimeValue('2026-09-05T11:00:00Z', 'time')).toBe('11:00');
  expect(normalizeDateTimeValue('2026-09-05T11:00:00Z', 'datetime-local')).toBe('2026-09-05T11:00');
  expect(normalizeDateTimeValue('', 'date')).toBe('');
  expect(normalizeDateTimeValue(undefined, 'time')).toBe('');
});
