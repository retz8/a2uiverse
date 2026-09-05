import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, test} from 'vitest';
import {renderTree} from '../../testing/render';

test('toggling writes the boolean back to the bound path', async () => {
  const user = userEvent.setup();
  const {surface} = renderTree(
    [{id: 'root', component: 'CheckBox', label: 'Subscribe', value: {path: '/subscribed'}}],
    {data: {subscribed: false}},
  );
  const box = screen.getByRole('checkbox', {name: 'Subscribe'});
  expect(box).toHaveAttribute('data-state', 'unchecked');
  await user.click(box);
  expect(surface.dataModel.get('/subscribed')).toBe(true);
  expect(screen.getByRole('checkbox', {name: 'Subscribe'})).toHaveAttribute(
    'data-state',
    'checked',
  );
  await user.click(screen.getByRole('checkbox', {name: 'Subscribe'}));
  expect(surface.dataModel.get('/subscribed')).toBe(false);
});

test('renders on Radix Checkbox, the label naming the control', () => {
  renderTree([{id: 'root', component: 'CheckBox', label: 'Agree', value: true}]);
  const box = screen.getByRole('checkbox', {name: 'Agree'});
  expect(box.className).toMatch(/rt-CheckboxRoot/);
  expect(box).toHaveAttribute('data-state', 'checked');
});
