import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, test} from 'vitest';
import {renderTree, type TreeComponent} from '../../testing/render';

const button = (props: Record<string, unknown> = {}): TreeComponent[] => [
  {id: 'root', component: 'Button', child: 'label', action: {event: {name: 'save'}}, ...props},
  {id: 'label', component: 'Text', text: 'Save'},
];

test('a click dispatches the action as the surface event', async () => {
  const user = userEvent.setup();
  const actions: string[] = [];
  renderTree(button(), {onAction: action => actions.push(action.name)});
  await user.click(screen.getByRole('button', {name: 'Save'}));
  expect(actions).toEqual(['save']);
});

test('the three variants land on Radix Button variants: surface · solid · ghost', () => {
  for (const [variant, radix] of [
    ['default', 'rt-variant-surface'],
    ['primary', 'rt-variant-solid'],
    ['borderless', 'rt-variant-ghost'],
  ] as const) {
    const {unmount} = renderTree(button({variant}));
    const el = screen.getByRole('button', {name: 'Save'});
    expect(el.className, variant).toMatch(/rt-Button/);
    expect(el.className, variant).toContain(radix);
    unmount();
  }
});

test('accessibility label and description become aria attributes', () => {
  renderTree(button({accessibility: {label: 'Save the form', description: 'Sends it'}}));
  const el = screen.getByRole('button', {name: 'Save the form'});
  expect(el).toHaveAttribute('aria-description', 'Sends it');
});

test('a failing check disables the button', () => {
  renderTree(
    button({
      checks: [
        {
          condition: {call: 'required', args: {value: {path: '/name'}}},
          message: 'Name is required',
        },
      ],
    }),
    {data: {name: ''}},
  );
  expect(screen.getByRole('button', {name: 'Save'})).toBeDisabled();
});
