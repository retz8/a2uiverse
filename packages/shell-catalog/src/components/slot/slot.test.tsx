import {act, render, screen} from '@testing-library/react';
import type {ReactNode} from 'react';
import {expect, test} from 'vitest';
import {PressStateContext, type PressRecord} from '../../press-state';
import {SlotContentContext} from '../../slot-content';
import {SlotStateContext} from '../../slot-state';
import {renderTree} from '../../testing/render';
import {collapsedLines, landedLines, LOST_WORDS, UNREACHED_WORDS} from './press-lines';
import {collapseLine, SlotView} from './slot';
import {SlotApi} from './slot.schema';

test('pending renders a placeholder naming the awaited content', () => {
  render(<SlotView source="gmail" label="Gmail" />);
  const slot = screen.getByText(/Gmail…/);
  expect(slot).toBeInTheDocument();
  expect(slot.closest('[data-slot="gmail"]')).toHaveAttribute('data-slot-state', 'pending');
});

test('host-resolved content fills the slot', () => {
  render(
    <SlotContentContext.Provider value={source => (source === 'gmail' ? <em>inbox</em> : null)}>
      <SlotView source="gmail" />
    </SlotContentContext.Provider>,
  );
  expect(screen.getByText('inbox').closest('[data-slot="gmail"]')).toHaveAttribute(
    'data-slot-state',
    'filled',
  );
});

test('failed renders the failure panel even when content exists', () => {
  render(
    <SlotContentContext.Provider value={() => <em>stale</em>}>
      <SlotView source="gmail" state="failed" label="Gmail" />
    </SlotContentContext.Provider>,
  );
  expect(screen.queryByText('stale')).not.toBeInTheDocument();
  expect(screen.getByText('Couldn’t answer.')).toBeInTheDocument();
});

test('collapsed renders nothing when the host has nothing to rest it on', () => {
  const {container} = render(
    <SlotContentContext.Provider value={() => null}>
      <SlotView source="gmail" state="collapsed" />
    </SlotContentContext.Provider>,
  );
  expect(container).toBeEmptyDOMElement();
});

test('collapsed rests on host content when there is some', () => {
  // A source that contributed no surface may still have said something. The slot does not
  // decide what that resting state is — it only decides that there may be one — because the
  // alternative is an attribution marker left naming a region that no longer exists.
  render(
    <SlotContentContext.Provider value={() => <em>nothing to add</em>}>
      <SlotView source="gmail" state="collapsed" />
    </SlotContentContext.Provider>,
  );
  expect(screen.getByText('nothing to add').closest('[data-slot="gmail"]')).toHaveAttribute(
    'data-slot-state',
    'collapsed',
  );
});

test('schema accepts the painted shape and rejects extras', () => {
  expect(
    SlotApi.schema.safeParse({source: 'gmail', state: 'pending', label: 'Gmail'}).success,
  ).toBe(true);
  expect(SlotApi.schema.safeParse({source: 'gmail', surfaceId: 'x'}).success).toBe(false);
  expect(SlotApi.schema.safeParse({state: 'pending'}).success).toBe(false);
  expect(SlotApi.schema.safeParse({name: 'slot-gmail'}).success).toBe(false);
});

test('shell content pending is the merged view reserved: the planned headers over four skeleton rows', () => {
  const {container} = render(
    <SlotView
      source="shell"
      label="Synthesis"
      content="shell"
      columns={['Issue', 'Status', 'Pull request']}
    />,
  );
  const slot = container.querySelector('[data-slot="shell"]')!;
  expect(slot).toHaveAttribute('data-slot-state', 'pending');
  expect(slot).toHaveAttribute('data-slot-content', 'shell');
  expect(slot).toHaveAttribute('aria-busy', 'true');
  expect([...slot.querySelectorAll('thead th')].map(th => th.textContent)).toEqual([
    'Issue',
    'Status',
    'Pull request',
  ]);
  const rows = slot.querySelectorAll('tbody tr[data-skeleton-row]');
  expect(rows).toHaveLength(4);
  expect(rows[0]!.querySelectorAll('td')).toHaveLength(3);
  // No tile, no words of its own: the label names the region for assistive tech only.
  expect(slot.querySelector('table')!.textContent).toBe('IssueStatusPull request');
  expect((slot as HTMLElement).style.border).toBe('');
});

test('shell content pending with no planned columns reserves the rows alone', () => {
  const {container} = render(<SlotView source="shell" label="Synthesis" content="shell" />);
  const slot = container.querySelector('[data-slot="shell"]')!;
  expect(slot.querySelector('thead')).toBeNull();
  const rows = slot.querySelectorAll('tbody tr[data-skeleton-row]');
  expect(rows).toHaveLength(4);
  expect(rows[0]!.querySelectorAll('td')).toHaveLength(1);
  expect(slot.querySelector('table')!.textContent).toBe('');
});

test('schema accepts the merged view’s columns and join', () => {
  expect(
    SlotApi.schema.safeParse({
      source: 'shell',
      content: 'shell',
      columns: ['Issue', 'Status'],
      join: {home: 'linear', nouns: {linear: 'issues', github: 'PRs'}},
    }).success,
  ).toBe(true);
  expect(
    SlotApi.schema.safeParse({source: 'shell', join: {home: 'linear', nouns: {}, extra: 1}})
      .success,
  ).toBe(false);
});

test('shell content failed is a quiet line in the same register', () => {
  render(
    <SlotContentContext.Provider value={() => <em>stale</em>}>
      <SlotView source="shell" state="failed" content="shell" />
    </SlotContentContext.Provider>,
  );
  expect(screen.queryByText('stale')).not.toBeInTheDocument();
  expect(screen.getByText('Couldn’t paint this.')).toBeInTheDocument();
});

test('shell content fills with no reserved floor', () => {
  const {container} = render(
    <SlotContentContext.Provider value={() => <em>the view</em>}>
      <SlotView source="shell" content="shell" />
    </SlotContentContext.Provider>,
  );
  const slot = container.querySelector('[data-slot="shell"]') as HTMLElement;
  expect(slot).toHaveAttribute('data-slot-state', 'filled');
  expect(slot).toHaveAttribute('data-slot-content', 'shell');
  expect(['', '0px']).toContain(slot.style.minHeight);
});

test('schema accepts content and refuses other values', () => {
  expect(SlotApi.schema.safeParse({source: 'shell', content: 'shell'}).success).toBe(true);
  expect(SlotApi.schema.safeParse({source: 'shell', content: 'vendor'}).success).toBe(false);
});

test('schema holds exactly one of source or gap, and a numeric weight', () => {
  expect(SlotApi.schema.safeParse({gap: 'flight booking'}).success).toBe(true);
  expect(SlotApi.schema.safeParse({source: 'gmail', gap: 'flight booking'}).success).toBe(false);
  expect(SlotApi.schema.safeParse({}).success).toBe(false);
  expect(SlotApi.schema.safeParse({source: 'gmail', weight: 2}).success).toBe(true);
  expect(SlotApi.schema.safeParse({source: 'gmail', weight: 'wide'}).success).toBe(false);
  expect(SlotApi.schema.safeParse({gap: 'x', state: 'gap'}).success).toBe(false);
});

test('weight is the region’s flex share, as the basic layout components apply it', () => {
  const {container} = render(<SlotView source="gmail" label="Gmail" weight={2} />);
  expect((container.querySelector('[data-slot="gmail"]') as HTMLElement).style.flexGrow).toBe('2');
});

test('a gap slot is the capability tile, resolving no content', () => {
  const {container} = render(
    <SlotContentContext.Provider value={() => <em>content</em>}>
      <SlotView gap="flight booking" />
    </SlotContentContext.Provider>,
  );
  const tile = container.querySelector('[data-slot-gap="flight booking"]')!;
  expect(tile).toHaveAttribute('data-slot-state', 'gap');
  expect(screen.queryByText('content')).not.toBeInTheDocument();
});

/* ── Task 8.2: the failure tile (board F6), the noun, Retry ─────────────────── */

test('schema accepts a failure with one of four causes, a message only with vendor, and a noun', () => {
  const failed = (failure: unknown) =>
    SlotApi.schema.safeParse({source: 'circleci', state: 'failed', failure}).success;
  expect(failed({cause: 'vendor', message: 'rate limited'})).toBe(true);
  expect(failed({cause: 'vendor'})).toBe(true);
  expect(failed({cause: 'unreachable'})).toBe(true);
  expect(failed({cause: 'timeout'})).toBe(true);
  expect(failed({cause: 'invalid'})).toBe(true);
  expect(failed({cause: 'crashed'})).toBe(false);
  expect(failed({cause: 'timeout', message: 'said'})).toBe(false);
  expect(failed({cause: 'vendor', extra: 1})).toBe(false);
  expect(
    SlotApi.schema.safeParse({source: 'circleci', label: 'CircleCI', noun: 'CircleCI runs'})
      .success,
  ).toBe(true);
});

test('the tile’s one statement is the vendor’s own words when it spoke, naming nobody (task-8.7 decision 17)', () => {
  const {container} = render(
    <SlotView
      source="circleci"
      state="failed"
      label="CircleCI"
      noun="CircleCI runs"
      failure={{cause: 'vendor', message: 'Project not found: retz8/a2uiverse'}}
    />,
  );
  const line = screen.getByText('Project not found: retz8/a2uiverse');
  expect(line.closest('[data-slot-failure-line]')).not.toBeNull();
  expect(screen.queryByText(/CircleCI said/)).not.toBeInTheDocument();
  expect(screen.queryByText(/couldn’t show/)).not.toBeInTheDocument();
  expect(container.querySelector('[data-slot-failure-words]')).toBeNull();
});

test.each([
  ['unreachable', 'Couldn’t be reached.'],
  ['timeout', 'No answer within the time allowed.'],
  ['invalid', 'Answered, but its screen couldn’t be shown.'],
] as const)(
  'with no vendor words the statement is the shell’s reason for %s, with no name in it',
  (cause, reason) => {
    render(<SlotView source="circleci" state="failed" label="CircleCI" failure={{cause}} />);
    expect(screen.getByText(reason)).toBeInTheDocument();
    expect(screen.queryByText('What happened')).not.toBeInTheDocument();
    expect(screen.queryByText(/CircleCI/)).not.toBeInTheDocument();
  },
);

test('a vendor failure with no message, and a failed slot with no failure prop, say the source couldn’t answer', () => {
  const {unmount} = render(
    <SlotView source="circleci" state="failed" label="CircleCI" failure={{cause: 'vendor'}} />,
  );
  expect(screen.getByText('Couldn’t answer.')).toBeInTheDocument();
  unmount();
  render(<SlotView source="github" state="failed" label="GitHub" />);
  expect(screen.getByText('Couldn’t answer.')).toBeInTheDocument();
});

test('Retry is drawn only under a host that takes presses, and hands it the retry of the source', () => {
  const pressed: unknown[] = [];
  const {unmount} = render(
    <SlotView
      source="circleci"
      state="failed"
      label="CircleCI"
      failure={{cause: 'timeout'}}
      onPress={operation => pressed.push(operation)}
    />,
  );
  screen.getByRole('button', {name: 'Retry'}).click();
  expect(pressed).toEqual([{kind: 'retry', sources: ['circleci']}]);
  unmount();
  render(
    <SlotView source="circleci" state="failed" label="CircleCI" failure={{cause: 'timeout'}} />,
  );
  expect(screen.queryByRole('button', {name: 'Retry'})).not.toBeInTheDocument();
});

test('the tile keeps no box and the reserved floor, the line at body size', () => {
  const {container} = render(
    <SlotView source="circleci" state="failed" label="CircleCI" failure={{cause: 'timeout'}} />,
  );
  const slot = container.querySelector('[data-slot="circleci"]') as HTMLElement;
  expect(slot).toHaveAttribute('data-slot-state', 'failed');
  expect(slot.style.border).toBe('');
  expect(slot.style.minHeight).toBe('4rem');
  const line = screen.getByText('No answer within the time allowed.');
  expect(line.closest('[data-slot-failure-line]')).not.toBeNull();
});

/* ── Task 8.2: the shell slot's columnSources and the declined line ─────────── */

test('schema takes columnSources the length of columns, and a declined reason', () => {
  const shell = (extra: Record<string, unknown>) =>
    SlotApi.schema.safeParse({source: 'shell', content: 'shell', ...extra}).success;
  expect(shell({columns: ['Issue', 'CI build'], columnSources: ['linear', 'circleci']})).toBe(true);
  expect(shell({columns: ['Issue', 'Status'], columnSources: ['linear', null]})).toBe(true);
  expect(shell({columns: ['Issue', 'Status'], columnSources: ['linear']})).toBe(false);
  expect(shell({columnSources: ['linear']})).toBe(false);
  expect(
    shell({state: 'collapsed', declined: {reason: 'No GitHub PR names a Linear issue.'}}),
  ).toBe(true);
  expect(shell({declined: {reason: 1}})).toBe(false);
});

test('a declined merge collapses to one line in the Synthesizer’s words at the label row', () => {
  const {container} = render(
    <SlotContentContext.Provider value={() => <em>the resting prose</em>}>
      <SlotView
        source="shell"
        content="shell"
        state="collapsed"
        declined={{reason: 'No GitHub PR names a Linear issue.'}}
      />
    </SlotContentContext.Provider>,
  );
  const slot = container.querySelector('[data-slot="shell"]') as HTMLElement;
  expect(slot).toHaveAttribute('data-slot-state', 'collapsed');
  expect(slot).toHaveAttribute('data-slot-content', 'shell');
  expect(screen.getByText('No GitHub PR names a Linear issue.')).toBeInTheDocument();
  expect(screen.queryByText('the resting prose')).not.toBeInTheDocument();
  expect(slot.querySelector('table')).toBeNull();
  const line = slot.querySelector('[data-slot-declined]') as HTMLElement;
  expect(line.style.height).toBe('24px');
  expect(['', '0px']).toContain(slot.style.minHeight);
});

test('the reserved view marks a column whose source is still pending or has failed', () => {
  const {container} = render(
    <SlotStateContext.Provider
      value={source => ({linear: 'filled', github: 'pending', circleci: 'failed'})[source]}
    >
      <SlotView
        source="shell"
        content="shell"
        label="Synthesis"
        columns={['Issue', 'Pull request', 'CI build']}
        columnSources={['linear', 'github', 'circleci']}
      />
    </SlotStateContext.Provider>,
  );
  expect(
    [...container.querySelectorAll('thead th')].map(th => th.textContent?.replace(/\s+/g, ' ')),
  ).toEqual(['Issue', 'Pull request · loading', 'CI build · unavailable']);
});

test('through the catalog, Retry hands the host the operation, the surface and the slot’s own id', () => {
  const presses: unknown[] = [];
  const {container} = renderTree(
    [
      {
        id: 'root',
        component: 'Slot',
        source: 'circleci',
        state: 'failed',
        label: 'CircleCI',
        noun: 'CircleCI runs',
        failure: {cause: 'timeout'},
      },
    ],
    {onPress: press => presses.push(press)},
  );
  (container.querySelector('button') as HTMLButtonElement).click();
  expect(presses).toEqual([
    {operation: {kind: 'retry', sources: ['circleci']}, surfaceId: 'test', componentId: 'root'},
  ]);
});

/* ── Task 8.3: every collapse of the merge leaves one line ─────────────────── */

test('schema takes a collapse cause with its names only where the cause has them', () => {
  const shell = (collapse: unknown) =>
    SlotApi.schema.safeParse({source: 'shell', content: 'shell', state: 'collapsed', collapse})
      .success;
  expect(shell({cause: 'home', home: 'Linear issues'})).toBe(true);
  expect(shell({cause: 'few', answered: ['GitHub']})).toBe(true);
  expect(shell({cause: 'few', answered: []})).toBe(true);
  expect(shell({cause: 'unmade'})).toBe(true);
  expect(shell({cause: 'home'})).toBe(false);
  expect(shell({cause: 'few'})).toBe(false);
  expect(shell({cause: 'unmade', home: 'Linear issues'})).toBe(false);
  expect(shell({cause: 'declined'})).toBe(false);
});

test('the collapse line says why in the shell’s words, per cause', () => {
  expect(collapseLine({cause: 'home', home: 'Linear issues'})).toBe(
    'Can’t join without Linear issues.',
  );
  expect(collapseLine({cause: 'few', answered: ['GitHub']})).toBe(
    'Only GitHub answered, so there’s nothing to merge.',
  );
  expect(collapseLine({cause: 'few', answered: []})).toBe(
    'No app answered, so there’s nothing to merge.',
  );
  expect(collapseLine({cause: 'unmade'})).toBe('The merged view couldn’t be made.');
});

test('a merge collapsed for another cause is one line at the label row, like a decline', () => {
  const {container} = render(
    <SlotContentContext.Provider value={() => <em>stale merged view</em>}>
      <SlotView
        source="shell"
        content="shell"
        state="collapsed"
        collapse={{cause: 'home', home: 'Linear issues'}}
      />
    </SlotContentContext.Provider>,
  );
  const slot = container.querySelector('[data-slot="shell"]') as HTMLElement;
  expect(slot).toHaveAttribute('data-slot-state', 'collapsed');
  expect(screen.getByText('Can’t join without Linear issues.')).toBeInTheDocument();
  expect(screen.queryByText('stale merged view')).not.toBeInTheDocument();
  const line = slot.querySelector('[data-slot-collapse="home"]') as HTMLElement;
  expect(line.style.height).toBe('24px');
  expect(['', '0px']).toContain(slot.style.minHeight);
});

test('a vendor slot ignores a collapse cause: it rests on its content as before', () => {
  render(
    <SlotContentContext.Provider value={() => <em>the resting prose</em>}>
      <SlotView source="github" label="GitHub" state="collapsed" collapse={{cause: 'unmade'}} />
    </SlotContentContext.Provider>,
  );
  expect(screen.getByText('the resting prose')).toBeInTheDocument();
  expect(screen.queryByText('The merged view couldn’t be made.')).not.toBeInTheDocument();
});

/* ── Task 8.4: the facts the presses' lines are drawn from ────────────────── */

test('schema takes the merge’s source set, the late sources, a call in progress or failed, and the retried sources', () => {
  const shell = (extra: Record<string, unknown>) =>
    SlotApi.schema.safeParse({source: 'shell', content: 'shell', ...extra}).success;
  expect(shell({merged: ['github', 'gmail'], late: ['calendar']})).toBe(true);
  expect(shell({working: {sources: ['calendar']}})).toBe(true);
  expect(shell({working: {sources: []}})).toBe(true);
  expect(shell({callFailed: {kind: 'include', sources: ['calendar']}})).toBe(true);
  expect(shell({callFailed: {kind: 'update', sources: []}})).toBe(true);
  expect(shell({state: 'collapsed', collapse: {cause: 'unmade'}, retrying: ['gmail']})).toBe(true);
  expect(shell({working: {}})).toBe(false);
  expect(shell({working: {sources: ['x'], kind: 'include'}})).toBe(false);
  expect(shell({callFailed: {kind: 'declined', sources: []}})).toBe(false);
  expect(shell({callFailed: {kind: 'include'}})).toBe(false);
  expect(shell({late: 'calendar'})).toBe(false);
});

/* ── Task 8.5: the presses' lines, drawn from the painted facts and the host's presses ─────── */

const NAMES: Record<string, string> = {circleci: 'CircleCI', gmail: 'Gmail', linear: 'Linear'};
const nameOf = (appId: string) => NAMES[appId] ?? appId;
const texts = (lines: {text: string}[]) => lines.map(line => line.text);

test('over a landed view, the working sentence alone while a press’s call runs', () => {
  expect(
    texts(landedLines({working: {sources: ['circleci']}, late: ['gmail']}, [], nameOf)),
  ).toEqual(['Including CircleCI…']);
  expect(texts(landedLines({working: {sources: []}}, [], nameOf))).toEqual([
    'Updating the merged view…',
  ]);
  expect(landedLines({working: {sources: []}}, [], nameOf)[0]).toMatchObject({working: true});
});

test('over a landed view, the late sources’ line with one Include covering them all', () => {
  const [line] = landedLines({late: ['circleci', 'gmail']}, [], nameOf);
  expect(line).toMatchObject({
    text: 'CircleCI and Gmail arrived after this merge.',
    press: {label: 'Include', operation: {kind: 'include', sources: ['circleci', 'gmail']}},
  });
});

test('a failed Include says so, with Include again — or Include when a newer source waits too', () => {
  const failed = {kind: 'include' as const, sources: ['circleci']};
  expect(landedLines({late: ['circleci'], callFailed: failed}, [], nameOf)[0]).toMatchObject({
    text: 'Couldn’t include CircleCI.',
    press: {label: 'Include again'},
  });
  expect(
    landedLines({late: ['circleci', 'gmail'], callFailed: failed}, [], nameOf)[0],
  ).toMatchObject({
    text: 'Couldn’t include CircleCI. Gmail arrived after this merge.',
    press: {label: 'Include', operation: {kind: 'include', sources: ['circleci', 'gmail']}},
  });
});

test('couldn’t be updated carries Try again, and stands beside a late line as a second row', () => {
  const lines = landedLines(
    {callFailed: {kind: 'update', sources: []}, late: ['gmail']},
    [],
    nameOf,
  );
  expect(texts(lines)).toEqual([
    'The merged view couldn’t be updated.',
    'Gmail arrived after this merge.',
  ]);
  expect(lines[0]).toMatchObject({
    press: {label: 'Try again', operation: {kind: 'tryAgain', sources: []}},
    announce: true,
  });
});

test('a press is drawn the moment it is made; one that never reached says so beside its button', () => {
  const sent: PressRecord = {operation: {kind: 'include', sources: ['gmail']}, status: 'sent'};
  expect(texts(landedLines({late: ['gmail']}, [sent], nameOf))).toEqual(['Including Gmail…']);
  const unreached: PressRecord = {...sent, status: 'unreached'};
  expect(landedLines({late: ['gmail']}, [unreached], nameOf)[0]).toMatchObject({
    text: `Gmail arrived after this merge. ${UNREACHED_WORDS}`,
    announce: true,
  });
  const lost: PressRecord = {...sent, status: 'lost'};
  expect(texts(landedLines({working: {sources: ['gmail']}}, [lost], nameOf))).toEqual([LOST_WORDS]);
});

test('on a collapsed merge: making, waiting, couldn’t be made with Try again, else the line', () => {
  expect(texts(collapsedLines({working: {sources: []}}, [], nameOf, 'x'))).toEqual([
    'Making the merged view…',
  ]);
  expect(texts(collapsedLines({retrying: ['circleci', 'gmail']}, [], nameOf, 'x'))).toEqual([
    'Waiting for CircleCI and Gmail, then merging…',
  ]);
  expect(
    collapsedLines({collapse: {cause: 'unmade'}, late: ['gmail']}, [], nameOf, 'unused'),
  ).toEqual([
    {
      text: 'The merged view couldn’t be made.',
      press: {label: 'Try again', operation: {kind: 'tryAgain', sources: []}},
    },
  ]);
  expect(
    texts(
      collapsedLines(
        {collapse: {cause: 'home', home: 'Linear issues'}},
        [],
        nameOf,
        'Can’t join without Linear issues.',
      ),
    ),
  ).toEqual(['Can’t join without Linear issues.']);
});

test('under a decline’s line only, the late sources with Include', () => {
  const lines = collapsedLines(
    {declined: {reason: 'Nothing lines up.'}, late: ['gmail']},
    [],
    nameOf,
    'Nothing lines up.',
  );
  expect(texts(lines)).toEqual(['Nothing lines up.', 'Gmail has answered since.']);
  expect(lines[1]).toMatchObject({press: {label: 'Include', operation: {kind: 'include'}}});
  expect(
    texts(collapsedLines({declined: {reason: 'r'}, late: ['gmail', 'circleci']}, [], nameOf, 'r')),
  ).toEqual(['r', 'Gmail and CircleCI have answered since.']);
});

const pressState =
  (presses: PressRecord[], enabled = true) =>
  (node: ReactNode) => (
    <PressStateContext.Provider value={{enabled, presses}}>{node}</PressStateContext.Provider>
  );

test('the row sits above the landed view, its Include pressing every late source', () => {
  const pressed: unknown[] = [];
  const {container} = render(
    <SlotContentContext.Provider value={() => <em>the merged view</em>}>
      <SlotView
        source="shell"
        content="shell"
        late={['circleci']}
        nameOf={nameOf}
        onPress={operation => pressed.push(operation)}
      />
    </SlotContentContext.Provider>,
  );
  const slot = container.querySelector('[data-slot="shell"]') as HTMLElement;
  const row = slot.querySelector('[data-slot-press-row]') as HTMLElement;
  expect(row.style.height).toBe('24px');
  expect(row.textContent).toContain('CircleCI arrived after this merge.');
  expect(
    row.compareDocumentPosition(screen.getByText('the merged view')) &
      Node.DOCUMENT_POSITION_FOLLOWING,
  ).toBeTruthy();
  screen.getByRole('button', {name: 'Include'}).click();
  expect(pressed).toEqual([{kind: 'include', sources: ['circleci']}]);
});

test('no row over a landed view with nothing to say', () => {
  const {container} = render(
    <SlotContentContext.Provider value={() => <em>the merged view</em>}>
      <SlotView source="shell" content="shell" merged={['github']} onPress={() => {}} />
    </SlotContentContext.Provider>,
  );
  expect(container.querySelector('[data-slot-press-row]')).toBeNull();
});

test('press buttons draw disabled where no press can be made', () => {
  render(
    pressState(
      [],
      false,
    )(
      <SlotView
        source="circleci"
        state="failed"
        label="CircleCI"
        failure={{cause: 'timeout'}}
        onPress={() => {}}
      />,
    ),
  );
  expect(screen.getByRole('button', {name: 'Retry'})).toBeDisabled();
});

test('Retry gives the tile way to the pending line at the press; one that never reached says so', () => {
  const retry = {kind: 'retry' as const, sources: ['circleci']};
  const tile = (presses: PressRecord[], state: 'failed' | 'pending' = 'failed') =>
    render(
      pressState(presses)(
        <SlotView
          source="circleci"
          state={state}
          label="CircleCI"
          failure={state === 'failed' ? {cause: 'timeout'} : undefined}
          onPress={() => {}}
        />,
      ),
    );
  const sent = tile([{operation: retry, status: 'sent'}]);
  expect(screen.getByText('CircleCI…')).toBeInTheDocument();
  expect(screen.queryByRole('button', {name: 'Retry'})).not.toBeInTheDocument();
  sent.unmount();
  const unreached = tile([{operation: retry, status: 'unreached'}]);
  expect(screen.getByRole('button', {name: 'Retry'})).toBeEnabled();
  expect(screen.getAllByText(UNREACHED_WORDS)[0]!.closest('[data-slot-press-note]')).not.toBeNull();
  unreached.unmount();
  tile([{operation: retry, status: 'lost'}], 'pending');
  expect(screen.getAllByText(LOST_WORDS).length).toBeGreaterThan(0);
});

test('the three outcomes the progress line does not say are announced from the slot', () => {
  const {container} = render(
    <SlotContentContext.Provider value={() => <em>view</em>}>
      <SlotView source="shell" content="shell" callFailed={{kind: 'update', sources: []}} />
    </SlotContentContext.Provider>,
  );
  expect(container.querySelector('[role="status"]')).toHaveTextContent(
    'The merged view couldn’t be updated.',
  );
  const late = render(
    <SlotContentContext.Provider value={() => <em>view</em>}>
      <SlotView source="shell" content="shell" late={['gmail']} />
    </SlotContentContext.Provider>,
  );
  expect(late.container.querySelector('[role="status"]')).toHaveTextContent('');
});

test('focus moves from a pressed button to the line that replaced it', () => {
  let presses: PressRecord[] = [];
  const view = () =>
    pressState(presses)(
      <SlotContentContext.Provider value={() => <em>view</em>}>
        <SlotView
          source="shell"
          content="shell"
          late={['gmail']}
          nameOf={nameOf}
          onPress={operation => {
            presses = [{operation, status: 'sent'}];
            rerender(view());
          }}
        />
      </SlotContentContext.Provider>,
    );
  const {rerender} = render(view());
  const include = screen.getByRole('button', {name: 'Include'});
  include.focus();
  include.click();
  expect(document.activeElement).toBe(screen.getByText('Including Gmail…'));
});

test('a collapsed merge’s lines keep the collapse’s markers on the first row', () => {
  const {container} = render(
    <SlotView
      source="shell"
      content="shell"
      state="collapsed"
      declined={{reason: 'Nothing lines up.'}}
      late={['gmail']}
      nameOf={nameOf}
      onPress={() => {}}
    />,
  );
  const rows = container.querySelectorAll('[data-slot-press-row]');
  expect(rows).toHaveLength(2);
  expect(rows[0]).toHaveAttribute('data-slot-declined');
  expect(rows[1]).toHaveTextContent('Gmail has answered since.');
  expect(screen.getByRole('button', {name: 'Include'})).toBeInTheDocument();
});

test('a fact the runtime stops painting leaves the slot with its repaint (upstream binder keeps removed props)', () => {
  const merged = {
    id: 'root',
    component: 'Slot',
    source: 'shell',
    content: 'shell',
    state: 'collapsed',
  };
  const {surface, container} = renderTree([
    {...merged, collapse: {cause: 'unmade'}, working: {sources: []}},
  ]);
  expect(container.textContent).toContain('Making the merged view…');
  act(() => {
    surface.componentsModel.get('root')!.properties = {...merged, collapse: {cause: 'unmade'}};
  });
  expect(container.textContent).not.toContain('Making the merged view…');
  expect(container.textContent).toContain('The merged view couldn’t be made.');
});
