/**
 * A canvas meeting a catalog it does not hold yet (task-11.5 decisions 1 to 4): the fragment waits
 * for the load and then claims its slot; a catalog that fails to load is reported to the hub as
 * the A2UIVerse extension's catalog load failure, and the fragment never claims its slot. The
 * canvas advertises the client's own two catalogs, whatever it holds (decision 8).
 */
import {describe, expect, it, vi} from 'vitest';
import type {MessageSendParams, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import {Catalog, type A2uiMessage} from '@a2ui/web_core/v0_9';
import {basicCatalog, type ReactComponentImplementation} from '@a2ui/react/v0_9';
import {BASIC_CATALOG_ID, CATALOG_LOAD_FAILED} from '@a2uiverse/sdk';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import type {A2AMessageSender} from '../a2a/client';
import {COMPOSED_BEAT} from '../beats/syntheticBeats';
import {clientCatalogs} from '../catalogs/clientCatalogs';
import {createCanvasWiring} from './createCanvasWiring';

const LATE = 'urn:catalog:late';
const LAYOUT = COMPOSED_BEAT.turns[0]!.batches[0]!.messages;

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;

const event = (
  messages: A2uiMessage[],
  stamp: Record<string, unknown>,
  final = false,
): TaskStatusUpdateEvent => ({
  kind: 'status-update',
  taskId: 't1',
  contextId: 'ctx-1',
  final,
  status: {
    state: final ? 'completed' : 'working',
    message: {
      kind: 'message',
      role: 'agent',
      messageId: crypto.randomUUID(),
      parts: messages.map(data => ({
        kind: 'data' as const,
        data: data as unknown as Record<string, unknown>,
      })),
    },
  },
  metadata: {a2uiverse: stamp},
});

const GMAIL_FRAGMENT = [
  msg({createSurface: {surfaceId: 'gmail:inbox', catalogId: LATE}}),
  msg({
    updateComponents: {
      surfaceId: 'gmail:inbox',
      components: [{id: 'root', component: 'Text', text: 'Three unread'}],
    },
  }),
];

/** A canvas over the client's own catalogs and a loader the test answers by hand. */
function canvasWith(
  load: (catalogId: string, catalogs: Catalog<ReactComponentImplementation>[]) => Promise<void>,
) {
  const catalogs = clientCatalogs().map(c => c.catalog);
  const sent: MessageSendParams[] = [];
  const client: A2AMessageSender = {
    sendMessageStream(params) {
      sent.push(params);
      if (sent.length > 1) return (async function* () {})();
      return (async function* () {
        yield event(LAYOUT, {source: 'shell', role: 'shell'});
        yield event(GMAIL_FRAGMENT, {source: 'gmail', role: 'fragment'});
        yield event([], {source: 'gmail', role: 'fragment', settled: true});
        yield event([], {source: 'shell', role: 'shell'}, true);
      })();
    },
  };
  const loads = vi.fn((catalogId: string) => load(catalogId, catalogs));
  const wiring = createCanvasWiring({
    client,
    catalogs,
    loader: {has: catalogId => catalogs.some(c => c.id === catalogId), load: loads},
  });
  return {wiring, sent, loads};
}

const settle = () => new Promise(resolve => setTimeout(resolve, 0));

describe('a fragment in a catalog the canvas does not hold yet', () => {
  it('waits for the catalog, then claims its slot', async () => {
    let release!: () => void;
    const {wiring, loads} = canvasWith(
      (catalogId, catalogs) =>
        new Promise<void>(resolve => {
          release = () => {
            catalogs.push(
              new Catalog(
                catalogId,
                [...basicCatalog.components.values()],
                [...basicCatalog.functions.values()],
              ),
            );
            resolve();
          };
        }),
    );
    const asked = wiring.sendUtterance('what needs my attention');
    await vi.waitFor(() => expect(loads).toHaveBeenCalledWith(LATE));
    const runtime = wiring.viewed()!;
    expect(runtime.store.getState().placement.has('gmail')).toBe(false);
    release();
    await asked;
    await vi.waitFor(() =>
      expect(runtime.store.getState().placement.get('gmail')?.surfaceId).toBe('gmail:inbox'),
    );
    expect(runtime.processor.model.getSurface('gmail:inbox')?.catalog.id).toBe(LATE);
  });

  it('reports a catalog that does not load as a catalog load failure, and never claims the slot', async () => {
    const {wiring, sent} = canvasWith(() => Promise.reject(new Error('the entry threw')));
    await wiring.sendUtterance('what needs my attention');
    await settle();
    expect(wiring.viewed()!.store.getState().placement.has('gmail')).toBe(false);
    const report = sent[1]!.message.parts[0] as unknown as {data: {error: Record<string, unknown>}};
    expect(report.data.error).toEqual({
      code: CATALOG_LOAD_FAILED,
      surfaceId: 'gmail:inbox',
      message: 'the entry threw',
      catalogId: LATE,
    });
  });

  it('advertises the client’s own two catalogs to the orchestrator', async () => {
    const {wiring, sent} = canvasWith(() => Promise.resolve());
    await wiring.sendUtterance('what needs my attention');
    expect(sent[0]!.message.metadata?.a2uiClientCapabilities).toEqual({
      'v0.9': {supportedCatalogIds: [BASIC_CATALOG_ID, SHELL_CATALOG_ID]},
    });
  });
});
