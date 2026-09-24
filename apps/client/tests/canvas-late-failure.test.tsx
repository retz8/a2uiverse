/**
 * Phase 8's beats on the page (task 8.6): each late-arrival and failure case replayed through
 * `?beat=` as the canvas replays it — its presses fired through the handler the buttons call, its
 * failure reports answered from the beat — and what the reader sees where it ends. The synthetic
 * cases end at their own authored states, each also up to its press; the recorded ones at what the
 * orchestrator made of them over the deterministic roster. Nothing reaches a network.
 */
import {afterEach, describe, expect, it} from 'vitest';
import {cleanup, render, screen, waitFor, within} from '@testing-library/react';
import type {MessageSendParams} from '@a2a-js/sdk';
import type {A2AMessageSender} from '../src/a2a/client';
import {getBeatFixture} from '../src/beats/beatFixtures';
import {resolveCatalogs} from '../src/catalogs/resolver';
import {CanvasApp} from '../src/canvas/CanvasApp';
import {createHostRelay} from '../src/canvas/hostRelay';
import {listCatalogs} from '../src/orchestratorApi';
import {Providers} from '../src/providers';

const HOST_RELAY = createHostRelay();
const CATALOGS = resolveCatalogs(await listCatalogs(), HOST_RELAY.host);

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', window.location.pathname);
});

/** Replay `beat` instantly on the page, and wait for the replay to finish. */
async function replay(beat: string) {
  window.history.replaceState(null, '', `?beat=${beat}&instant`);
  const sent: MessageSendParams[] = [];
  const client: A2AMessageSender = {
    sendMessageStream(params) {
      sent.push(params);
      throw new Error('a replay sent to the orchestrator');
    },
  };
  const {container} = render(
    <Providers>
      <CanvasApp client={client} catalogs={CATALOGS} hostRelay={HOST_RELAY} />
    </Providers>,
  );
  await waitFor(() => expect(container.querySelector('main[data-replay="done"]')).not.toBeNull(), {
    timeout: 10_000,
  });
  // Let a press's last repaint and the lines it composes settle.
  await waitFor(() => expect(screen.queryAllByRole('status', {busy: true})).toHaveLength(0));
  return {
    sent,
    slot: (source: string) => container.querySelector<HTMLElement>(`[data-slot="${source}"]`),
  };
}

const stateOf = (slot: Element | null) => slot?.getAttribute('data-slot-state');

/** The merged view landed over every store, and nothing on the page is failed or offered. */
async function landedOverAll(beat: string) {
  const {sent, slot} = await replay(beat);
  expect(sent).toEqual([]);
  for (const source of ['shell', 'shop-a', 'shop-b', 'shop-c']) {
    await waitFor(() => expect(stateOf(slot(source))).toBe('filled'));
  }
  const view = slot('shell')!;
  expect(view.querySelectorAll('[data-column-reserved]')).toHaveLength(0);
  expect(view.querySelectorAll('[data-slot-press-row]')).toHaveLength(0);
  expect(within(view).getByText('Fieldstone')).toBeInTheDocument();
  expect(screen.queryByRole('button', {name: 'Retry'})).toBeNull();
}

describe('Phase 8’s synthetic beats, played to their ends', () => {
  it.each([
    'fast-failure',
    'late-include',
    'home-straggling',
    'held-retry',
    'retry-race',
    'include-after-decline',
    'try-again',
    'home-retry',
  ])('%s lands the merged view over every store', landedOverAll);

  it('half-drawn: Fieldstone’s fragment comes off for its failure tile; its column reads failed', async () => {
    const {sent, slot} = await replay('half-drawn');
    expect(sent).toEqual([]);
    expect(stateOf(slot('shop-c'))).toBe('failed');
    expect(screen.getByText('Couldn’t be reached.')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Retry'})).toBeEnabled();
    expect(screen.queryByText('Lumen X100 kit')).toBeNull();
    expect(slot('shell')!.querySelector('[data-column-reserved="failed"]')).not.toBeNull();
  });

  it('invalid-paint: the client reports the paint and the hub’s answer fails the slot', async () => {
    const {sent, slot} = await replay('invalid-paint');
    expect(sent).toEqual([]);
    await waitFor(() => expect(stateOf(slot('shop-c'))).toBe('failed'));
    expect(screen.getByText('Answered, but its screen couldn’t be shown.')).toBeInTheDocument();
  });

  it('failed-fold-in: the landed view kept, the late line saying so beside Include again', async () => {
    const {sent, slot} = await replay('failed-fold-in');
    expect(sent).toEqual([]);
    const view = slot('shell')!;
    expect(stateOf(view)).toBe('filled');
    expect(within(view).getByText('Couldn’t include Fieldstone.')).toBeInTheDocument();
    expect(within(view).getByRole('button', {name: 'Include again'})).toBeEnabled();
    expect(view.querySelector('[data-column-reserved="late"]')).not.toBeNull();
  });

  it('too-few: the merge collapses to its one line in the client’s words', async () => {
    const {sent, slot} = await replay('too-few');
    expect(sent).toEqual([]);
    const view = slot('shell')!;
    expect(stateOf(view)).toBe('collapsed');
    expect(view.querySelector('[data-slot-collapse="few"]')).toHaveTextContent(
      'Only Aperture & Co answered, so there’s nothing to merge.',
    );
  });
});

describe('Phase 8’s synthetic beats, up to their presses', () => {
  it('fast-failure: the failure tile, Retry, the vendor’s words beneath; its column failed', async () => {
    const {slot} = await replay('fast-failure-offered');
    expect(stateOf(slot('shop-c'))).toBe('failed');
    expect(screen.queryByText(/Fieldstone said/)).toBeNull();
    expect(screen.queryByText(/couldn’t show/)).toBeNull();
    expect(screen.getByRole('button', {name: 'Retry'})).toBeEnabled();
    expect(slot('shell')!.querySelector('[data-column-reserved="failed"]')).not.toBeNull();
  });

  it('late-include: the row above the view’s label with Include; its column not included', async () => {
    const {slot} = await replay('late-include-offered');
    const view = slot('shell')!;
    expect(stateOf(slot('shop-c'))).toBe('filled');
    expect(
      within(view).getByText('Fieldstone answered after this view was made.'),
    ).toBeInTheDocument();
    expect(within(view).getByRole('button', {name: 'Include Fieldstone'})).toBeEnabled();
    expect(view.querySelector('[data-column-reserved="late"]')).not.toBeNull();
  });

  it.each(['held-retry', 'retry-race'])(
    '%s: the tile says no answer came within the time allowed',
    async beat => {
      const {slot} = await replay(`${beat}-offered`);
      expect(stateOf(slot('shop-c'))).toBe('failed');
      expect(screen.getByText('No answer within the time allowed.')).toBeInTheDocument();
      expect(screen.getByRole('button', {name: 'Retry'})).toBeEnabled();
    },
  );

  it('include-after-decline: the decline’s reason, Include under it', async () => {
    const {slot} = await replay('include-after-decline-offered');
    const view = slot('shell')!;
    expect(stateOf(view)).toBe('collapsed');
    expect(view.querySelector('[data-slot-declined]')).toHaveTextContent(
      'Northlight lists these cameras under other names',
    );
    expect(within(view).getByText('Fieldstone has answered since.')).toBeInTheDocument();
    expect(within(view).getByRole('button', {name: 'Include Fieldstone'})).toBeEnabled();
  });

  it('try-again: the merged view couldn’t be made, with Try again', async () => {
    const {slot} = await replay('try-again-offered');
    const view = slot('shell')!;
    expect(view.querySelector('[data-slot-collapse="unmade"]')).toHaveTextContent(
      'The merged view couldn’t be made.',
    );
    expect(within(view).getByRole('button', {name: 'Try again'})).toBeEnabled();
  });

  it('home-retry: the merge collapsed on its home source, the home source’s tile with Retry', async () => {
    const {slot} = await replay('home-retry-offered');
    expect(slot('shell')!.querySelector('[data-slot-collapse="home"]')).toHaveTextContent(
      'The merged view needs Aperture & Co cameras, which didn’t load.',
    );
    // The view's own Retry, beside the tile's: one press, two buttons (task-8.7 decision 23).
    expect(within(slot('shell')!).getByRole('button', {name: 'Retry Aperture & Co'})).toBeEnabled();
    expect(stateOf(slot('shop-a'))).toBe('failed');
    expect(screen.getByText('Aperture & Co could not load your cameras.')).toBeInTheDocument();
    expect(screen.queryByText(/Aperture & Co said/)).toBeNull();
    expect(screen.getByRole('button', {name: 'Retry'})).toBeEnabled();
  });

  it('failed-fold-in: up to Include, the same row as a late arrival', async () => {
    const {slot} = await replay('failed-fold-in-offered');
    expect(within(slot('shell')!).getByRole('button', {name: 'Include Fieldstone'})).toBeEnabled();
  });
});

/** Where each recorded case ends: its source's slot and the merged view's. */
const RECORDED: Array<[beat: number, source: string, slotState: string, mergeState: string]> = [
  [10, 'calendar', 'filled', 'filled'],
  [11, 'gmail', 'filled', 'filled'],
  [12, 'linear', 'filled', 'filled'],
  [13, 'gmail', 'filled', 'filled'],
  [14, 'gmail', 'filled', 'filled'],
  [15, 'github', 'failed', 'filled'],
  [16, 'github', 'failed', 'filled'],
  [17, 'linear', 'filled', 'filled'],
  [18, 'github', 'filled', 'collapsed'],
];

describe('Phase 8’s recorded beats over the deterministic roster', () => {
  it.each(RECORDED.filter(([beat]) => getBeatFixture(beat)))(
    'beat %i: %s ends %s, the merged view %s',
    async (beat, source, slotState, mergeState) => {
      const {sent, slot} = await replay(String(beat));
      expect(sent).toEqual([]);
      await waitFor(() => expect(stateOf(slot(source))).toBe(slotState));
      expect(stateOf(slot('shell'))).toBe(mergeState);
      if (mergeState === 'filled') {
        expect(slot('shell')!.querySelectorAll('[data-slot-press-row]')).toHaveLength(0);
      }
    },
  );
});
