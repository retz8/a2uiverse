/**
 * The canvas stage: renders the one stage surface through the existing A2UI pipeline
 * (single-surface stage; composition is the agent's job).
 */
import {describe, it, expect} from 'vitest';
import {screen} from '@testing-library/react';
import {MessageProcessor} from '@a2ui/web_core/v1_0';
import type {ReactCatalogComponent} from '@a2ui/react';
import type {AgentToRendererMessage} from '@a2ui/web_core/v1_0';
import {renderWithShell} from '../../../tests/helpers';
import {createCanvasStore} from '../canvasStore';
import {createTurnRunner} from '../turn/canvasTurn';
import {CanvasStage} from './CanvasStage';
import {snapshotCatalog, SNAPSHOT_READY} from '../../../tests/snapshot';

const {catalog: CATALOG, id: CATALOG_ID} = await snapshotCatalog('github-catalog');

function paint(surfaceId: string, text: string): AgentToRendererMessage[] {
  return [
    {version: '1.0', createSurface: {surfaceId, catalogId: CATALOG_ID}},
    {
      version: '1.0',
      updateComponents: {
        surfaceId,
        components: [{id: 'root', component: 'Text', text}],
      },
    },
  ] as unknown as AgentToRendererMessage[];
}

function setup() {
  const processor = new MessageProcessor<ReactCatalogComponent>([CATALOG]);
  const store = createCanvasStore();
  const runner = createTurnRunner({
    processor,
    store,
    createStaging: () => new MessageProcessor<ReactCatalogComponent>([CATALOG]),
  });
  const apply = (messages: AgentToRendererMessage[]) => {
    const turn = runner.begin({kind: 'utterance', payload: {text: 'paint'}});
    turn.apply(messages);
    turn.end();
  };
  return {processor, store, apply};
}

describe('CanvasStage', () => {
  it('an empty canvas shows the ghost hint instead of a void', () => {
    const {processor, store} = setup();
    renderWithShell(<CanvasStage processor={processor} state={store.getState()} />);
    expect(screen.getByTestId('canvas-empty-ghost')).toHaveTextContent('⌘K to ask');
  });

  it.skipIf(!SNAPSHOT_READY)(
    'renders the stage surface through the A2UI pipeline, ghost gone',
    () => {
      const {processor, store, apply} = setup();
      apply(paint('pull-request-list', 'Hello from the stage'));
      renderWithShell(<CanvasStage processor={processor} state={store.getState()} />);
      expect(screen.getByText('Hello from the stage')).toBeInTheDocument();
      expect(screen.queryByTestId('canvas-empty-ghost')).toBeNull();
    },
  );

  it.skipIf(!SNAPSHOT_READY)('a repaint shows the new content', () => {
    const {processor, store, apply} = setup();
    apply(paint('user-profile', 'first version'));
    const {rerender} = renderWithShell(
      <CanvasStage processor={processor} state={store.getState()} />,
    );
    apply(paint('user-profile', 'second version'));
    rerender(<CanvasStage processor={processor} state={store.getState()} />);
    expect(screen.getByText('second version')).toBeInTheDocument();
    expect(screen.queryByText('first version')).toBeNull();
  });
});
