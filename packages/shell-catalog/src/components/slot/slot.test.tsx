import {render, screen} from '@testing-library/react';
import {expect, test} from 'vitest';
import {SlotContentContext} from '../../slot-content';
import {SlotStateContext} from '../../slot-state';
import {renderTree} from '../../testing/render';
import {SlotView} from './slot';
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
  expect(screen.getByText('Gmail couldn’t answer.')).toBeInTheDocument();
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

test('the failed line is composed from the label and the noun: its runs', () => {
  render(
    <SlotView
      source="circleci"
      state="failed"
      label="CircleCI"
      noun="CircleCI runs"
      failure={{cause: 'timeout'}}
    />,
  );
  expect(screen.getByText('CircleCI couldn’t show its runs.')).toBeInTheDocument();
  expect(screen.queryByText(/didn’t load/)).not.toBeInTheDocument();
});

test('a noun that does not start with the name is shown as it is', () => {
  render(
    <SlotView
      source="github"
      state="failed"
      label="GitHub"
      noun="pull requests"
      failure={{cause: 'unreachable'}}
    />,
  );
  expect(screen.getByText('GitHub couldn’t show pull requests.')).toBeInTheDocument();
});

test('with no noun the line says the source couldn’t answer, and a failed slot with no failure prop draws the same', () => {
  const {unmount} = render(
    <SlotView source="github" state="failed" label="GitHub" failure={{cause: 'unreachable'}} />,
  );
  expect(screen.getByText('GitHub couldn’t answer.')).toBeInTheDocument();
  unmount();
  render(<SlotView source="github" state="failed" label="GitHub" />);
  expect(screen.getByText('GitHub couldn’t answer.')).toBeInTheDocument();
});

test('a vendor failure with a message is quoted under a heading naming the vendor', () => {
  render(
    <SlotView
      source="circleci"
      state="failed"
      label="CircleCI"
      failure={{cause: 'vendor', message: 'Project not found: retz8/a2uiverse'}}
    />,
  );
  expect(screen.getByText('CircleCI said')).toBeInTheDocument();
  expect(screen.getByText('Project not found: retz8/a2uiverse')).toBeInTheDocument();
  expect(screen.queryByText('What happened')).not.toBeInTheDocument();
});

test('a vendor failure with no message shows nothing beneath Retry', () => {
  const {container} = render(
    <SlotView source="circleci" state="failed" label="CircleCI" failure={{cause: 'vendor'}} />,
  );
  expect(screen.queryByText('CircleCI said')).not.toBeInTheDocument();
  expect(screen.queryByText('What happened')).not.toBeInTheDocument();
  expect(container.querySelector('[data-slot-failure-words]')).toBeNull();
});

test.each([
  ['unreachable', 'CircleCI couldn’t be reached.'],
  ['timeout', 'No answer within the time allowed.'],
  ['invalid', 'CircleCI answered, but its screen couldn’t be shown.'],
] as const)('the shell’s reason for %s is set under “What happened”', (cause, reason) => {
  render(<SlotView source="circleci" state="failed" label="CircleCI" failure={{cause}} />);
  expect(screen.getByText('What happened')).toBeInTheDocument();
  expect(screen.getByText(reason)).toBeInTheDocument();
});

test('Retry is drawn only under a host that retries, and hands it the source', () => {
  const retried: string[] = [];
  const {unmount} = render(
    <SlotView
      source="circleci"
      state="failed"
      label="CircleCI"
      failure={{cause: 'timeout'}}
      onRetry={() => retried.push('circleci')}
    />,
  );
  screen.getByRole('button', {name: 'Retry'}).click();
  expect(retried).toEqual(['circleci']);
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
  const line = screen.getByText('CircleCI couldn’t answer.');
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

test('through the catalog, Retry hands the host the source, the surface and the slot’s own id', () => {
  const retries: unknown[] = [];
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
    {onRetry: retry => retries.push(retry)},
  );
  (container.querySelector('button') as HTMLButtonElement).click();
  expect(retries).toEqual([{source: 'circleci', surfaceId: 'test', componentId: 'root'}]);
});
