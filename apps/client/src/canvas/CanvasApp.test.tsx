/**
 * The canvas page: stage + overlay + palette + status strip + ambient notice assembled over
 * the A2A transport and the turn runner, with the ?beat= fixture-replay affordance and the
 * interaction policy (last-intent-wins palette, blocked actions with a cue, always-live
 * overlay answers).
 */
import {describe, it, expect, afterEach} from 'vitest';
import {render, screen, cleanup, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {MessageSendParams, Part, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import {CATALOG_ID} from 'github-catalog';
import type {A2AMessageSender} from '../a2a/client';
import {CATALOGS} from '../../tests/helpers';
import {Providers} from '../providers';
import {CanvasApp} from './CanvasApp';

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', window.location.pathname);
});

const SURFACE_MESSAGES = [
  {version: 'v0.9', createSurface: {surfaceId: 'answer', catalogId: CATALOG_ID}},
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId: 'answer',
      components: [{id: 'root', component: 'Text', text: 'hello from the agent'}],
    },
  },
];

const ACTIONABLE_MESSAGES = [
  {version: 'v0.9', createSurface: {surfaceId: 'list', catalogId: CATALOG_ID}},
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId: 'list',
      components: [
        {
          id: 'root',
          component: 'Button',
          child: 'label',
          action: {event: {name: 'open-issue', context: {}}},
        },
        {id: 'label', component: 'Text', text: 'Open issue'},
      ],
    },
  },
];

function eventOf(
  messages: Record<string, unknown>[],
  texts: string[] = [],
  contextId = 'ctx-1',
): TaskStatusUpdateEvent {
  const parts: Part[] = [
    ...texts.map(text => ({kind: 'text', text}) as Part),
    ...messages.map(data => ({kind: 'data', data}) as Part),
  ];
  return {
    kind: 'status-update',
    taskId: 't1',
    contextId,
    final: true,
    status: {
      state: 'completed',
      message: {kind: 'message', role: 'agent', messageId: 'm1', parts},
    },
  };
}

/** Every send yields `script[i]` (gated when `gated`), in call order. */
function scriptedSender(script: TaskStatusUpdateEvent[], gated = false) {
  const sent: MessageSendParams[] = [];
  let release: () => void = () => {};
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  const sender: A2AMessageSender = {
    async *sendMessageStream(params) {
      const index = sent.length;
      sent.push(params);
      if (gated) await gate;
      yield script[Math.min(index, script.length - 1)];
    },
  };
  return {sender, sent, release};
}

function renderCanvas(sender?: A2AMessageSender) {
  return render(
    <Providers>
      <CanvasApp client={sender} catalogs={CATALOGS} />
    </Providers>,
  );
}

async function ask(text: string) {
  await userEvent.type(screen.getByRole('textbox', {name: /ask the agent/i}), `${text}{Enter}`);
}

describe('CanvasApp', () => {
  it('auto-opens the palette on an empty idle canvas', () => {
    renderCanvas();
    expect(screen.getByRole('textbox', {name: /ask the agent/i})).toHaveFocus();
  });

  it('Esc dismisses; ⌘K and the floating Ask pill summon it back', async () => {
    renderCanvas();
    // While the palette is open, the pill yields to it — one call-to-action at a time.
    expect(screen.queryByRole('button', {name: /^ask$/i})).toBeNull();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('textbox', {name: /ask the agent/i})).toBeNull();

    await userEvent.keyboard('{Meta>}k{/Meta}');
    expect(screen.getByRole('textbox', {name: /ask the agent/i})).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', {name: /^ask$/i}));
    expect(screen.getByRole('textbox', {name: /ask the agent/i})).toBeInTheDocument();
  });

  it('an utterance closes the palette, shows in-flight, and lands the paint on the stage', async () => {
    const {sender, sent, release} = scriptedSender([eventOf(SURFACE_MESSAGES)], true);
    renderCanvas(sender);

    await ask('show me something');

    expect(sent).toHaveLength(1);
    expect(screen.queryByRole('textbox', {name: /ask the agent/i})).toBeNull();
    expect(screen.getByTestId('canvas-pending')).toBeInTheDocument();

    release();

    expect(await screen.findByText('hello from the agent')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('canvas-pending')).toBeNull());
  });

  it('routes agent prose into the ambient notice', async () => {
    const {sender} = scriptedSender([eventOf(SURFACE_MESSAGES, ['here you go'])]);
    renderCanvas(sender);

    await ask('show me something');

    expect(await screen.findByTestId('canvas-notice')).toHaveTextContent('here you go');
  });

  it('a stage surface action dispatches to the agent and repaints the stage', async () => {
    const {sender, sent} = scriptedSender([
      eventOf(ACTIONABLE_MESSAGES),
      eventOf(SURFACE_MESSAGES),
    ]);
    renderCanvas(sender);

    await ask('show me issues');
    await userEvent.click(await screen.findByRole('button', {name: 'Open issue'}));

    expect(await screen.findByText('hello from the agent')).toBeInTheDocument();
    expect(sent).toHaveLength(2);
    expect(screen.queryByText('Open issue')).toBeNull();
  });

  it('holds the stage while a new paint streams, swapping only when it lands', async () => {
    // First send resolves immediately; the second stays gated so the hold is observable.
    const sent: MessageSendParams[] = [];
    let release: () => void = () => {};
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    const sender: A2AMessageSender = {
      async *sendMessageStream(params) {
        const index = sent.length;
        sent.push(params);
        if (index === 0) {
          yield eventOf(SURFACE_MESSAGES);
          return;
        }
        await gate;
        yield eventOf(ACTIONABLE_MESSAGES);
      },
    };
    renderCanvas(sender);
    await ask('show me something');
    expect(await screen.findByText('hello from the agent')).toBeInTheDocument();

    await userEvent.keyboard('{Meta>}k{/Meta}');
    await ask('now the issues');
    // The hold: the outgoing surface stays visible while the new paint is in flight.
    expect(screen.getByTestId('canvas-pending')).toBeInTheDocument();
    expect(screen.getByText('hello from the agent')).toBeInTheDocument();
    expect(screen.queryByText('Open issue')).toBeNull();

    release();
    expect(await screen.findByRole('button', {name: 'Open issue'})).toBeInTheDocument();
    expect(screen.queryByText('hello from the agent')).toBeNull();
  });

  it('a palette utterance while a paint is in flight cancels it and dispatches (last-intent-wins)', async () => {
    // Send 0 lands the first stage; send 1 never resolves until released (the paint to cancel);
    // send 2 is the overriding utterance. The stale send-1 event released later must be inert.
    const sent: MessageSendParams[] = [];
    let releaseStale: () => void = () => {};
    const staleGate = new Promise<void>(resolve => {
      releaseStale = resolve;
    });
    const sender: A2AMessageSender = {
      async *sendMessageStream(params) {
        const index = sent.length;
        sent.push(params);
        if (index === 0) {
          yield eventOf(ACTIONABLE_MESSAGES);
          return;
        }
        if (index === 1) {
          await staleGate;
          yield eventOf(ACTIONABLE_MESSAGES);
          return;
        }
        yield eventOf(SURFACE_MESSAGES);
      },
    };
    renderCanvas(sender);
    await ask('show me issues');
    await screen.findByRole('button', {name: 'Open issue'});

    await userEvent.keyboard('{Meta>}k{/Meta}');
    await ask('slow one');
    expect(screen.getByTestId('canvas-pending')).toBeInTheDocument();

    await userEvent.keyboard('{Meta>}k{/Meta}');
    await ask('actually, show me something else');

    expect(sent).toHaveLength(3);
    expect(await screen.findByText('hello from the agent')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTestId('canvas-pending')).toBeNull());

    // The canceled turn's late stream is discarded, not painted.
    releaseStale();
    await waitFor(() => expect(screen.getByText('hello from the agent')).toBeInTheDocument());
    expect(screen.queryByText('Open issue')).toBeNull();
  });

  it('a question paint lands in the overlay; answering dispatches the action and dismisses it', async () => {
    const QUESTION_MESSAGES = [
      // The declared marker is what routes a paint to the overlay — the canvas no longer infers
      // it from a ConfirmationDialog root. It rides its own DataPart, ahead of the create.
      {paintMeta: {surfaceId: 'which-repo', kind: 'question'}},
      {version: 'v0.9', createSurface: {surfaceId: 'which-repo', catalogId: CATALOG_ID}},
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId: 'which-repo',
          components: [
            {
              id: 'root',
              component: 'ConfirmationDialog',
              title: 'Which repository?',
              confirmButtonContent: 'a2ui-project/a2ui',
              cancelButtonContent: 'Somewhere else',
              confirmAction: {event: {name: 'choose-repo', context: {}}},
              cancelAction: {event: {name: 'choose-other', context: {}}},
            },
          ],
        },
      },
    ];
    const {sender, sent} = scriptedSender([eventOf(QUESTION_MESSAGES), eventOf(SURFACE_MESSAGES)]);
    renderCanvas(sender);

    await ask('do the ambiguous thing');
    expect(await screen.findByText('Which repository?')).toBeInTheDocument();
    // In the overlay, not on the stage — which is what the marker buys.
    expect(screen.getByTestId('canvas-overlay')).toHaveTextContent('Which repository?');

    await userEvent.click(screen.getByRole('button', {name: 'a2ui-project/a2ui'}));

    // The answer rode the wire as the raw action event, and the resulting paint landed.
    expect(await screen.findByText('hello from the agent')).toBeInTheDocument();
    expect(sent).toHaveLength(2);
    const dataPart = sent[1].message.parts.find(p => p.kind === 'data') as
      Extract<Part, {kind: 'data'}> | undefined;
    expect(dataPart?.data.action).toMatchObject({name: 'choose-repo', surfaceId: 'which-repo'});
    // The dialog is gone — removed at answer dispatch.
    expect(screen.queryByText('Which repository?')).toBeNull();
  });

  it('blocks agent-bound surface actions while a paint is in flight, with a status cue', async () => {
    // First send resolves immediately with the actionable surface; the second stays gated so
    // the click's paint is observably in flight when the third click arrives.
    const sent: MessageSendParams[] = [];
    let release: () => void = () => {};
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    const sender: A2AMessageSender = {
      async *sendMessageStream(params) {
        const index = sent.length;
        sent.push(params);
        if (index === 0) {
          yield eventOf(ACTIONABLE_MESSAGES);
          return;
        }
        await gate;
        yield eventOf(SURFACE_MESSAGES);
      },
    };
    renderCanvas(sender);
    await ask('show me issues');
    const button = await screen.findByRole('button', {name: 'Open issue'});

    await userEvent.click(button);
    expect(await screen.findByTestId('canvas-pending')).toBeInTheDocument();
    await userEvent.click(button);

    expect(sent).toHaveLength(2);
    expect(screen.getByTestId('canvas-notice')).toHaveTextContent(/paint is in flight/i);
    release();
    await waitFor(() => expect(screen.queryByTestId('canvas-pending')).toBeNull());
  });

  it('?beat= accepts a comma-separated list and replays the beats in sequence', async () => {
    window.history.replaceState(null, '', '?beat=plain,plain-2&instant');
    renderCanvas();

    await waitFor(() => expect(screen.getByTestId('canvas-stage')).not.toBeEmptyDOMElement());
    await waitFor(() => expect(screen.queryByTestId('canvas-pending')).toBeNull());
    // Both beats ran: the first departed into the timeline, the second is the live head.
    await userEvent.click(screen.getByRole('button', {name: 'Back'}));
    expect(await screen.findByText(/past view/i)).toBeInTheDocument();
  });

  it('?beat= replays a synthetic beat onto the stage', async () => {
    window.history.replaceState(null, '', '?beat=plain&instant');
    renderCanvas();

    await waitFor(() => {
      const stage = screen.getByTestId('canvas-stage');
      expect(stage).not.toBeEmptyDOMElement();
    });
    // Replay runs and settles; the palette did not auto-open over it.
    await waitFor(() => expect(screen.queryByTestId('canvas-pending')).toBeNull());
  });

  it('?beat= with an unknown beat reports a sticky error', async () => {
    window.history.replaceState(null, '', '?beat=42');
    renderCanvas();
    expect(await screen.findByRole('alert')).toHaveTextContent(/beat/i);
  });
});

const BOUND_MESSAGES = [
  {version: 'v0.9', createSurface: {surfaceId: 'filters', catalogId: CATALOG_ID}},
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId: 'filters',
      components: [
        {
          id: 'root',
          component: 'Checkbox',
          checked: {path: '/urgent'},
          accessibility: {label: 'urgent only'},
        },
      ],
    },
  },
  {version: 'v0.9', updateDataModel: {surfaceId: 'filters', value: {urgent: false}}},
];

/** Land two paints so there is a past to park on: `filters` departs, `answer` is live. */
async function landTwoPaints(script: TaskStatusUpdateEvent[] = []) {
  const {sender, sent, release} = scriptedSender(
    [eventOf(BOUND_MESSAGES), eventOf(SURFACE_MESSAGES), ...script.slice(2)].slice(
      0,
      2 + script.length,
    ),
  );
  renderCanvas(sender);
  await ask('show my filters');
  await screen.findByRole('checkbox', {name: 'urgent only'});
  await userEvent.keyboard('{Meta>}k{/Meta}');
  await ask('show me something');
  await screen.findByText('hello from the agent');
  return {sent, release};
}

describe('CanvasApp time travel', () => {
  it('Back parks on the previous paint: its content renders under the past-view banner', async () => {
    await landTwoPaints();

    await userEvent.click(screen.getByRole('button', {name: 'Back'}));

    expect(await screen.findByRole('checkbox', {name: 'urgent only'})).toBeInTheDocument();
    expect(screen.queryByText('hello from the agent')).toBeNull();
    expect(screen.getByText(/past view/i)).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Return to live'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Repaint'})).toBeInTheDocument();
  });

  it('Back is disabled with nothing to go back to; the parked chrome is absent while live', async () => {
    renderCanvas();
    expect(screen.getByRole('button', {name: 'Back'})).toBeDisabled();
    expect(screen.queryByRole('button', {name: 'Return to live'})).toBeNull();
    expect(screen.queryByText(/past view/i)).toBeNull();
  });

  it('Return to live restores the head', async () => {
    await landTwoPaints();
    await userEvent.click(screen.getByRole('button', {name: 'Back'}));
    await screen.findByRole('checkbox', {name: 'urgent only'});

    await userEvent.click(screen.getByRole('button', {name: 'Return to live'}));

    expect(await screen.findByText('hello from the agent')).toBeInTheDocument();
    expect(screen.queryByText(/past view/i)).toBeNull();
  });

  it('right-clicking Back opens the titled history list; picking an entry parks on it', async () => {
    await landTwoPaints();

    await userEvent.pointer({
      keys: '[MouseRight]',
      target: screen.getByRole('button', {name: 'Back'}),
    });
    const list = await screen.findByRole('menu');
    // Every retained entry, titles cause-derived, the live head marked.
    expect(list).toHaveTextContent('“show my filters”');
    expect(list).toHaveTextContent('“show me something”');
    expect(list).toHaveTextContent(/live/i);

    await userEvent.click(screen.getByRole('menuitem', {name: /show my filters/i}));
    expect(await screen.findByRole('checkbox', {name: 'urgent only'})).toBeInTheDocument();
    expect(screen.getByText(/past view/i)).toBeInTheDocument();
  });

  it('Repaint re-fires the parked cause as a fork and jumps to live', async () => {
    const {sent} = await landTwoPaints([
      eventOf(BOUND_MESSAGES),
      eventOf(SURFACE_MESSAGES),
      eventOf(ACTIONABLE_MESSAGES),
    ]);
    await userEvent.click(screen.getByRole('button', {name: 'Back'}));
    await screen.findByRole('checkbox', {name: 'urgent only'});

    await userEvent.click(screen.getByRole('button', {name: 'Repaint'}));

    // The cause re-fired verbatim; the resulting paint landed at the head, live.
    expect(await screen.findByRole('button', {name: 'Open issue'})).toBeInTheDocument();
    expect(sent).toHaveLength(3);
    const textPart = sent[2].message.parts.find(p => p.kind === 'text') as
      Extract<Part, {kind: 'text'}> | undefined;
    expect(textPart?.text).toBe('show my filters');
    // A forked turn reports the parked snapshot's data model, not the head's.
    const metadata = sent[2].message.metadata as
      {a2uiClientDataModel?: {surfaces: Record<string, unknown>}} | undefined;
    expect(metadata?.a2uiClientDataModel?.surfaces).toEqual({filters: {urgent: false}});
    expect(screen.queryByText(/past view/i)).toBeNull();
  });

  it('an agent-bound action fired from a parked surface forks and jumps to live', async () => {
    // Land the actionable surface first, then a second paint, then park back onto it.
    const {sender, sent} = scriptedSender([
      eventOf(ACTIONABLE_MESSAGES),
      eventOf(SURFACE_MESSAGES),
      eventOf(BOUND_MESSAGES),
    ]);
    renderCanvas(sender);
    await ask('show me issues');
    await screen.findByRole('button', {name: 'Open issue'});
    await userEvent.keyboard('{Meta>}k{/Meta}');
    await ask('show me something');
    await screen.findByText('hello from the agent');

    await userEvent.click(screen.getByRole('button', {name: 'Back'}));
    await userEvent.click(await screen.findByRole('button', {name: 'Open issue'}));

    // Dispatched from the past: the consequence lands at the head, live.
    expect(await screen.findByRole('checkbox', {name: 'urgent only'})).toBeInTheDocument();
    expect(sent).toHaveLength(3);
    expect(screen.queryByText(/past view/i)).toBeNull();
  });

  it('parked interaction state persists across visits (teardown write-back)', async () => {
    await landTwoPaints();

    await userEvent.click(screen.getByRole('button', {name: 'Back'}));
    await userEvent.click(await screen.findByRole('checkbox', {name: 'urgent only'}));
    expect(screen.getByRole('checkbox', {name: 'urgent only'})).toBeChecked();

    await userEvent.click(screen.getByRole('button', {name: 'Return to live'}));
    await screen.findByText('hello from the agent');
    await userEvent.click(screen.getByRole('button', {name: 'Back'}));

    // State as of the last time you touched it.
    expect(await screen.findByRole('checkbox', {name: 'urgent only'})).toBeChecked();
  });

  it('a paint landing while parked leaves the view parked, with a newer-view signal', async () => {
    // Sends: two immediate paints, then a gated third dispatched from live before parking.
    const sent: MessageSendParams[] = [];
    let release: () => void = () => {};
    const gate = new Promise<void>(resolve => {
      release = resolve;
    });
    const sender: A2AMessageSender = {
      async *sendMessageStream(params) {
        const index = sent.length;
        sent.push(params);
        if (index === 0) yield eventOf(BOUND_MESSAGES);
        else if (index === 1) yield eventOf(SURFACE_MESSAGES);
        else {
          await gate;
          yield eventOf(ACTIONABLE_MESSAGES);
        }
      },
    };
    renderCanvas(sender);
    await ask('show my filters');
    await screen.findByRole('checkbox', {name: 'urgent only'});
    await userEvent.keyboard('{Meta>}k{/Meta}');
    await ask('show me something');
    await screen.findByText('hello from the agent');
    await userEvent.keyboard('{Meta>}k{/Meta}');
    await ask('now the issues');

    // Park during the flight; the paint lands behind the parked view.
    await userEvent.click(screen.getByRole('button', {name: 'Back'}));
    await screen.findByRole('checkbox', {name: 'urgent only'});
    release();

    expect(await screen.findByText(/newer view/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', {name: 'urgent only'})).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: 'Open issue'})).toBeNull();

    await userEvent.click(screen.getByRole('button', {name: 'Return to live'}));
    expect(await screen.findByRole('button', {name: 'Open issue'})).toBeInTheDocument();
  });
});

describe('CanvasApp wire contracts', () => {
  it('a parked dispatch attaches the exact fork context as message metadata', async () => {
    const {sender, sent} = scriptedSender([
      eventOf(ACTIONABLE_MESSAGES),
      eventOf(SURFACE_MESSAGES),
      eventOf(BOUND_MESSAGES),
    ]);
    renderCanvas(sender);
    await ask('show me issues');
    await screen.findByRole('button', {name: 'Open issue'});
    await userEvent.keyboard('{Meta>}k{/Meta}');
    await ask('show me something');
    await screen.findByText('hello from the agent');

    await userEvent.click(screen.getByRole('button', {name: 'Back'}));
    await userEvent.click(await screen.findByRole('button', {name: 'Open issue'}));
    await screen.findByRole('checkbox', {name: 'urgent only'});

    expect(sent).toHaveLength(3);
    const metadata = sent[2].message.metadata as {a2uiForkContext?: unknown} | undefined;
    expect(metadata?.a2uiForkContext).toEqual({
      paintId: 1,
      title: '“show me issues”',
      paintedAt: expect.any(Number),
      position: 1,
    });
  });

  it('a live dispatch never carries the fork key', async () => {
    const {sender, sent} = scriptedSender([
      eventOf(ACTIONABLE_MESSAGES),
      eventOf(SURFACE_MESSAGES),
    ]);
    renderCanvas(sender);
    await ask('show me issues');
    await userEvent.click(await screen.findByRole('button', {name: 'Open issue'}));
    await screen.findByText('hello from the agent');

    const metadata = sent[1].message.metadata as {a2uiForkContext?: unknown} | undefined;
    expect(metadata?.a2uiForkContext).toBeUndefined();
  });

  it('an agent-authored paint title streams into the history list', async () => {
    const titled = [
      {paintMeta: {surfaceId: 'answer', title: 'Agent-titled view'}},
      ...SURFACE_MESSAGES,
    ];
    const {sender} = scriptedSender([eventOf(ACTIONABLE_MESSAGES), eventOf(titled)]);
    renderCanvas(sender);
    await ask('show me issues');
    await screen.findByRole('button', {name: 'Open issue'});
    await userEvent.keyboard('{Meta>}k{/Meta}');
    await ask('show me something');
    await screen.findByText('hello from the agent');

    await userEvent.pointer({
      keys: '[MouseRight]',
      target: screen.getByRole('button', {name: 'Back'}),
    });
    const list = await screen.findByRole('menu');
    expect(list).toHaveTextContent('Agent-titled view');
    expect(list).toHaveTextContent('“show me issues”'); // the untitled entry keeps the fallback
  });
});
