import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, test} from 'vitest';
import {AttributionView} from './attribution';
import {AttributionApi} from './attribution.schema';

test('at rest shows only the display name, with full detail as the accessible name', () => {
  render(<AttributionView displayName="Gmail" account="work" />);
  const marker = screen.getByLabelText('Gmail · work');
  expect(marker).toHaveTextContent('Gmail');
  expect(marker).not.toHaveTextContent('Painted by');
});

test('keyboard focus expands to the full detail', async () => {
  const user = userEvent.setup();
  render(<AttributionView displayName="Gmail" account="work" />);
  await user.tab();
  expect(screen.getByLabelText('Gmail · work')).toHaveTextContent('Gmail · work');
});

test('single-account apps omit the account clause', () => {
  render(<AttributionView displayName="GitHub" account={null} />);
  expect(screen.getByLabelText('GitHub')).toBeInTheDocument();
});

test('schema accepts the painted shape and rejects extras', () => {
  expect(
    AttributionApi.schema.safeParse({displayName: 'Gmail', appId: 'gmail', account: null}).success,
  ).toBe(true);
  expect(AttributionApi.schema.safeParse({displayName: 'Gmail', style: 'loud'}).success).toBe(
    false,
  );
  expect(AttributionApi.schema.safeParse({appId: 'gmail'}).success).toBe(false);
});

test('schema accepts the wrapper shape: a child id and a weight (task-6.4 decision 3)', () => {
  expect(
    AttributionApi.schema.safeParse({
      displayName: 'Gmail',
      appId: 'gmail',
      child: 'gmail-slot',
      weight: 2,
    }).success,
  ).toBe(true);
  expect(AttributionApi.schema.safeParse({displayName: 'Gmail', child: 3}).success).toBe(false);
});

test('wraps its child under the marker and carries the weight as its own flex share', () => {
  const {container} = render(
    <AttributionView displayName="Gmail" weight={2}>
      <div data-child="gmail-slot">the slot</div>
    </AttributionView>,
  );
  const wrapper = container.querySelector('[data-attribution]') as HTMLElement;
  expect(wrapper.style.flex).toBe('2 1 0%');
  const marker = screen.getByLabelText('Gmail');
  const child = container.querySelector('[data-child="gmail-slot"]')!;
  expect(wrapper.contains(marker)).toBe(true);
  expect(wrapper.contains(child)).toBe(true);
  // The marker comes first: provenance reads before the content it names.
  expect(marker.compareDocumentPosition(child) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('an unweighted wrapper takes one share: unweighted regions split their axis equally (task-6.4 decision 2)', () => {
  const {container} = render(
    <AttributionView displayName="Gmail">
      <div>the slot</div>
    </AttributionView>,
  );
  const wrapper = container.querySelector('[data-attribution]') as HTMLElement;
  expect(wrapper.style.flex).toBe('1 1 0%');
});

test('without a child it is the bare marker, no wrapper box', () => {
  const {container} = render(<AttributionView displayName="Gmail" />);
  expect(container.querySelector('[data-attribution]')).toBeNull();
  expect(screen.getByLabelText('Gmail')).toBeInTheDocument();
});

/* ── The way back inside a fragment (task 9.5) ──────────────────────────────── */

import type {CompositionOperation} from '@a2uiverse/sdk';
import {FragmentHistoryContext, type FragmentHistory} from '../../fragment-history';
import {PressStateContext} from '../../press-state';
import {renderTree, SURFACE_ID} from '../../testing/render';

function withHistory(history: Record<string, FragmentHistory>, node: React.ReactNode) {
  return (
    <FragmentHistoryContext.Provider value={source => history[source]}>
      {node}
    </FragmentHistoryContext.Provider>
  );
}

test('no arrow without somewhere to go: a fragment that painted once has none', () => {
  render(<AttributionView displayName="GitHub" appId="github" onPress={() => {}} />);
  expect(screen.queryByRole('button')).toBeNull();
});

test('a back arrow when there is a step back, named "Back to" the previous paint\'s title; a forward arrow beside it after a back, named the same way (phase-9 decision 13, task-9.5 decision 3)', () => {
  const {rerender} = render(
    <AttributionView
      displayName="GitHub"
      appId="github"
      history={{back: {step: 0, title: 'Open pull requests'}}}
      onPress={() => {}}
    />,
  );
  const back = screen.getByRole('button', {name: 'Back to Open pull requests'});
  expect(back).toHaveAttribute('title', 'Back to Open pull requests');
  expect(screen.queryByRole('button', {name: /^Forward/})).toBeNull();

  rerender(
    <AttributionView
      displayName="GitHub"
      appId="github"
      history={{back: {step: 0, title: 'Open pull requests'}, forward: {step: 2, title: 'PR #42'}}}
      onPress={() => {}}
    />,
  );
  const buttons = screen.getAllByRole('button');
  expect(buttons.map(b => b.getAttribute('aria-label'))).toEqual([
    'Back to Open pull requests',
    'Forward to PR #42',
  ]);
  // The arrows follow the marker on its row: the marker reads first.
  const marker = screen.getByLabelText('GitHub');
  expect(
    marker.compareDocumentPosition(buttons[0]!) & Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
});

test("the arrows sit at the right edge of the marker's row, icons alone, soft accent buttons (task-9.9 decision 15)", () => {
  render(
    <AttributionView
      displayName="GitHub"
      appId="github"
      history={{back: {step: 0, title: 'Open pull requests'}, forward: {step: 2, title: 'PR #42'}}}
      onPress={() => {}}
    />,
  );
  const back = screen.getByRole('button', {name: 'Back to Open pull requests'});
  const forward = screen.getByRole('button', {name: 'Forward to PR #42'});
  for (const arrow of [back, forward]) {
    expect(arrow).toHaveTextContent('');
    expect(arrow).toHaveClass('rt-variant-soft');
    expect(arrow).not.toHaveAttribute('data-accent-color', 'gray');
  }
  // The row spans its region, the marker at its start and the arrows grouped at its end.
  const row = screen.getByLabelText('GitHub').parentElement!;
  expect(row).toHaveStyle({width: '100%'});
  expect(row).toHaveClass('rt-r-jc-space-between');
  expect(back.parentElement).toBe(forward.parentElement);
  expect(back.parentElement).not.toBe(row);
});

test('"Back" and "Forward" alone when the agent named nothing', () => {
  render(
    <AttributionView
      displayName="GitHub"
      appId="github"
      history={{back: {step: 0}, forward: {step: 2}}}
      onPress={() => {}}
    />,
  );
  expect(screen.getByRole('button', {name: 'Back'})).toBeInTheDocument();
  expect(screen.getByRole('button', {name: 'Forward'})).toBeInTheDocument();
});

test("an arrow raises the step operation: the one source and the neighbour's index (task-9.5 decision 4)", async () => {
  const user = userEvent.setup();
  const pressed: CompositionOperation[] = [];
  render(
    <AttributionView
      displayName="GitHub"
      appId="github"
      history={{back: {step: 1, title: 'List'}, forward: {step: 3}}}
      onPress={operation => pressed.push(operation)}
    />,
  );
  await user.click(screen.getByRole('button', {name: 'Back to List'}));
  await user.click(screen.getByRole('button', {name: 'Forward'}));
  expect(pressed).toEqual([
    {kind: 'step', sources: ['github'], step: 1},
    {kind: 'step', sources: ['github'], step: 3},
  ]);
});

test('without a press handler no arrow is drawn, whatever the history says', () => {
  render(
    <AttributionView
      displayName="GitHub"
      appId="github"
      history={{back: {step: 0, title: 'List'}}}
    />,
  );
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.getByLabelText('GitHub')).toBeInTheDocument();
});

test('the arrows follow the press state: disabled where no press can be made (task-9.5 decision 5)', () => {
  render(
    <PressStateContext.Provider value={{enabled: false, presses: []}}>
      <AttributionView
        displayName="GitHub"
        appId="github"
        history={{back: {step: 0, title: 'List'}}}
        onPress={() => {}}
      />
    </PressStateContext.Provider>,
  );
  expect(screen.getByRole('button', {name: 'Back to List'})).toBeDisabled();
});

test('the arrows draw disabled while the source is busy — its repaint in flight — as the host says through the history (task-9.7 decision 6)', () => {
  render(
    <AttributionView
      displayName="GitHub"
      appId="github"
      history={{back: {step: 0, title: 'List'}, forward: {step: 2}, busy: true}}
      onPress={() => {}}
    />,
  );
  expect(screen.getByRole('button', {name: 'Back to List'})).toBeDisabled();
  expect(screen.getByRole('button', {name: 'Forward'})).toBeDisabled();
});

test("through the catalog: the history read from the host's context by the painted appId, the press carrying the surface and component that raised it", async () => {
  const user = userEvent.setup();
  const presses: Parameters<NonNullable<Parameters<typeof renderTree>[1]['onPress']>>[0][] = [];
  renderTree(
    [
      {id: 'root', component: 'Attribution', displayName: 'GitHub', appId: 'github', child: 'c1'},
      {id: 'c1', component: 'Text', text: 'the fragment'},
    ],
    {
      onPress: press => presses.push(press),
      wrap: node => withHistory({github: {back: {step: 0, title: 'Open pull requests'}}}, node),
    },
  );
  await user.click(screen.getByRole('button', {name: 'Back to Open pull requests'}));
  expect(presses).toEqual([
    {
      operation: {kind: 'step', sources: ['github'], step: 0},
      surfaceId: SURFACE_ID,
      componentId: 'root',
    },
  ]);
});

test('through the catalog: a source the host knows nothing about draws no arrow', () => {
  renderTree([{id: 'root', component: 'Attribution', displayName: 'Gmail', appId: 'gmail'}], {
    onPress: () => {},
  });
  expect(screen.queryByRole('button')).toBeNull();
  expect(screen.getByLabelText('Gmail')).toBeInTheDocument();
});

test('an arrow pressed from the keyboard hands focus on when it leaves the row: to the other arrow, else the marker', async () => {
  const user = userEvent.setup();
  const {rerender} = render(
    <AttributionView
      displayName="GitHub"
      appId="github"
      history={{back: {step: 0, title: 'List'}}}
      onPress={() => {}}
    />,
  );
  await user.tab();
  await user.tab();
  expect(screen.getByRole('button', {name: 'Back to List'})).toHaveFocus();
  await user.keyboard('{Enter}');
  // The host restored the list: nothing behind, the detail ahead.
  rerender(
    <AttributionView
      displayName="GitHub"
      appId="github"
      history={{forward: {step: 1, title: 'PR #42'}}}
      onPress={() => {}}
    />,
  );
  expect(screen.getByRole('button', {name: 'Forward to PR #42'})).toHaveFocus();
  await user.keyboard('{Enter}');
  rerender(<AttributionView displayName="GitHub" appId="github" history={{}} onPress={() => {}} />);
  expect(screen.getByLabelText('GitHub')).toHaveFocus();
});
