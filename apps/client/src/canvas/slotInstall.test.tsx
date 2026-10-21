/**
 * The slot's install on the page (task 15.9): an offer painted on a canvas, Install pressed in it,
 * the consent card floating over the slot, the install, and the press that fills the slot sent on
 * the canvas — and the Store page opened from the slot, an install there filling it beneath.
 */
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {cleanup, render, screen, waitFor, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {MessageSendParams, Part, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import {STAMP_KEY} from '@a2uiverse/sdk';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import type {A2AMessageSender} from '../a2a/client';
import {snapshotCatalogs} from '../../tests/snapshot';
import {Providers} from '../providers';
import {CanvasApp} from './CanvasApp';
import {createHostRelay} from './hostRelay';

const HOST_RELAY = createHostRelay();
const CATALOGS = await snapshotCatalogs(HOST_RELAY.host);

const GAP = 'camera prices';
const SHOP_B = {
  appId: 'shop-b',
  name: 'Shop B',
  publisher: 'northlight',
  description: 'Northlight Cameras, a high-volume online retailer.',
};
const ENTRY = {
  appId: 'shop-b',
  publisher: 'northlight',
  cardUrl: 'http://127.0.0.1:12002/.well-known/agent-card.json',
  card: {
    name: 'Shop B',
    description: SHOP_B.description,
    url: 'http://127.0.0.1:12002',
    version: '1.0.0',
    skills: [{name: 'stock', description: '', examples: ['What cameras do you have?']}],
  },
  catalogs: {},
  versions: ['1.0.0'],
  publishedAt: '2026-10-03T10:00:00Z',
  retired: [],
};

/** The layout surface with one slot, the offer of Shop B for the gap. */
function offerPaint(): TaskStatusUpdateEvent {
  const messages = [
    {version: 'v0.9', createSurface: {surfaceId: 'shell:main', catalogId: SHELL_CATALOG_ID}},
    {
      version: 'v0.9',
      updateComponents: {
        surfaceId: 'shell:main',
        components: [
          {id: 'root', component: 'Column', children: ['shop']},
          {id: 'shop', component: 'Slot', gap: GAP, offer: {apps: [SHOP_B]}},
        ],
      },
    },
  ];
  return {
    kind: 'status-update',
    taskId: 't1',
    contextId: 'ctx-1',
    final: true,
    status: {
      state: 'completed',
      message: {
        kind: 'message',
        role: 'agent',
        messageId: 'm1',
        parts: messages.map(data => ({kind: 'data', data}) as Part),
      },
    },
    metadata: {[STAMP_KEY]: {source: 'shell', role: 'shell'}},
  };
}

let installs: string[];
let installed: boolean;

beforeEach(() => {
  installs = [];
  installed = false;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = new URL(String(input)).pathname;
      const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}});
      if (path === '/marketplace/apps/shop-b/entry.json') return json({entry: ENTRY, installed});
      if (path === '/marketplace/search')
        return json({results: [{entry: ENTRY, installed, score: 1}]});
      if (path === '/marketplace/apps/shop-b/preview.json')
        return json({ok: false, reason: 'not-published', findings: []}, 404);
      if (path === '/registry/install' && init?.method === 'POST') {
        installs.push((JSON.parse(String(init.body)) as {appId: string}).appId);
        installed = true;
        return json({ok: true, appId: 'shop-b', replaced: false, followed: []});
      }
      if (path === '/registry/apps.json')
        return json(installed ? [{id: 'shop-b', card: {name: 'Shop B', version: '1.0.0'}}] : []);
      return json({}, 404);
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', window.location.pathname);
});

/** The page over a scripted orchestrator: the question paints the offer; every press is kept. */
function renderPage() {
  const sent: MessageSendParams[] = [];
  const sender: A2AMessageSender = {
    async *sendMessageStream(params) {
      sent.push(params);
      if (sent.length === 1) yield offerPaint();
    },
  };
  render(
    <Providers>
      <CanvasApp client={sender} catalogs={CATALOGS} hostRelay={HOST_RELAY} />
    </Providers>,
  );
  return {sent};
}

async function askForCameras() {
  await userEvent.type(
    screen.getByRole('textbox', {name: /ask the agent/i}),
    'compare camera prices{Enter}',
  );
  await screen.findByText('None of your apps can do this. From the Store:');
}

/** The composition operations sent after the question, as the wire carries them. */
const operations = (sent: MessageSendParams[]) =>
  sent
    .slice(1)
    .flatMap(params =>
      params.message.parts.flatMap(part =>
        part.kind === 'data' && 'operation' in (part.data as object)
          ? [(part.data as {operation: unknown}).operation]
          : [],
      ),
    );

describe('Install in the slot (task 15.9)', () => {
  it('asks on the consent card over the slot, installs, and sends useApp for the gap', async () => {
    const {sent} = renderPage();
    await askForCameras();
    await userEvent.click(screen.getByRole('button', {name: 'Install'}));
    const card = await screen.findByRole('dialog', {name: 'Install Shop B?'});
    expect(card).toHaveTextContent('by northlight');
    expect(installs).toEqual([]);
    await userEvent.click(within(card).getByRole('button', {name: 'Install'}));
    await waitFor(() => expect(installs).toEqual(['shop-b']));
    await waitFor(() =>
      expect(operations(sent)).toEqual([{kind: 'useApp', sources: ['shop-b'], gap: GAP}]),
    );
  });

  it('Cancel leaves the offer as it was, nothing installed', async () => {
    renderPage();
    await askForCameras();
    await userEvent.click(screen.getByRole('button', {name: 'Install'}));
    const card = await screen.findByRole('dialog', {name: 'Install Shop B?'});
    await userEvent.click(within(card).getByRole('button', {name: 'Cancel'}));
    expect(screen.queryByRole('dialog', {name: 'Install Shop B?'})).toBeNull();
    expect(screen.getByRole('button', {name: 'Install'})).toBeEnabled();
    expect(installs).toEqual([]);
  });
});

describe('the Store page opened from the slot (task-15.9 decision 3)', () => {
  it('an install there fills the slot beneath, the page saying so, Back to your canvas closing it', async () => {
    const {sent} = renderPage();
    await askForCameras();
    await userEvent.click(screen.getByRole('button', {name: 'More in the Store'}));
    const page = await screen.findByTestId('trusted-page-overlay');
    expect(page).toHaveAttribute('data-query', GAP);
    expect(window.location.search).not.toContain('shop');
    await userEvent.click(await within(page).findByRole('link', {name: 'Shop B'}));
    await userEvent.click(await screen.findByRole('button', {name: 'Install Shop B'}));
    const card = await screen.findByRole('alertdialog', {name: 'Install Shop B?'});
    await userEvent.click(within(card).getByRole('button', {name: 'Install'}));
    const done = await screen.findByTestId('store-done');
    expect(done).toHaveTextContent('Shop B is installed. It’s answering on your canvas.');
    await waitFor(() =>
      expect(operations(sent)).toEqual([{kind: 'useApp', sources: ['shop-b'], gap: GAP}]),
    );
    await userEvent.click(within(done).getByRole('button', {name: 'Back to your canvas'}));
    expect(screen.queryByTestId('trusted-page-overlay')).toBeNull();
  });
});
