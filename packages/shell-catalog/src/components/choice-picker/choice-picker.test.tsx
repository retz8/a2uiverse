import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, test} from 'vitest';
import {renderTree, type TreeComponent} from '../../testing/render';

const OPTIONS = [
  {label: 'Small', value: 's'},
  {label: 'Medium', value: 'm'},
  {label: 'Large', value: 'l'},
];

const picker = (props: Record<string, unknown>): TreeComponent[] => [
  {
    id: 'root',
    component: 'ChoicePicker',
    label: 'Size',
    options: OPTIONS,
    value: {path: '/size'},
    ...props,
  },
];

test('mutually exclusive × checkbox is a Radix RadioGroup; choosing writes a one-element list', async () => {
  const user = userEvent.setup();
  const {surface, container} = renderTree(picker({}), {data: {size: ['s']}});
  expect(container.querySelector('.rt-RadioGroupRoot')).not.toBeNull();
  expect(screen.getByRole('radio', {name: 'Small'})).toHaveAttribute('data-state', 'checked');
  await user.click(screen.getByRole('radio', {name: 'Large'}));
  expect(surface.dataModel.get('/size')).toEqual(['l']);
});

test('multiple selection × checkbox is a Radix CheckboxGroup; toggling writes the whole list', async () => {
  const user = userEvent.setup();
  const {surface, container} = renderTree(picker({variant: 'multipleSelection'}), {
    data: {size: ['s']},
  });
  expect(container.querySelector('.rt-CheckboxGroupRoot')).not.toBeNull();
  await user.click(screen.getByRole('checkbox', {name: 'Large'}));
  expect(surface.dataModel.get('/size')).toEqual(['s', 'l']);
  await user.click(screen.getByRole('checkbox', {name: 'Small'}));
  expect(surface.dataModel.get('/size')).toEqual(['l']);
});

test('mutually exclusive × chips is a Radix SegmentedControl', async () => {
  const user = userEvent.setup();
  const {surface, container} = renderTree(picker({displayStyle: 'chips'}), {data: {size: ['m']}});
  expect(container.querySelector('.rt-SegmentedControlRoot')).not.toBeNull();
  expect(screen.getByRole('radio', {name: 'Medium'})).toHaveAttribute('data-state', 'on');
  await user.click(screen.getByRole('radio', {name: 'Large'}));
  expect(surface.dataModel.get('/size')).toEqual(['l']);
});

test('multiple selection × chips is a run of toggle buttons', async () => {
  const user = userEvent.setup();
  const {surface} = renderTree(picker({variant: 'multipleSelection', displayStyle: 'chips'}), {
    data: {size: ['m']},
  });
  const medium = screen.getByRole('button', {name: 'Medium', pressed: true});
  expect(medium.className).toMatch(/rt-Button/);
  await user.click(screen.getByRole('button', {name: 'Large', pressed: false}));
  expect(surface.dataModel.get('/size')).toEqual(['m', 'l']);
  await user.click(screen.getByRole('button', {name: 'Medium'}));
  expect(surface.dataModel.get('/size')).toEqual(['l']);
});

test('filterable narrows the options as the user types, locally', async () => {
  const user = userEvent.setup();
  renderTree(picker({filterable: true}), {data: {size: []}});
  expect(screen.getAllByRole('radio')).toHaveLength(3);
  await user.type(screen.getByRole('textbox', {name: 'Filter options'}), 'la');
  expect(screen.getAllByRole('radio').map(r => r.getAttribute('value'))).toEqual(['l']);
});

test('two pickers on one surface keep their groups apart (the upstream radio-name collision)', async () => {
  const user = userEvent.setup();
  const {surface} = renderTree(
    [
      {id: 'root', component: 'Column', children: ['a', 'b']},
      {id: 'a', component: 'ChoicePicker', label: 'A', options: OPTIONS, value: {path: '/a'}},
      {id: 'b', component: 'ChoicePicker', label: 'B', options: OPTIONS, value: {path: '/b'}},
    ],
    {data: {a: ['s'], b: ['s']}},
  );
  const [, largeB] = screen.getAllByRole('radio', {name: 'Large'});
  await user.click(largeB);
  expect(surface.dataModel.get('/a')).toEqual(['s']);
  expect(surface.dataModel.get('/b')).toEqual(['l']);
});
