import {render, screen, within} from '@testing-library/react';
import type {ReactNode} from 'react';
import {expect, test} from 'vitest';
import {AppActContext, type AppActRequest, type AppActState} from '../../app-act';
import {PressStateContext, type PressRecord} from '../../press-state';
import {SlotContentContext} from '../../slot-content';
import {renderTree} from '../../testing/render';
import {LOST_WORDS, UNREACHED_WORDS} from './press-lines';
import {SlotView} from './slot';
import type {SlotUpdate} from './slot.schema';

/* ── Task 15.8: the update tile's four lines, and what follows Update ─────────── */

const NEEDS: SlotUpdate = {
  state: 'major-update',
  installedVersion: '1.0.0',
  publishedVersion: '2.0.0',
  newScopes: [],
  publisher: 'northlight',
};
const WAITING: SlotUpdate = {
  state: 'ahead-of-store',
  installedVersion: '1.0.0',
  publishedVersion: '1.0.0',
  publisher: 'northlight',
};
const UNREACHED: SlotUpdate = {state: 'unknown', installedVersion: '1.0.0'};
const NONE: SlotUpdate = {state: 'not-published', installedVersion: '1.0.0'};

function acts(
  act: AppActState['act'] = () => undefined,
  installed: Record<string, string> = {'shop-b': '1.0.0'},
  busy: readonly string[] = [],
): AppActState {
  return {act, installed: appId => installed[appId], busy: appId => busy.includes(appId)};
}

function withHost(
  node: ReactNode,
  {
    act,
    presses = [],
    enabled = true,
    content,
  }: {act?: AppActState; presses?: PressRecord[]; enabled?: boolean; content?: ReactNode} = {},
) {
  return (
    <SlotContentContext.Provider value={() => content ?? null}>
      <PressStateContext.Provider value={{enabled, presses}}>
        <AppActContext.Provider value={act ?? acts()}>{node}</AppActContext.Provider>
      </PressStateContext.Provider>
    </SlotContentContext.Provider>
  );
}

const tile = (update: SlotUpdate, extra: Record<string, unknown> = {}) => (
  <SlotView
    source="shop-b"
    state="update"
    update={update}
    nameOf={() => 'Shop B'}
    onPress={() => {}}
    onAppAct={() => {}}
    {...extra}
  />
);

const retry = (status: PressRecord['status']): PressRecord => ({
  operation: {kind: 'retry', sources: ['shop-b']},
  status,
});

test.each([
  [NEEDS, 'update', 'Shop B needs an update to show this.', 'Update'],
  [
    WAITING,
    'waiting',
    'Shop B has changed, and the Store is waiting on its publisher, northlight.',
    'Check again',
  ],
  [UNREACHED, 'unreached', 'Shop B has changed, and the Store couldn’t be reached.', 'Retry'],
  [NONE, 'none', 'Shop B has changed, and the Store has no update for it.', undefined],
] as const)(
  'one line under the marker, by what the Store holds (%#): %s',
  (update, line, words, press) => {
    const {container} = render(withHost(tile(update)));
    const slot = container.querySelector('[data-slot="shop-b"]')!;
    expect(slot).toHaveAttribute('data-slot-state', 'update');
    expect(slot.querySelector('[data-update-line]')).toHaveAttribute('data-update-line', line);
    expect(screen.getByText(words)).toBeInTheDocument();
    const buttons = screen.queryAllByRole('button');
    expect(buttons.map(button => button.textContent)).toEqual(press ? [press] : []);
  },
);

test('the line is named for assistive technology in the column’s short words (task-15.8 decision 4)', () => {
  const names = [NEEDS, WAITING, UNREACHED, NONE].map(update => {
    const {unmount} = render(withHost(tile(update)));
    const name = screen.getByRole('group').getAttribute('aria-label');
    unmount();
    return name;
  });
  expect(names).toEqual([
    'Shop B, needs an update',
    'Shop B, waiting on its publisher',
    'Shop B, couldn’t check for updates',
    'Shop B, no update available',
  ]);
});

test('the update tile stands over a fragment on screen, as the failure tile does', () => {
  render(withHost(tile(NEEDS), {content: <em>Shop B’s answer</em>}));
  expect(screen.getByText('Shop B needs an update to show this.')).toBeInTheDocument();
  expect(screen.queryByText('Shop B’s answer')).not.toBeInTheDocument();
});

test('through the catalog, Update hands the host the app, the source, the slot and the button pressed', () => {
  const pressed: AppActRequest[] = [];
  renderTree([{id: 'root', component: 'Slot', source: 'shop-b', state: 'update', update: NEEDS}], {
    onAppAct: request => pressed.push(request),
  });
  const update = screen.getByRole('button', {name: 'Update'});
  update.click();
  expect(pressed).toEqual([
    {
      kind: 'update',
      appId: 'shop-b',
      source: 'shop-b',
      surfaceId: 'test',
      componentId: 'root',
      anchor: update,
    },
  ]);
});

test('an account’s slot names the app its source belongs to', () => {
  const pressed: AppActRequest[] = [];
  renderTree([{id: 'root', component: 'Slot', source: 'gmail.2', state: 'update', update: NEEDS}], {
    onAppAct: request => pressed.push(request),
  });
  screen.getByRole('button', {name: 'Update'}).click();
  expect(pressed[0]).toMatchObject({appId: 'gmail', source: 'gmail.2'});
});

test('without a host that takes app presses the line draws no Update', () => {
  render(withHost(tile(NEEDS, {onAppAct: undefined})));
  expect(screen.getByText('Shop B needs an update to show this.')).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

test('the Store unreached: Retry is the slot’s retry', () => {
  const operations: unknown[] = [];
  render(withHost(tile(UNREACHED, {onPress: (operation: unknown) => operations.push(operation)})));
  screen.getByRole('button', {name: 'Retry'}).click();
  expect(operations).toEqual([{kind: 'retry', sources: ['shop-b']}]);
});

test('the Store waiting on the publisher: Check again is the slot’s retry, judged afresh (task-15.11 decision 39)', () => {
  const operations: unknown[] = [];
  render(withHost(tile(WAITING, {onPress: (operation: unknown) => operations.push(operation)})));
  screen.getByRole('button', {name: 'Check again'}).click();
  expect(operations).toEqual([{kind: 'retry', sources: ['shop-b']}]);
});

test('Check again pressed: Loading… in its place, the line as it was', () => {
  render(withHost(tile(WAITING), {presses: [retry('sent')]}));
  expect(
    screen.getByText('Shop B has changed, and the Store is waiting on its publisher, northlight.'),
  ).toBeInTheDocument();
  expect(screen.getByText('Loading…')).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

test('updating: the press reads Updating, the line as it was', () => {
  render(
    withHost(tile(NEEDS), {
      act: acts(where => ('source' in where ? {appId: 'shop-b', status: 'running'} : undefined)),
    }),
  );
  expect(screen.getByText('Shop B needs an update to show this.')).toBeInTheDocument();
  expect(screen.getByText('Updating')).toBeInTheDocument();
  expect(screen.queryByRole('button', {name: 'Update'})).not.toBeInTheDocument();
});

test('held elsewhere — the app’s install or update running from another slot or the page — Update draws disabled, the line as it was (task-15.9 decision 1)', () => {
  render(
    withHost(tile(NEEDS, {onAppAct: () => {}}), {act: acts(undefined, undefined, ['shop-b'])}),
  );
  expect(screen.getByText('Shop B needs an update to show this.')).toBeInTheDocument();
  expect(screen.getByRole('button', {name: 'Update'})).toBeDisabled();
});

test('asking — the entry read again, the consent card open — Update is held, its words unchanged (task-15.9 decision 7)', () => {
  render(
    withHost(tile(NEEDS, {onAppAct: () => {}}), {
      act: acts(
        where => ('source' in where ? {appId: 'shop-b', status: 'asking'} : undefined),
        undefined,
        ['shop-b'],
      ),
    }),
  );
  expect(screen.getByRole('button', {name: 'Update'})).toBeDisabled();
  expect(screen.queryByText('Updating')).not.toBeInTheDocument();
});

test('Show it here draws disabled while the app is held elsewhere', () => {
  render(
    withHost(tile(WAITING, {onAppAct: () => {}}), {
      act: acts(undefined, {'shop-b': '2.0.0'}, ['shop-b']),
    }),
  );
  expect(screen.getByRole('button', {name: 'Show it here'})).toBeDisabled();
});

test('updated, its request sent again: the line says it is updated, with Loading… (task-15.11 decision 40)', () => {
  render(
    withHost(tile(NEEDS), {act: acts(undefined, {'shop-b': '2.0.0'}), presses: [retry('sent')]}),
  );
  expect(screen.getByText('Shop B is updated.')).toBeInTheDocument();
  expect(screen.queryByText('Shop B needs an update to show this.')).not.toBeInTheDocument();
  expect(screen.getByText('Loading…')).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.getByRole('group')).toHaveAttribute('aria-label', 'Shop B, updated');
});

test('the slot keeps the update line through its pending repaint, until the answer lands (task-15.8 decision 2)', () => {
  const pending = (content?: ReactNode) =>
    withHost(
      <SlotView
        source="shop-b"
        state="pending"
        update={NEEDS}
        nameOf={() => 'Shop B'}
        onAppAct={() => {}}
      />,
      {act: acts(undefined, {'shop-b': '2.0.0'}), content},
    );
  const {container, rerender} = render(pending());
  expect(container.querySelector('[data-slot="shop-b"]')).toHaveAttribute(
    'data-slot-state',
    'pending',
  );
  expect(screen.getByText('Shop B is updated.')).toBeInTheDocument();
  expect(screen.getByText('Loading…')).toBeInTheDocument();
  rerender(pending(<em>Shop B’s answer</em>));
  expect(screen.getByText('Shop B’s answer')).toBeInTheDocument();
  expect(screen.queryByText('Shop B is updated.')).not.toBeInTheDocument();
});

test('the Store unreached, Retry pressed: Loading… in Retry’s place', () => {
  render(withHost(tile(UNREACHED), {presses: [retry('sent')]}));
  expect(
    screen.getByText('Shop B has changed, and the Store couldn’t be reached.'),
  ).toBeInTheDocument();
  expect(screen.getByText('Loading…')).toBeInTheDocument();
  expect(screen.queryByText('Shop B is updated.')).not.toBeInTheDocument();
});

test('a resend that never reached, or whose stream broke, says so on the line', () => {
  const {unmount} = render(withHost(tile(UNREACHED), {presses: [retry('unreached')]}));
  expect(screen.getByRole('button', {name: 'Retry'})).toBeEnabled();
  expect(within(screen.getByRole('group')).getByText(UNREACHED_WORDS)).toBeInTheDocument();
  unmount();
  render(withHost(tile(UNREACHED), {presses: [retry('lost')]}));
  expect(within(screen.getByRole('group')).getByText(LOST_WORDS)).toBeInTheDocument();
});

test('an update landed from another slot turns the line to say so, with Show it here (task-15.11 decision 40)', () => {
  const pressed: AppActRequest[] = [];
  renderTree(
    [{id: 'root', component: 'Slot', source: 'shop-b', state: 'update', update: WAITING}],
    {
      onAppAct: request => pressed.push(request),
      wrap: node => (
        <AppActContext.Provider value={acts(undefined, {'shop-b': '2.0.0'})}>
          {node}
        </AppActContext.Provider>
      ),
    },
  );
  expect(screen.getByText(/is updated\.$/)).toBeInTheDocument();
  expect(screen.queryByText(/waiting on its publisher/)).not.toBeInTheDocument();
  const show = screen.getByRole('button', {name: 'Show it here'});
  show.click();
  expect(pressed).toEqual([
    {
      kind: 'show',
      appId: 'shop-b',
      source: 'shop-b',
      surfaceId: 'test',
      componentId: 'root',
      anchor: show,
    },
  ]);
});

test.each([
  ['app-unreached', 'Shop B couldn’t be reached,', 'so nothing changed.', 'Try again'],
  [
    'store-behind',
    'Shop B can’t be updated yet.',
    'Its publisher has changed the app, and the Store hasn’t caught up. Try again later.',
    'Update',
  ],
  [
    'checks',
    'Shop B can’t be updated.',
    'Its files didn’t pass the checks on this computer, so nothing changed.',
    undefined,
  ],
  ['store-unreached', 'The Store can’t be reached right now,', 'so nothing changed.', 'Try again'],
] as const)(
  'a refused update (%s) says why on the line in the Store’s words, with the Store’s press',
  (cause, lead, rest, press) => {
    const pressed: AppActRequest['kind'][] = [];
    render(
      withHost(tile(NEEDS, {onAppAct: ({kind}: AppActRequest) => pressed.push(kind)}), {
        act: acts(() => ({appId: 'shop-b', status: 'refused', cause})),
      }),
    );
    const line = within(screen.getByRole('group'));
    expect(line.getByText(lead)).toBeInTheDocument();
    expect(line.getByText(rest, {exact: false})).toBeInTheDocument();
    expect(screen.queryByText('Shop B needs an update to show this.')).not.toBeInTheDocument();
    const buttons = screen.queryAllByRole('button');
    expect(buttons.map(button => button.textContent)).toEqual(press ? [press] : []);
    if (press) {
      buttons[0]!.click();
      expect(pressed).toEqual(['update']);
    }
  },
);

test('the line’s presses draw disabled where no press can be made', () => {
  const {unmount} = render(withHost(tile(NEEDS), {enabled: false}));
  expect(screen.getByRole('button', {name: 'Update'})).toBeDisabled();
  unmount();
  const second = render(withHost(tile(UNREACHED), {enabled: false}));
  expect(screen.getByRole('button', {name: 'Retry'})).toBeDisabled();
  second.unmount();
  render(withHost(tile(WAITING), {enabled: false}));
  expect(screen.getByRole('button', {name: 'Check again'})).toBeDisabled();
});
