/**
 * A canvas meeting a catalog it does not hold yet (task-11.5 decisions 1 to 4): the fragment waits
 * for the load and then claims its slot; a catalog that fails to load is reported to the hub as
 * the A2UIVerse extension's catalog load failure, and the fragment never claims its slot. The
 * canvas advertises the client's own two catalogs, whatever it holds (decision 8). A canvas open
 * across a build move draws each new paint in the build its stamp names, a surface on screen
 * keeping its own until its agent changes its components, and a paint the way back returns to
 * restored in its own (task 15.6).
 */
import {describe, expect, it, vi} from 'vitest';
import type {MessageSendParams, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import {Catalog, type A2uiMessage} from '@a2ui/web_core/v0_9';
import {basicCatalog} from '@a2ui/web_core/v0_9/basic_catalog';
import type {ReactCatalogComponent} from '@a2ui/react/v0_9';
import {BASIC_CATALOG_ID, CATALOG_LOAD_FAILED} from '@a2uiverse/sdk';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import type {A2AMessageSender} from '../a2a/client';
import {COMPOSED_BEAT} from '../beats/syntheticBeats';
import {clientCatalogs, resolveCatalog, type ResolvedCatalog} from '../catalogs/clientCatalogs';
import type {BuildSource} from '../catalogs/loader';
import {createCanvasWiring} from './createCanvasWiring';
import {capturePaint} from './history/paintCopy';

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

/** A build of the late catalog, the basic components under its id. */
const lateBuild = (artifact: string) =>
  resolveCatalog(
    new Catalog<ReactCatalogComponent>(
      LATE,
      basicCatalog.protocolVersion,
      [...basicCatalog.components.values()],
      [...basicCatalog.functions.values()],
    ),
    undefined,
    artifact,
  );

/** A stream the hub answers in events, each a batch of messages under its stamp. */
type Events = () => AsyncGenerator<TaskStatusUpdateEvent>;

/** A canvas over the client's own catalogs and builds the test loads by hand. */
function canvasWith(
  load: (catalogId: string, named?: string) => Promise<ResolvedCatalog>,
  events?: Events,
) {
  const own = clientCatalogs();
  const catalogs = own.map(c => c.catalog);
  const sent: MessageSendParams[] = [];
  const client: A2AMessageSender = {
    sendMessageStream(params) {
      sent.push(params);
      if (sent.length > 1) return (async function* () {})();
      return (
        events ??
        async function* () {
          yield event(LAYOUT, {source: 'shell', role: 'shell'});
          yield event(GMAIL_FRAGMENT, {source: 'gmail', role: 'fragment'});
          yield event([], {source: 'gmail', role: 'fragment', settled: true});
          yield event([], {source: 'shell', role: 'shell'}, true);
        }
      )();
    },
  };
  const held = new Map<string, ResolvedCatalog>();
  const keyOf = (catalogId: string, named?: string) => `${catalogId} ${named ?? ''}`;
  const loads = vi.fn(async (catalogId: string, named?: string) => {
    const build = await load(catalogId, named);
    held.set(keyOf(catalogId, named), build);
    return build;
  });
  // The client's own catalogs are held whatever is named, as the loader holds them.
  const ownOf = (catalogId: string) => own.find(c => c.id === catalogId);
  const builds: BuildSource = {
    held: (catalogId, named) => ownOf(catalogId) ?? held.get(keyOf(catalogId, named)),
    load: (catalogId, named) => {
      const provided = ownOf(catalogId);
      return provided ? Promise.resolve(provided) : loads(catalogId, named);
    },
    build: artifact => [...held.values()].find(b => b.build === artifact),
  };
  const wiring = createCanvasWiring({client, catalogs, loader: {builds}});
  return {wiring, sent, loads};
}

const settle = () => new Promise(resolve => setTimeout(resolve, 0));

describe('a fragment in a catalog the canvas does not hold yet', () => {
  it('waits for the catalog, then claims its slot', async () => {
    let release!: () => void;
    const {wiring, loads} = canvasWith(
      () =>
        new Promise<ResolvedCatalog>(resolve => {
          release = () => resolve(lateBuild('sha256-late'));
        }),
    );
    const asked = wiring.sendUtterance('what needs my attention');
    await vi.waitFor(() => expect(loads).toHaveBeenCalledWith(LATE, undefined));
    const runtime = wiring.viewed()!;
    expect(runtime.store.getState().placement.has('gmail')).toBe(false);
    release();
    await asked;
    await vi.waitFor(() =>
      expect(runtime.store.getState().placement.get('gmail')?.surfaceId).toBe('gmail:inbox'),
    );
    expect(runtime.processor.model.getSurface('gmail:inbox')?.defaultCatalog?.id).toBe(LATE);
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
    const {wiring, sent} = canvasWith(() => Promise.resolve(lateBuild('sha256-late')));
    await wiring.sendUtterance('what needs my attention');
    expect(sent[0]!.message.metadata?.a2uiClientCapabilities).toEqual({
      'v0.9': {supportedCatalogIds: [BASIC_CATALOG_ID, SHELL_CATALOG_ID]},
    });
  });
});

describe('a canvas open across a build move (task 15.6)', () => {
  const FIRST = lateBuild('sha256-first');
  const SECOND = lateBuild('sha256-second');
  const BUILDS = new Map([FIRST, SECOND].map(b => [b.build!, b]));
  const loadNamed = (_catalogId: string, named?: string) => Promise.resolve(BUILDS.get(named!)!);
  const fragment = (surfaceId: string, text: string) => [
    msg({createSurface: {surfaceId, catalogId: LATE}}),
    msg({updateComponents: {surfaceId, components: [{id: 'root', component: 'Text', text}]}}),
  ];
  const named = (source: string, build: string) => ({
    source,
    role: 'fragment',
    builds: {[LATE]: build},
  });

  it('draws a new paint in the build its stamp names, the surface on screen keeping its own', async () => {
    const {wiring} = canvasWith(loadNamed, async function* () {
      yield event(LAYOUT, {source: 'shell', role: 'shell'});
      yield event(fragment('gmail:inbox', 'Three unread'), named('gmail', 'sha256-first'));
      yield event(fragment('github:prs', 'Two to review'), named('github', 'sha256-second'));
      yield event([], {source: 'shell', role: 'shell'}, true);
    });
    await wiring.sendUtterance('what needs my attention');
    const {processor} = wiring.viewed()!;
    await vi.waitFor(() => expect(processor.model.getSurface('github:prs')).toBeDefined());
    expect(processor.model.getSurface('gmail:inbox')!.catalog).toBe(FIRST.catalog);
    expect(processor.model.getSurface('github:prs')!.catalog).toBe(SECOND.catalog);
  });

  it('moves a surface on screen when its agent changes its components under a newer build', async () => {
    const {wiring} = canvasWith(loadNamed, async function* () {
      yield event(LAYOUT, {source: 'shell', role: 'shell'});
      yield event(fragment('gmail:inbox', 'Three unread'), named('gmail', 'sha256-first'));
      yield event(
        [
          msg({
            updateComponents: {
              surfaceId: 'gmail:inbox',
              components: [{id: 'root', component: 'Text', text: 'Two unread'}],
            },
          }),
        ],
        named('gmail', 'sha256-second'),
      );
      yield event([], {source: 'shell', role: 'shell'}, true);
    });
    await wiring.sendUtterance('what needs my attention');
    const {processor, store} = wiring.viewed()!;
    await vi.waitFor(() =>
      expect(processor.model.getSurface('gmail:inbox')?.catalog).toBe(SECOND.catalog),
    );
    expect(
      processor.model.getSurface('gmail:inbox')!.componentsModel.get('root')!.properties.text,
    ).toBe('Two unread');
    expect(store.getState().placement.get('gmail')?.surfaceId).toBe('gmail:inbox');
  });

  it('restores a paint the way back returns to in the build it was drawn in', async () => {
    const {wiring} = canvasWith(loadNamed, async function* () {
      yield event(LAYOUT, {source: 'shell', role: 'shell'});
      yield event(fragment('gmail:inbox', 'Three unread'), named('gmail', 'sha256-first'));
      yield event(fragment('github:prs', 'Two to review'), named('github', 'sha256-second'));
      yield event([], {source: 'shell', role: 'shell'}, true);
    });
    await wiring.sendUtterance('what needs my attention');
    const runtime = wiring.viewed()!;
    await vi.waitFor(() => expect(runtime.processor.model.getSurface('github:prs')).toBeDefined());
    const copy = capturePaint(runtime.processor, 'gmail:inbox')!;
    runtime.processor.model.deleteSurface('gmail:inbox');
    runtime.runner.restore('gmail', {paint: copy, id: 1});
    expect(runtime.processor.model.getSurface('gmail:inbox')!.catalog).toBe(FIRST.catalog);
  });
});
