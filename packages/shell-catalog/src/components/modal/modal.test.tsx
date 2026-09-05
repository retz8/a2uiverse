import {screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, test} from 'vitest';
import {renderTree, type TreeComponent} from '../../testing/render';

const MODAL: TreeComponent[] = [
  {id: 'root', component: 'Modal', trigger: 'open', content: 'body'},
  {id: 'open', component: 'Button', child: 'open-label', action: {event: {name: 'open'}}},
  {id: 'open-label', component: 'Text', text: 'Open'},
  {id: 'body', component: 'Text', text: 'Hello from the dialog'},
];

test('the trigger opens a Radix Dialog inside the bundle boundary, never on body (SPEC §9.2)', async () => {
  const user = userEvent.setup();
  const {container} = renderTree(MODAL);
  expect(screen.queryByRole('dialog')).toBeNull();
  await user.click(screen.getByRole('button', {name: 'Open'}));
  const dialog = screen.getByRole('dialog');
  expect(dialog.className).toMatch(/rt-DialogContent/);
  expect(dialog).toHaveTextContent('Hello from the dialog');
  expect(container.querySelector('.a2uiverse-shell-catalog')!.contains(dialog)).toBe(true);
  expect(container.querySelector('[data-a2uiverse-portal-root]')!.contains(dialog)).toBe(true);
});

test('the close button closes it', async () => {
  const user = userEvent.setup();
  renderTree(MODAL);
  await user.click(screen.getByRole('button', {name: 'Open'}));
  await user.click(screen.getByRole('button', {name: 'Close'}));
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('the trigger still fires its own action', async () => {
  const user = userEvent.setup();
  const actions: string[] = [];
  renderTree(MODAL, {onAction: action => actions.push(action.name)});
  await user.click(screen.getByRole('button', {name: 'Open'}));
  expect(actions).toEqual(['open']);
});
