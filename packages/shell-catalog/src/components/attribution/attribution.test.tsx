import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, test} from 'vitest';
import {AttributionView} from './attribution';
import {AttributionApi} from './attribution.schema';

test('an app with more than one account names it at rest, truncated, the whole label on hover and in the accessible name (task-12.3 decision 6)', () => {
  render(<AttributionView displayName="Gmail" account="me@example.com" />);
  const marker = screen.getByLabelText('Gmail · me@example.com');
  expect(marker).toHaveTextContent('Gmail · me@example.com');
  expect(marker).not.toHaveTextContent('Painted by');
  const label = screen.getByTitle('Gmail · me@example.com');
  expect(label).toHaveStyle({textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden'});
});

test('keyboard focus brightens the marker and keeps the same words', async () => {
  const user = userEvent.setup();
  render(<AttributionView displayName="Gmail" account="work" />);
  await user.tab();
  const marker = screen.getByLabelText('Gmail · work');
  expect(marker).toHaveFocus();
  expect(marker).toHaveTextContent('Gmail · work');
});

test('single-account apps omit the account clause', () => {
  render(<AttributionView displayName="GitHub" account={null} />);
  expect(screen.getByLabelText('GitHub')).toBeInTheDocument();
});

test('schema accepts the painted shape and rejects extras', () => {
  expect(
    AttributionApi.schema.safeParse({displayName: 'Gmail', source: 'gmail', account: null}).success,
  ).toBe(true);
  expect(AttributionApi.schema.safeParse({displayName: 'Gmail', style: 'loud'}).success).toBe(
    false,
  );
  expect(AttributionApi.schema.safeParse({source: 'gmail'}).success).toBe(false);
});

test('schema carries a scope request waiting on Allow or Not now: at least one scope (task 12.2)', () => {
  const ok = (escalation: unknown) =>
    AttributionApi.schema.safeParse({displayName: 'GitHub', source: 'github.1', escalation})
      .success;
  expect(ok({scopes: ['Merge pull requests and push to your repositories']})).toBe(true);
  expect(ok({scopes: []})).toBe(false);
  expect(ok({scopes: ['x'], domain: 'github.com'})).toBe(false);
  expect(AttributionApi.schema.safeParse({displayName: 'GitHub', appId: 'github'}).success).toBe(
    false,
  );
});

test('schema accepts the wrapper shape: a child id and a weight (task-6.4 decision 3)', () => {
  expect(
    AttributionApi.schema.safeParse({
      displayName: 'Gmail',
      source: 'gmail',
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
import {renderTree, surfaceFor, SURFACE_ID} from '../../testing/render';
import {A2uiSurface} from '@a2ui/react/v0_9';
import {Provider} from '../../provider';

function withHistory(history: Record<string, FragmentHistory>, node: React.ReactNode) {
  return (
    <FragmentHistoryContext.Provider value={source => history[source]}>
      {node}
    </FragmentHistoryContext.Provider>
  );
}

test('no arrow without somewhere to go: a fragment that painted once has none', () => {
  render(<AttributionView displayName="GitHub" source="github" onPress={() => {}} />);
  expect(screen.queryByRole('button')).toBeNull();
});

test('a back arrow when there is a step back, named "Back to" the previous paint\'s title; a forward arrow beside it after a back, named the same way (phase-9 decision 13, task-9.5 decision 3)', () => {
  const {rerender} = render(
    <AttributionView
      displayName="GitHub"
      source="github"
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
      source="github"
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
      source="github"
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
      source="github"
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
      source="github"
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
      source="github"
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
        source="github"
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
      source="github"
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
      {id: 'root', component: 'Attribution', displayName: 'GitHub', source: 'github', child: 'c1'},
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
  renderTree([{id: 'root', component: 'Attribution', displayName: 'Gmail', source: 'gmail'}], {
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
      source="github"
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
      source="github"
      history={{forward: {step: 1, title: 'PR #42'}}}
      onPress={() => {}}
    />,
  );
  expect(screen.getByRole('button', {name: 'Forward to PR #42'})).toHaveFocus();
  await user.keyboard('{Enter}');
  rerender(
    <AttributionView displayName="GitHub" source="github" history={{}} onPress={() => {}} />,
  );
  expect(screen.getByLabelText('GitHub')).toHaveFocus();
});

/* ── The escalation on the attribution row (task 12.3) ──────────────────────── */

import {act, fireEvent} from '@testing-library/react';
import {SignInContext, type SignInRequest} from '../../sign-in';

const MERGE = 'Merge pull requests and push to your repositories';

function escalated(
  props: {
    onPress?: (operation: CompositionOperation) => void;
    onSignIn?: (kind: 'start' | 'cancel') => void;
    history?: FragmentHistory;
  } = {},
) {
  return (
    <AttributionView
      displayName="GitHub"
      source="github.1"
      escalation={{scopes: [MERGE]}}
      onPress={props.onPress ?? (() => {})}
      onSignIn={props.onSignIn ?? (() => {})}
      history={props.history}
    >
      <p>the fragment</p>
    </AttributionView>
  );
}

test('a scope request is a "Needs access" chip on the row, its card open on arrival with the missing scopes, Allow and Not now', () => {
  render(escalated());
  const chip = screen.getByRole('button', {name: 'Needs access'});
  expect(chip).toHaveAttribute('aria-expanded', 'true');
  const card = screen.getByRole('dialog', {name: 'GitHub needs more access to finish this.'});
  expect(card).toHaveTextContent('It will also be able to');
  expect(card).toHaveTextContent(MERGE);
  expect(card).toHaveTextContent('Allow opens GitHub’s sign-in in a new window');
  expect(screen.getByRole('button', {name: 'Allow'})).toBeInTheDocument();
  expect(screen.getByRole('button', {name: 'Not now'})).toBeInTheDocument();
  // The fragment stays on screen under the card; focus did not move into it.
  expect(screen.getByText('the fragment')).toBeInTheDocument();
  expect(card).not.toContainElement(document.activeElement as HTMLElement);
  expect(screen.getByRole('status')).toHaveTextContent('GitHub needs more access to finish this.');
});

test('the chip folds the card without answering and opens it again; so do Escape and a press outside (task-12.3 decision 5)', () => {
  const pressed: CompositionOperation[] = [];
  render(escalated({onPress: operation => pressed.push(operation)}));
  const chip = screen.getByRole('button', {name: 'Needs access'});
  act(() => chip.click());
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(chip).toHaveAttribute('aria-expanded', 'false');
  act(() => chip.click());
  expect(screen.getByRole('dialog')).toBeInTheDocument();

  fireEvent.keyDown(screen.getByRole('button', {name: 'Allow'}), {key: 'Escape'});
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(chip).toHaveFocus();
  act(() => chip.click());
  fireEvent.pointerDown(screen.getByText('the fragment'));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('button', {name: 'Needs access'})).toBeInTheDocument();
  expect(pressed).toEqual([]);
});

test('Allow starts the sign-in; Not now raises dismiss for the one source', () => {
  const kinds: string[] = [];
  const pressed: CompositionOperation[] = [];
  render(escalated({onSignIn: kind => kinds.push(kind), onPress: op => pressed.push(op)}));
  act(() => screen.getByRole('button', {name: 'Allow'}).click());
  act(() => screen.getByRole('button', {name: 'Not now'}).click());
  expect(kinds).toEqual(['start']);
  expect(pressed).toEqual([{kind: 'dismiss', sources: ['github.1']}]);
});

test('while the sign-in window is open the card keeps its scopes and says to finish there, with Cancel (task-12.3 decision 3)', () => {
  const kinds: string[] = [];
  render(
    <SignInContext.Provider value={source => source === 'github.1'}>
      {escalated({onSignIn: kind => kinds.push(kind)})}
    </SignInContext.Provider>,
  );
  const card = screen.getByRole('dialog');
  expect(card).toHaveTextContent(MERGE);
  expect(card).toHaveTextContent('Waiting for you to finish signing in');
  expect(screen.queryByRole('button', {name: 'Allow'})).toBeNull();
  expect(screen.queryByRole('button', {name: 'Not now'})).toBeNull();
  act(() => screen.getByRole('button', {name: 'Cancel'}).click());
  expect(kinds).toEqual(['cancel']);
});

test('a retry or a dismiss sent for the source hides the chip and the card at once (task-12.3 decision 10)', () => {
  for (const kind of ['retry', 'dismiss'] as const) {
    const {unmount} = render(
      <PressStateContext.Provider
        value={{
          enabled: true,
          presses: [{operation: {kind, sources: ['github.1']}, status: 'sent'}],
        }}
      >
        {escalated()}
      </PressStateContext.Provider>,
    );
    expect(screen.queryByRole('button', {name: 'Needs access'})).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    unmount();
  }
});

test('the arrows stay live while a request waits (task-12.3 decision 9)', () => {
  const pressed: CompositionOperation[] = [];
  render(
    escalated({
      onPress: op => pressed.push(op),
      history: {back: {step: 0, title: 'Review requests'}},
    }),
  );
  const back = screen.getByRole('button', {name: 'Back to Review requests'});
  expect(back).toBeEnabled();
  act(() => back.click());
  expect(pressed).toEqual([{kind: 'step', sources: ['github.1'], step: 0}]);
  expect(screen.getByRole('button', {name: 'Needs access'})).toBeInTheDocument();
});

test('through the catalog: Allow hands the host the source, the surface and the component', () => {
  const requests: SignInRequest[] = [];
  renderTree(
    [
      {
        id: 'root',
        component: 'Attribution',
        displayName: 'GitHub',
        source: 'github.1',
        escalation: {scopes: [MERGE]},
      },
    ],
    {onSignIn: request => requests.push(request), onPress: () => {}},
  );
  act(() => screen.getByRole('button', {name: 'Allow'}).click());
  expect(requests).toEqual([
    {kind: 'start', source: 'github.1', surfaceId: SURFACE_ID, componentId: 'root'},
  ]);
});

test('a repaint that drops the request takes the chip and its card away (_dev/a2ui-findings.md §9)', async () => {
  const {surface, processor} = surfaceFor(
    [
      {
        id: 'root',
        component: 'Attribution',
        displayName: 'Gmail',
        source: 'gmail.1',
        account: 'you@example.com',
        escalation: {scopes: ['Read your email']},
      },
    ],
    {onSignIn: () => {}, onPress: () => {}},
  );
  render(
    <Provider>
      <A2uiSurface surface={surface} />
    </Provider>,
  );
  expect(screen.getByRole('button', {name: 'Needs access'})).toBeInTheDocument();
  act(() =>
    processor.processMessages([
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId: SURFACE_ID,
          components: [
            {id: 'root', component: 'Attribution', displayName: 'Gmail', source: 'gmail.1'},
          ],
        },
      },
    ] as never),
  );
  expect(screen.queryByRole('button', {name: 'Needs access'})).not.toBeInTheDocument();
  expect(screen.queryByText('you@example.com')).not.toBeInTheDocument();
});
