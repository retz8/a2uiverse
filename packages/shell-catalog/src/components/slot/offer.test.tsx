import {render, screen, within} from '@testing-library/react';
import type {ReactNode} from 'react';
import {expect, test} from 'vitest';
import {INSTALL_REFUSALS, type CompositionOperation} from '@a2uiverse/sdk';
import {AppActContext, type AppActRequest, type AppActState} from '../../app-act';
import type {ShellAction} from '../../functions/shell-actions';
import {PressStateContext, type PressRecord} from '../../press-state';
import {SlotContentContext} from '../../slot-content';
import {renderTree} from '../../testing/render';
import {UNREACHED_WORDS} from './press-lines';
import {SlotView} from './slot';
import {SlotApi} from './slot.schema';

/* ── Task 15.8: the offer, the two lines with nothing to offer, the installed line ── */

const SHOP_B = {
  appId: 'shop-b',
  name: 'Shop B',
  publisher: 'northlight',
  description: 'Northlight Cameras, a high-volume online retailer listing current stock.',
};
const SHOP_A = {
  appId: 'shop-a',
  name: 'Shop A',
  publisher: 'a2uiverse-apps',
  description: 'Aperture & Co, a boutique camera dealer.',
};
const GAP = 'camera prices';
const OFFER = {apps: [SHOP_B, SHOP_A]};

/**
 * The host's app acts: the press made in each slot, the apps it holds installed by version, and the
 * apps held by an install or update running anywhere.
 */
function acts(
  act: AppActState['act'] = () => undefined,
  installed: Record<string, string> = {},
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
  }: {
    act?: AppActState;
    presses?: PressRecord[];
    enabled?: boolean;
    content?: ReactNode;
  } = {},
) {
  return (
    <SlotContentContext.Provider value={() => content ?? null}>
      <PressStateContext.Provider value={{enabled, presses}}>
        <AppActContext.Provider value={act ?? acts()}>{node}</AppActContext.Provider>
      </PressStateContext.Provider>
    </SlotContentContext.Provider>
  );
}

const useApp = (appId: string, status: PressRecord['status'] = 'sent'): PressRecord => ({
  operation: {kind: 'useApp', sources: [appId], gap: GAP} as CompositionOperation,
  status,
});

const rowOf = (container: HTMLElement, appId: string) =>
  container.querySelector(`[data-offer-app="${appId}"]`) as HTMLElement;

test('schema: a gap carries its offer or the app installed there, and one carrying neither is refused (task-15.8 decision 7)', () => {
  const ok = (props: Record<string, unknown>) => SlotApi.schema.safeParse(props).success;
  expect(ok({gap: GAP, offer: OFFER})).toBe(true);
  expect(ok({gap: GAP, offer: {apps: [], none: 'nothing'}})).toBe(true);
  expect(ok({gap: GAP, installed: {appId: 'shop-b', name: 'Shop B'}})).toBe(true);
  expect(ok({gap: GAP})).toBe(false);
  expect(ok({gap: GAP, offer: OFFER, installed: {appId: 'shop-b', name: 'Shop B'}})).toBe(false);
  expect(ok({source: 'shop-b', offer: OFFER})).toBe(false);
});

test('schema: a slot an offer became keeps that offer and the app installed there, only while pending (task-15.8 decision 2)', () => {
  const ok = (props: Record<string, unknown>) => SlotApi.schema.safeParse(props).success;
  const offered = {gap: GAP, apps: OFFER.apps, appId: 'shop-b'};
  expect(ok({source: 'shop-b', offered})).toBe(true);
  expect(ok({source: 'shop-b', state: 'pending', offered})).toBe(true);
  expect(ok({source: 'shop-b', state: 'authority', offered})).toBe(false);
  expect(ok({source: 'shop-b', state: 'failed', offered})).toBe(false);
  expect(ok({gap: GAP, offer: OFFER, offered})).toBe(false);
  // The app installed there is one the offer offered.
  expect(ok({source: 'shop-c', offered: {...offered, appId: 'shop-c'}})).toBe(false);
});

test('the offer: the fixed line, then each app the plan offered, in its order — its letter, name, publisher, description and Install', () => {
  const {container} = render(
    withHost(<SlotView gap={GAP} offer={OFFER} onAppAct={() => {}} />, {
      content: <em>content</em>,
    }),
  );
  const slot = container.querySelector(`[data-slot-gap="${GAP}"]`)!;
  expect(slot).toHaveAttribute('data-slot-state', 'offer');
  expect(screen.getByText('None of your apps can do this. From the Store:')).toBeInTheDocument();
  const rows = [...container.querySelectorAll('[data-offer-app]')];
  expect(rows.map(row => row.getAttribute('data-offer-app'))).toEqual(['shop-b', 'shop-a']);
  const b = within(rowOf(container, 'shop-b'));
  expect(b.getByText('S')).toBeInTheDocument();
  expect(b.getByRole('button', {name: 'Shop B'})).toBeInTheDocument();
  expect(b.getByText('by northlight')).toBeInTheDocument();
  expect(b.getByText(SHOP_B.description)).toBeInTheDocument();
  expect(b.getByRole('button', {name: 'Install'})).toBeEnabled();
  expect(screen.getByRole('button', {name: 'More in the Store'})).toBeInTheDocument();
  // The offer resolves no content and draws no box around itself.
  expect(screen.queryByText('content')).not.toBeInTheDocument();
  expect((slot as HTMLElement).style.border).toBe('');
});

test('an offer asking nothing of its apps — an install asked for — opens with "From the Store:" alone (task-15.11 decision 36)', () => {
  render(
    withHost(
      <SlotView gap="Shop B" offer={{apps: [SHOP_B], asksNothing: true}} onAppAct={() => {}} />,
    ),
  );
  expect(screen.getByText('From the Store:')).toBeInTheDocument();
  expect(screen.queryByText(/None of your apps/)).not.toBeInTheDocument();
  expect(screen.getByRole('button', {name: 'Install'})).toBeEnabled();
});

test('the offer is at most as wide as the Store page’s column, at the slot’s leading edge (task-15.11 decision 46)', () => {
  const {container} = render(withHost(<SlotView gap={GAP} offer={OFFER} onAppAct={() => {}} />));
  const offer = rowOf(container, 'shop-b').closest('ul')!.parentElement!;
  expect(offer.style.maxWidth).toBe('880px');
  expect(offer.style.marginLeft).toBe('');
});

test('the description is held to two lines', () => {
  const {container} = render(withHost(<SlotView gap={GAP} offer={OFFER} />));
  const description = within(rowOf(container, 'shop-b')).getByText(SHOP_B.description);
  expect(description.style.webkitLineClamp).toBe('2');
});

test('without a host that takes app presses the offer draws no Install', () => {
  render(withHost(<SlotView gap={GAP} offer={OFFER} />));
  expect(screen.queryByRole('button', {name: 'Install'})).not.toBeInTheDocument();
  expect(screen.getByRole('button', {name: 'Shop B'})).toBeInTheDocument();
});

test('through the catalog, Install hands the host the app, the gap, the slot and the button pressed', () => {
  const pressed: AppActRequest[] = [];
  const {container} = renderTree([{id: 'root', component: 'Slot', gap: GAP, offer: OFFER}], {
    onAppAct: request => pressed.push(request),
  });
  const install = within(rowOf(container, 'shop-a')).getByRole('button', {name: 'Install'});
  install.click();
  expect(pressed).toEqual([
    {
      kind: 'install',
      appId: 'shop-a',
      gap: GAP,
      surfaceId: 'test',
      componentId: 'root',
      anchor: install,
    },
  ]);
});

test('through the catalog, an app’s name opens its view in the Store and More in the Store the gap’s words, each naming the slot (task-15.8 decision 8)', () => {
  const actions: ShellAction[] = [];
  renderTree([{id: 'root', component: 'Slot', gap: GAP, offer: OFFER}], {
    onShellAction: action => actions.push(action),
  });
  screen.getByRole('button', {name: 'Shop B'}).click();
  screen.getByRole('button', {name: 'More in the Store'}).click();
  expect(actions).toEqual([
    {name: 'openStore', surfaceId: 'test', componentId: 'root', app: 'shop-b'},
    {name: 'openStore', surfaceId: 'test', componentId: 'root', query: GAP},
  ]);
});

test('installing: the pressed row reads Installing, every other row’s Install disabled', () => {
  const {container} = render(
    withHost(<SlotView gap={GAP} offer={OFFER} onAppAct={() => {}} />, {
      act: acts(where =>
        'gap' in where && where.gap === GAP ? {appId: 'shop-b', status: 'running'} : undefined,
      ),
    }),
  );
  const b = within(rowOf(container, 'shop-b'));
  expect(b.getByRole('button', {name: 'Installing'})).toBeDisabled();
  expect(b.queryByRole('button', {name: 'Install'})).not.toBeInTheDocument();
  expect(within(rowOf(container, 'shop-a')).getByRole('button', {name: 'Install'})).toBeDisabled();
});

test('installed, its press sent: the row reads Installed with Loading…, the rest of the offer as it is, its presses held', () => {
  const {container} = render(
    withHost(<SlotView gap={GAP} offer={OFFER} onAppAct={() => {}} />, {
      act: acts(undefined, {'shop-b': '1.0.0'}),
      presses: [useApp('shop-b')],
    }),
  );
  const b = within(rowOf(container, 'shop-b'));
  expect(b.getByText('Installed')).toBeInTheDocument();
  expect(b.getByText('Loading…')).toBeInTheDocument();
  expect(b.queryByRole('button')).toHaveTextContent('Shop B');
  expect(within(rowOf(container, 'shop-a')).getByRole('button', {name: 'Install'})).toBeDisabled();
  expect(screen.getByText('From the Store:')).toBeInTheDocument();
});

test('the slot an offer became keeps the offer, Installed with Loading… on its app, until the answer lands (task-15.8 decision 2)', () => {
  const offered = {gap: GAP, apps: OFFER.apps, appId: 'shop-b'};
  const {container, rerender} = render(
    withHost(<SlotView source="shop-b" offered={offered} onAppAct={() => {}} />, {
      act: acts(undefined, {'shop-b': '1.0.0'}),
    }),
  );
  expect(container.querySelector('[data-slot="shop-b"]')).toHaveAttribute(
    'data-slot-state',
    'pending',
  );
  const b = within(rowOf(container, 'shop-b'));
  expect(b.getByText('Installed')).toBeInTheDocument();
  expect(b.getByText('Loading…')).toBeInTheDocument();
  expect(within(rowOf(container, 'shop-a')).getByRole('button', {name: 'Install'})).toBeDisabled();
  rerender(
    withHost(<SlotView source="shop-b" offered={offered} onAppAct={() => {}} />, {
      content: <em>Shop B’s answer</em>,
    }),
  );
  expect(screen.getByText('Shop B’s answer')).toBeInTheDocument();
  expect(container.querySelector('[data-offer-app]')).toBeNull();
});

test('an app held elsewhere — its install or update running from another slot or the page — draws its row’s Install disabled, its words unchanged; the other rows keep theirs (task-15.9 decision 1)', () => {
  const {container} = render(
    withHost(<SlotView gap={GAP} offer={OFFER} onAppAct={() => {}} />, {
      act: acts(undefined, {}, ['shop-b']),
    }),
  );
  expect(within(rowOf(container, 'shop-b')).getByRole('button', {name: 'Install'})).toBeDisabled();
  expect(within(rowOf(container, 'shop-a')).getByRole('button', {name: 'Install'})).toBeEnabled();
});

test('an app installed elsewhere and held there draws Show it here disabled', () => {
  const {container} = render(
    withHost(<SlotView gap={GAP} offer={OFFER} onAppAct={() => {}} />, {
      act: acts(undefined, {'shop-b': '1.0.0'}, ['shop-b']),
    }),
  );
  expect(
    within(rowOf(container, 'shop-b')).getByRole('button', {name: 'Show it here'}),
  ).toBeDisabled();
});

test('a press asking — its entry read again, its consent card open — holds every row, the pressed one’s words unchanged (task-15.9 decision 7)', () => {
  const {container} = render(
    withHost(<SlotView gap={GAP} offer={OFFER} onAppAct={() => {}} />, {
      act: acts(
        where =>
          'gap' in where && where.gap === GAP ? {appId: 'shop-b', status: 'asking'} : undefined,
        {},
        ['shop-b'],
      ),
    }),
  );
  const b = within(rowOf(container, 'shop-b'));
  expect(b.getByRole('button', {name: 'Install'})).toBeDisabled();
  expect(b.queryByText('Installing')).not.toBeInTheDocument();
  expect(within(rowOf(container, 'shop-a')).getByRole('button', {name: 'Install'})).toBeDisabled();
});

test('an app installed elsewhere turns its row to Show it here, a quiet Installed beside it, the line its second half alone (task-15.11 decision 32); the other rows keep Install', () => {
  const pressed: AppActRequest[] = [];
  const {container} = renderTree([{id: 'root', component: 'Slot', gap: GAP, offer: OFFER}], {
    onAppAct: request => pressed.push(request),
    wrap: node => (
      <AppActContext.Provider value={acts(undefined, {'shop-b': '1.0.0'})}>
        {node}
      </AppActContext.Provider>
    ),
  });
  const b = within(rowOf(container, 'shop-b'));
  expect(b.getByText('Installed')).toBeInTheDocument();
  expect(screen.getByText('From the Store:')).toBeInTheDocument();
  expect(screen.queryByText(/None of your apps/)).not.toBeInTheDocument();
  const show = b.getByRole('button', {name: 'Show it here'});
  expect(within(rowOf(container, 'shop-a')).getByRole('button', {name: 'Install'})).toBeEnabled();
  show.click();
  expect(pressed).toEqual([
    {kind: 'show', appId: 'shop-b', gap: GAP, surfaceId: 'test', componentId: 'root', anchor: show},
  ]);
});

test('a fill press that never reached says so on the row, Show it here back', () => {
  const {container} = render(
    withHost(<SlotView gap={GAP} offer={OFFER} onAppAct={() => {}} />, {
      act: acts(undefined, {'shop-b': '1.0.0'}),
      presses: [useApp('shop-b', 'unreached')],
    }),
  );
  const b = within(rowOf(container, 'shop-b'));
  expect(b.getByRole('button', {name: 'Show it here'})).toBeEnabled();
  expect(b.getByText(UNREACHED_WORDS)).toBeInTheDocument();
});

test.each([
  [
    'store-behind',
    'Shop B can’t be installed yet.',
    'Its publisher has changed the app, and the Store hasn’t caught up. Try again later.',
    {name: 'Install', enabled: true},
  ],
  [
    'app-unreached',
    'Shop B couldn’t be reached,',
    'so nothing was installed.',
    {name: 'Try again', enabled: true},
  ],
  [
    'checks',
    'Shop B can’t be installed.',
    'Its files didn’t pass the checks on this computer, so nothing changed.',
    {name: 'Install', enabled: false},
  ],
  [
    'store-unreached',
    'The Store can’t be reached right now,',
    'so nothing was installed.',
    {name: 'Try again', enabled: true},
  ],
  [
    'unheard',
    'That didn’t go through,',
    'so nothing was installed.',
    {name: 'Try again', enabled: true},
  ],
  [
    'not-in-store',
    'Shop B isn’t in the Store anymore,',
    'so nothing was installed.',
    {name: 'Install', enabled: false},
  ],
] as const)(
  'a refused install (%s) says why on its row in the Store’s words, with the Store’s press; every other row’s Install back',
  (cause, lead, rest, press) => {
    const pressed: AppActRequest['kind'][] = [];
    const {container} = render(
      withHost(<SlotView gap={GAP} offer={OFFER} onAppAct={({kind}) => pressed.push(kind)} />, {
        act: acts(() => ({appId: 'shop-b', status: 'refused', cause})),
      }),
    );
    const b = within(rowOf(container, 'shop-b'));
    expect(b.getByText(lead)).toBeInTheDocument();
    expect(b.getByText(rest, {exact: false})).toBeInTheDocument();
    const button = b.getByRole('button', {name: press.name});
    if (press.enabled) {
      expect(button).toBeEnabled();
      button.click();
      expect(pressed).toEqual(['install']);
    } else {
      expect(button).toBeDisabled();
    }
    expect(within(rowOf(container, 'shop-a')).getByRole('button', {name: 'Install'})).toBeEnabled();
  },
);

test('every refusal the Store words has its row’s line', () => {
  expect([...INSTALL_REFUSALS]).toEqual([
    'store-behind',
    'app-unreached',
    'checks',
    'store-unreached',
    'unheard',
    'not-in-store',
  ]);
});

test('the offer’s presses draw disabled where no press can be made', () => {
  const {container} = render(
    withHost(<SlotView gap={GAP} offer={OFFER} onAppAct={() => {}} />, {
      enabled: false,
      act: acts(undefined, {'shop-a': '1.0.0'}),
    }),
  );
  expect(within(rowOf(container, 'shop-b')).getByRole('button', {name: 'Install'})).toBeDisabled();
  expect(
    within(rowOf(container, 'shop-a')).getByRole('button', {name: 'Show it here'}),
  ).toBeDisabled();
});

test.each([
  ['nothing', 'Nothing in the Store can do this yet.'],
  ['unreached', 'Couldn’t reach the Store.'],
] as const)(
  'nothing to offer (%s): one quiet line in the shell’s words, then Search the Store on the gap’s words',
  (none, line) => {
    const actions: ShellAction[] = [];
    const {container} = renderTree(
      [{id: 'root', component: 'Slot', gap: GAP, offer: {apps: [], none}}],
      {onShellAction: action => actions.push(action)},
    );
    expect(container.querySelector(`[data-slot-gap="${GAP}"]`)).toHaveAttribute(
      'data-slot-state',
      'nothing',
    );
    expect(screen.getByText(line)).toBeInTheDocument();
    screen.getByRole('button', {name: 'Search the Store'}).click();
    expect(actions).toEqual([
      {name: 'openStore', surfaceId: 'test', componentId: 'root', query: GAP},
    ]);
  },
);

test('the installed line: the app installed and one of its own example questions, no marker, no press', () => {
  const {container} = render(
    withHost(
      <SlotView
        gap={GAP}
        installed={{appId: 'shop-b', name: 'Shop B', example: 'What cameras do you have?'}}
      />,
    ),
  );
  expect(container.querySelector(`[data-slot-gap="${GAP}"]`)).toHaveAttribute(
    'data-slot-state',
    'installed',
  );
  expect(
    screen.getByText('Shop B is installed. Try asking “What cameras do you have?”'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

test('the installed line with no example invites a question (task-15.8 decision 5)', () => {
  render(withHost(<SlotView gap={GAP} installed={{appId: 'shop-b', name: 'Shop B'}} />));
  expect(screen.getByText('Shop B is installed. Ask it something.')).toBeInTheDocument();
});
