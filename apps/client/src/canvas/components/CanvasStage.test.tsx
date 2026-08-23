/**
 * The canvas stage: renders the one stage surface through the existing A2UI pipeline
 * (single-surface stage; composition is the agent's job).
 */
import {describe, it, expect} from 'vitest';
import {screen} from '@testing-library/react';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import {CATALOG, CATALOG_ID} from 'github-catalog';
import {renderWithShell} from '../../../tests/helpers';
import {createCanvasStore} from '../canvasStore';
import {createTurnRunner} from '../turn/canvasTurn';
import {CanvasStage} from './CanvasStage';

function paint(surfaceId: string, text: string): A2uiMessage[] {
  return [
    {version: 'v0.9', createSurface: {surfaceId, catalogId: CATALOG_ID}},
    {
      version: 'v0.9',
      updateComponents: {
        surfaceId,
        components: [{id: 'root', component: 'Text', text}],
      },
    },
  ] as unknown as A2uiMessage[];
}

function setup() {
  const processor = new MessageProcessor([CATALOG]);
  const store = createCanvasStore();
  const runner = createTurnRunner({
    processor,
    store,
    createStaging: () => new MessageProcessor([CATALOG]),
  });
  const apply = (messages: A2uiMessage[]) => {
    const turn = runner.begin({
      kind: 'utterance',
      parent: null,
      forked: false,
      payload: {text: 'paint'},
    });
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

  it('renders the stage surface through the A2UI pipeline, ghost gone', () => {
    const {processor, store, apply} = setup();
    apply(paint('pull-request-list', 'Hello from the stage'));
    renderWithShell(<CanvasStage processor={processor} state={store.getState()} />);
    expect(screen.getByText('Hello from the stage')).toBeInTheDocument();
    expect(screen.queryByTestId('canvas-empty-ghost')).toBeNull();
  });

  it('a repaint shows the new content', () => {
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
