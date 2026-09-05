import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, test} from 'vitest';
import {renderTree} from '../../testing/render';

test('typing writes back to the bound path (two-way binding)', async () => {
  const user = userEvent.setup();
  const {surface} = renderTree(
    [{id: 'root', component: 'TextField', label: 'Name', value: {path: '/name'}}],
    {data: {name: 'Ada'}},
  );
  const input = screen.getByLabelText('Name') as HTMLInputElement;
  expect(input.value).toBe('Ada');
  await user.type(input, ' L');
  expect(surface.dataModel.get('/name')).toBe('Ada L');
});

test('the variants pick the control: longText is a Radix TextArea, obscured a password input, number a number input', () => {
  const long = renderTree([
    {id: 'root', component: 'TextField', label: 'Notes', variant: 'longText', value: 'x'},
  ]);
  const area = screen.getByLabelText('Notes');
  expect(area.tagName).toBe('TEXTAREA');
  expect(area.closest('.rt-TextAreaRoot')).not.toBeNull();
  long.unmount();

  const obscured = renderTree([
    {id: 'root', component: 'TextField', label: 'Secret', variant: 'obscured', value: 'x'},
  ]);
  expect(screen.getByLabelText('Secret')).toHaveAttribute('type', 'password');
  obscured.unmount();

  renderTree([{id: 'root', component: 'TextField', label: 'Age', variant: 'number', value: '3'}]);
  const number = screen.getByLabelText('Age');
  expect(number).toHaveAttribute('type', 'number');
  expect(number.closest('.rt-TextFieldRoot')).not.toBeNull();
});

test('a failing check shows its first error and colours the field red', () => {
  const {container} = renderTree(
    [
      {
        id: 'root',
        component: 'TextField',
        label: 'Email',
        value: {path: '/email'},
        checks: [
          {condition: {call: 'email', args: {value: {path: '/email'}}}, message: 'Not an email'},
        ],
      },
    ],
    {data: {email: 'nope'}},
  );
  expect(screen.getByText('Not an email')).toBeInTheDocument();
  expect(container.querySelector('.rt-TextFieldRoot')?.getAttribute('data-accent-color')).toBe(
    'red',
  );
});
