/**
 * The fragment's way back on the canvas (task 9.7): the arrows the shell catalog draws on the
 * attribution row are fed from the canvas's history through the host's context, disabled while
 * the source's repaint is in flight, and a press on one steps the fragment back at once.
 */
import {afterEach, describe, expect, it} from 'vitest';
import {cleanup, render, screen, act} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {MessageSendParams, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import {CATALOG_ID as GITHUB_CATALOG_ID} from 'github-catalog';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import type {CompositionStamp} from '@a2uiverse/sdk';
import type {A2AMessageSender} from '../../a2a/client';
import {CatalogProvider} from '../../catalogs/CatalogContext';
import {resolveCatalogs} from '../../catalogs/resolver';
import {listCatalogs} from '../../orchestratorApi';
import {Providers} from '../../providers';
import {createCanvasWiring} from '../createCanvasWiring';
import {createHostRelay} from '../hostRelay';
import {CanvasView} from './CanvasView';

afterEach(cleanup);

const HOST_RELAY = createHostRelay();
const BOUND_CATALOGS = resolveCatalogs(await listCatalogs(), HOST_RELAY.host);

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;
const SHELL: CompositionStamp = {source: 'shell', role: 'shell'};
const GITHUB: CompositionStamp = {source: 'github', role: 'fragment'};

const layout = [
  msg({createSurface: {surfaceId: 'shell:main', catalogId: SHELL_CATALOG_ID}}),
  msg({
    updateComponents: {
      surfaceId: 'shell:main',
      components: [
        {id: 'root', component: 'Column', children: ['attribution-github']},
        {
          id: 'attribution-github',
          component: 'Attribution',
          appId: 'github',
          displayName: 'GitHub',
          child: 'github',
        },
        {id: 'github', component: 'Slot', source: 'github', state: 'pending', label: 'GitHub'},
      ],
    },
  }),
];
const githubPaint = (title: string, text: string) => [
  msg({paintMeta: {surfaceId: 'github:pr-list', title}}),
  msg({createSurface: {surfaceId: 'github:pr-list', catalogId: GITHUB_CATALOG_ID}}),
  msg({
    updateComponents: {
      surfaceId: 'github:pr-list',
      components: [{id: 'root', component: 'Text', text}],
    },
  }),
];

const completed: TaskStatusUpdateEvent = {
  kind: 'status-update',
  taskId: 'press-1',
  contextId: 'ctx-1',
  final: true,
  status: {state: 'completed'},
};

function setup() {
  const sent: MessageSendParams[] = [];
  const client: A2AMessageSender = {
    sendMessageStream(params) {
      sent.push(params);
      return (async function* () {
        yield completed;
      })();
    },
  };
  const wiring = createCanvasWiring({client, catalogs: BOUND_CATALOGS.map(c => c.catalog)});
  HOST_RELAY.bind(wiring.host);
  const runtime = wiring.openReplayCanvas('what needs my attention');
  const turn = runtime.runner.begin({
    kind: 'utterance',
    payload: {text: 'what needs my attention'},
  });
  turn.apply(layout, SHELL);
  turn.apply(githubPaint('Pull requests', 'four PRs'), GITHUB);
  turn.end();
  const openDetail = () =>
    runtime.runner.begin({
      kind: 'surface-action',
      payload: {
        action: {
          name: 'open',
          context: {},
          surfaceId: 'github:pr-list',
          sourceComponentId: 'row',
          timestamp: '2026-09-25T00:00:00Z',
        },
      },
    });
  render(
    <Providers>
      <CatalogProvider catalogs={BOUND_CATALOGS}>
        <CanvasView runtime={runtime} onEdit={() => {}} />
      </CatalogProvider>
    </Providers>,
  );
  return {runtime, sent, openDetail};
}

describe('the way back on the canvas (task 9.7)', () => {
  it('draws Back once the fragment has a paint to return to, disabled while its repaint is in flight (decision 6)', () => {
    const {openDetail} = setup();
    expect(screen.queryByRole('button', {name: /^Back/})).toBeNull();
    let action!: ReturnType<typeof openDetail>;
    act(() => {
      action = openDetail();
    });
    act(() => action.apply(githubPaint('PR #42', 'the detail'), GITHUB));
    act(() => action.end());
    expect(screen.getByText('the detail')).toBeInTheDocument();
    const back = screen.getByRole('button', {name: 'Back to Pull requests'});
    expect(back).toBeEnabled();
    // Another action inside the fragment: the arrow stays on the row, disabled, until it lands.
    let again!: ReturnType<typeof openDetail>;
    act(() => {
      again = openDetail();
    });
    expect(screen.getByRole('button', {name: 'Back to Pull requests'})).toBeDisabled();
    act(() => again.end());
    expect(screen.getByRole('button', {name: 'Back to Pull requests'})).toBeEnabled();
  });

  it('a press on Back restores the paint at once and sends the step; Forward then offers the detail', async () => {
    const user = userEvent.setup();
    const {sent, openDetail} = setup();
    let action!: ReturnType<typeof openDetail>;
    act(() => {
      action = openDetail();
    });
    act(() => action.apply(githubPaint('PR #42', 'the detail'), GITHUB));
    act(() => action.end());
    await user.click(screen.getByRole('button', {name: 'Back to Pull requests'}));
    expect(screen.getByText('four PRs')).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: /^Back/})).toBeNull();
    expect(screen.getByRole('button', {name: 'Forward to PR #42'})).toBeInTheDocument();
    expect(sent.map(params => params.message.parts[0])).toEqual([
      {
        kind: 'data',
        data: {version: 'v0.9', operation: {kind: 'step', sources: ['github'], step: 0}},
      },
    ]);
  });
});
