import {fireEvent, screen} from '@testing-library/react';
import {expect, test} from 'vitest';
import {renderTree, SURFACE_ID, type TreeComponent} from '../testing/render';
import type {ShellAction} from './shell-actions';

const button = (action: Record<string, unknown>): TreeComponent[] => [
  {id: 'root', component: 'Button', child: 'label', action},
  {id: 'label', component: 'Text', text: 'Go'},
];

test('a button calling openStore hands the host its surface and query, and nothing else', () => {
  const shell: ShellAction[] = [];
  const server: string[] = [];
  renderTree(button({functionCall: {call: 'openStore', args: {query: 'flight booking'}}}), {
    onShellAction: action => shell.push(action),
    onAction: action => server.push(action.name),
  });
  fireEvent.click(screen.getByRole('button', {name: 'Go'}));
  expect(shell).toEqual([{name: 'openStore', surfaceId: SURFACE_ID, query: 'flight booking'}]);
  expect(server).toEqual([]);
});

test('openStore without a query opens the Store without a search', () => {
  const shell: ShellAction[] = [];
  renderTree(button({functionCall: {call: 'openStore', args: {}}}), {
    onShellAction: action => shell.push(action),
  });
  fireEvent.click(screen.getByRole('button', {name: 'Go'}));
  expect(shell).toEqual([{name: 'openStore', surfaceId: SURFACE_ID}]);
});

test('a button calling openAppLibrary hands the host its surface', () => {
  const shell: ShellAction[] = [];
  renderTree(button({functionCall: {call: 'openAppLibrary', args: {}}}), {
    onShellAction: action => shell.push(action),
  });
  fireEvent.click(screen.getByRole('button', {name: 'Go'}));
  expect(shell).toEqual([{name: 'openAppLibrary', surfaceId: SURFACE_ID}]);
});

test('the capability tile searches the Store for the missing capability', () => {
  const shell: ShellAction[] = [];
  const {container} = renderTree([{id: 'root', component: 'Slot', gap: 'flight booking'}], {
    onShellAction: action => shell.push(action),
  });
  const slot = container.querySelector('[data-slot-gap="flight booking"]')!;
  expect(slot).toHaveAttribute('data-slot-state', 'gap');
  expect(slot.textContent).toContain('No installed app can do this.');
  expect(slot.textContent).not.toContain('flight booking');
  fireEvent.click(screen.getByRole('button', {name: 'Search the Store'}));
  expect(shell).toEqual([{name: 'openStore', surfaceId: SURFACE_ID, query: 'flight booking'}]);
});
