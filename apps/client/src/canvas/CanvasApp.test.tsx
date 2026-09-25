/**
 * The canvas page: the canvas on screen + overlay + palette + status strip + ambient notice
 * assembled over the A2A transport and the turn runner, with the ?beat= fixture-replay
 * affordance, the interaction policy (blocked actions with a cue, always-live overlay answers),
 * and the trail — every question a canvas of its own, a past canvas a tab (task 9.6).
 */
import {describe, it, expect, afterEach} from 'vitest';
import {render, screen, cleanup, fireEvent, waitFor, within} from '@testing-library/react';
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

  it('a new question opens a canvas of its own: on screen at once, the previous one running on in the trail (task-9.6 decisions 1, 13)', async () => {
    // First send resolves immediately; the second stays gated so the new canvas is observably
    // in flight while the first stands behind it.
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
          yield eventOf(SURFACE_MESSAGES, [], 'ctx-1');
          return;
        }
        await gate;
        yield eventOf(ACTIONABLE_MESSAGES, [], 'ctx-2');
      },
    };
    renderCanvas(sender);
    await ask('show me something');
    expect(await screen.findByText('hello from the agent')).toBeInTheDocument();

    await userEvent.keyboard('{Meta>}k{/Meta}');
    await ask('now the issues');
    // The new canvas is on screen, planning; the first left the screen but not the session.
    expect(screen.getByTestId('canvas-pending')).toBeInTheDocument();
    expect(screen.queryByText('hello from the agent')).toBeNull();
    expect(screen.getByTestId('canvas-question')).toHaveTextContent('now the issues');

    // Back: the first canvas, as it was, under the band; the new one still loads behind it.
    await userEvent.click(screen.getByRole('button', {name: 'Back'}));
    expect(await screen.findByText('hello from the agent')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-band')).toHaveTextContent(/Parked · asked at/);
    expect(screen.getByRole('button', {name: 'Ask from this view'})).toBeInTheDocument();

    release();
    await userEvent.click(screen.getByRole('button', {name: /Return to live/}));
    expect(await screen.findByRole('button', {name: 'Open issue'})).toBeInTheDocument();
    expect(screen.queryByTestId('canvas-band')).toBeNull();
    await waitFor(() => expect(screen.queryByTestId('canvas-pending')).toBeNull());
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
    // Both beats ran, each a canvas of its own: the second live, the first a step back.
    await userEvent.click(screen.getByRole('button', {name: 'Back'}));
    expect(await screen.findByTestId('canvas-band')).toBeInTheDocument();
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

/** A sender that answers each send from `script`, each answer in its own context. */
function contextualSender(script: Array<Record<string, unknown>[]>) {
  const sent: MessageSendParams[] = [];
  const sender: A2AMessageSender = {
    async *sendMessageStream(params) {
      const index = sent.length;
      sent.push(params);
      yield eventOf(script[Math.min(index, script.length - 1)], [], `ctx-${index + 1}`);
    },
  };
  return {sender, sent};
}

/** What each scripted answer puts on screen, to wait for. */
const probes = new Map<unknown, () => Promise<unknown>>([
  [BOUND_MESSAGES, () => screen.findByRole('checkbox', {name: 'urgent only'})],
  [SURFACE_MESSAGES, () => screen.findByText('hello from the agent')],
  [ACTIONABLE_MESSAGES, () => screen.findByRole('button', {name: 'Open issue'})],
]);

/** Two questions, each its own canvas: `show my filters` first, then `show me something`, live. */
async function askTwo(
  script: Array<Record<string, unknown>[]> = [BOUND_MESSAGES, SURFACE_MESSAGES],
) {
  const {sender, sent} = contextualSender(script);
  renderCanvas(sender);
  await ask('show my filters');
  await probes.get(script[0])!();
  await userEvent.keyboard('{Meta>}k{/Meta}');
  await ask('show me something');
  await probes.get(script[1])!();
  return {sent};
}

/** The rail's pick for the entry labelled so. */
const pick = (label: string) =>
  within(
    screen
      .getAllByTestId('canvas-trail-entry')
      .find(entry => within(entry).getByTestId('canvas-trail-label').textContent === label)!,
  ).getByTestId('canvas-trail-pick');

const metadataOf = (params: MessageSendParams) =>
  params.message.metadata as Record<string, unknown> | undefined;

describe('CanvasApp trail (task 9.6)', () => {
  it('Back views the previous canvas under the band; Return to live restores live', async () => {
    await askTwo();
    await userEvent.click(screen.getByRole('button', {name: 'Back'}));

    expect(await screen.findByRole('checkbox', {name: 'urgent only'})).toBeInTheDocument();
    expect(screen.queryByText('hello from the agent')).toBeNull();
    const band = screen.getByTestId('canvas-band');
    expect(band).toHaveTextContent(/Parked · asked at \d\d:\d\d/);
    expect(screen.getByRole('button', {name: 'Ask this again now'})).toBeInTheDocument();
    // Return to live names the live question.
    expect(screen.getByRole('button', {name: /Return to live/})).toHaveTextContent(
      'show me something',
    );
    expect(screen.getByRole('button', {name: 'Back'})).toBeDisabled();

    await userEvent.click(screen.getByRole('button', {name: /Return to live/}));
    expect(await screen.findByText('hello from the agent')).toBeInTheDocument();
    expect(screen.queryByTestId('canvas-band')).toBeNull();
  });

  it('Back and Trail are disabled with nothing behind; the band is absent while live', () => {
    renderCanvas();
    expect(screen.getByRole('button', {name: 'Back'})).toBeDisabled();
    expect(screen.getByRole('button', {name: 'Trail'})).toBeDisabled();
    expect(screen.queryByTestId('canvas-band')).toBeNull();
  });

  it('Trail opens the rail: newest first, Live and Viewing marked; picking an entry views it and closes the rail (decisions 9, 11)', async () => {
    await askTwo();
    await userEvent.click(screen.getByRole('button', {name: 'Trail'}));
    const rail = await screen.findByRole('navigation', {name: 'Trail of past canvases'});
    expect(rail).toHaveTextContent('Today');
    const labels = screen.getAllByTestId('canvas-trail-label').map(el => el.textContent);
    expect(labels).toEqual(['show me something', 'show my filters']);
    const entries = screen.getAllByTestId('canvas-trail-entry');
    expect(entries[0]).toHaveTextContent('Live');
    expect(entries[0]).toHaveTextContent('Viewing');
    expect(entries[1]).not.toHaveTextContent('Viewing');
    // The gutter's buttons give way to the rail's own top row.
    expect(screen.queryByRole('button', {name: 'Back'})).toBeNull();

    await userEvent.click(pick('show my filters'));
    expect(await screen.findByRole('checkbox', {name: 'urgent only'})).toBeInTheDocument();
    expect(screen.getByTestId('canvas-band')).toBeInTheDocument();
    // The pick closes the drawer, which slides out: gone once its exit has run.
    await waitFor(() =>
      expect(screen.queryByRole('navigation', {name: 'Trail of past canvases'})).toBeNull(),
    );
    expect(screen.getByRole('button', {name: 'Back'})).toBeInTheDocument();

    // Reopened, the viewed one is marked; the rail's own icon closes it too.
    await userEvent.click(screen.getByRole('button', {name: 'Trail'}));
    await screen.findByRole('navigation', {name: 'Trail of past canvases'});
    expect(screen.getAllByTestId('canvas-trail-entry')[1]).toHaveTextContent('Viewing');
    await userEvent.click(screen.getByRole('button', {name: 'Close the trail'}));
    await waitFor(() =>
      expect(screen.queryByRole('navigation', {name: 'Trail of past canvases'})).toBeNull(),
    );

    // And a click on the scrim over the page closes it, landing nowhere else.
    await userEvent.click(screen.getByRole('button', {name: 'Trail'}));
    await screen.findByRole('navigation', {name: 'Trail of past canvases'});
    await userEvent.click(screen.getByTestId('canvas-trail-scrim'));
    await waitFor(() =>
      expect(screen.queryByRole('navigation', {name: 'Trail of past canvases'})).toBeNull(),
    );
    expect(screen.getByRole('checkbox', {name: 'urgent only'})).toBeInTheDocument();
  });

  it('a question asked from a past canvas is its child, marked "from" in the rail; the parent stands (decision 5)', async () => {
    const {sent} = await askTwo([BOUND_MESSAGES, SURFACE_MESSAGES, ACTIONABLE_MESSAGES]);
    await userEvent.click(screen.getByRole('button', {name: 'Back'}));
    await screen.findByRole('checkbox', {name: 'urgent only'});

    await userEvent.click(screen.getByRole('button', {name: 'Ask from this view'}));
    await ask('branch off');
    expect(await screen.findByRole('button', {name: 'Open issue'})).toBeInTheDocument();
    expect(screen.queryByTestId('canvas-band')).toBeNull();

    // On the wire: no contextId, the viewed canvas's context as the parent.
    expect(sent).toHaveLength(3);
    expect(sent[2].message.contextId).toBeUndefined();
    expect(metadataOf(sent[2])?.a2uiverse).toEqual({parent: 'ctx-1'});
    // The second question, asked from live, named live as its parent — a child, not a branch.
    expect(metadataOf(sent[1])?.a2uiverse).toEqual({parent: 'ctx-1'});
    expect(metadataOf(sent[0])?.a2uiverse).toBeUndefined();

    await userEvent.click(screen.getByRole('button', {name: 'Trail'}));
    const entries = await screen.findAllByTestId('canvas-trail-entry');
    expect(entries).toHaveLength(3);
    expect(entries[0]).toHaveAttribute('data-branch', 'true');
    expect(
      within(entries[0]).getByRole('img', {name: 'Asked from show my filters'}),
    ).toBeInTheDocument();
    expect(entries[1]).not.toHaveAttribute('data-branch');
    // The mark names the parent, which still stands; hovering it lights the parent's row.
    await userEvent.hover(screen.getByTitle('Asked from show my filters'));
    expect(entries[2]).toHaveClass('canvas-trail-entry--lit');
    await userEvent.unhover(screen.getByTitle('Asked from show my filters'));
    expect(entries[2]).not.toHaveClass('canvas-trail-entry--lit');
  });

  it('"Ask this again now" sends the viewed question as a child of that canvas and shows the new live canvas (decision 7)', async () => {
    const {sent} = await askTwo([BOUND_MESSAGES, SURFACE_MESSAGES, ACTIONABLE_MESSAGES]);
    await userEvent.click(screen.getByRole('button', {name: 'Back'}));
    await screen.findByRole('checkbox', {name: 'urgent only'});

    await userEvent.click(screen.getByRole('button', {name: 'Ask this again now'}));
    expect(await screen.findByRole('button', {name: 'Open issue'})).toBeInTheDocument();
    expect(screen.queryByTestId('canvas-band')).toBeNull();
    expect(screen.getByTestId('canvas-question')).toHaveTextContent('show my filters');
    const textPart = sent[2].message.parts.find(p => p.kind === 'text') as
      Extract<Part, {kind: 'text'}> | undefined;
    expect(textPart?.text).toBe('show my filters');
    expect(metadataOf(sent[2])?.a2uiverse).toEqual({parent: 'ctx-1'});
    expect(metadataOf(sent[2])?.a2uiClientDataModel).toBeUndefined();
  });

  it('an action inside a past canvas lands in it, on its own context; the live canvas is untouched (phase decision 4)', async () => {
    const {sent} = await askTwo([ACTIONABLE_MESSAGES, SURFACE_MESSAGES, BOUND_MESSAGES]);
    await userEvent.click(screen.getByRole('button', {name: 'Back'}));
    await userEvent.click(await screen.findByRole('button', {name: 'Open issue'}));

    // The answer landed in the past canvas, still parked; nothing moved to live.
    expect(await screen.findByRole('checkbox', {name: 'urgent only'})).toBeInTheDocument();
    expect(screen.getByTestId('canvas-band')).toBeInTheDocument();
    expect(sent).toHaveLength(3);
    expect(sent[2].message.contextId).toBe('ctx-1');
    expect(metadataOf(sent[2])?.a2uiverse).toBeUndefined();

    await userEvent.click(screen.getByRole('button', {name: /Return to live/}));
    expect(await screen.findByText('hello from the agent')).toBeInTheDocument();
  });

  it('a past canvas keeps the state the user left it in', async () => {
    await askTwo();
    await userEvent.click(screen.getByRole('button', {name: 'Back'}));
    await userEvent.click(await screen.findByRole('checkbox', {name: 'urgent only'}));
    expect(screen.getByRole('checkbox', {name: 'urgent only'})).toBeChecked();

    await userEvent.click(screen.getByRole('button', {name: /Return to live/}));
    await screen.findByText('hello from the agent');
    await userEvent.click(screen.getByRole('button', {name: 'Back'}));
    expect(await screen.findByRole('checkbox', {name: 'urgent only'})).toBeChecked();
  });

  it('closing: the viewed canvas returns to live, live makes the newest remaining live, the last leaves the empty canvas; the orchestrator is told (decision 8)', async () => {
    const {sent} = await askTwo();
    await userEvent.click(screen.getByRole('button', {name: 'Trail'}));
    await screen.findByRole('navigation', {name: 'Trail of past canvases'});
    await userEvent.click(pick('show my filters'));
    await screen.findByRole('checkbox', {name: 'urgent only'});
    // The pick closed the drawer; the close is in it.
    await waitFor(() =>
      expect(screen.queryByRole('navigation', {name: 'Trail of past canvases'})).toBeNull(),
    );
    await userEvent.click(screen.getByRole('button', {name: 'Trail'}));
    await screen.findByRole('navigation', {name: 'Trail of past canvases'});

    await userEvent.click(screen.getByRole('button', {name: 'Close show my filters'}));
    expect(await screen.findByText('hello from the agent')).toBeInTheDocument();
    expect(screen.queryByTestId('canvas-band')).toBeNull();
    expect(screen.getAllByTestId('canvas-trail-entry')).toHaveLength(1);
    await waitFor(() => expect(sent).toHaveLength(3));
    expect(sent[2].message.contextId).toBe('ctx-1');
    const part = sent[2].message.parts[0];
    expect(part.kind === 'data' ? part.data : {}).toEqual({
      version: 'v0.9',
      operation: {kind: 'close', sources: []},
    });

    await userEvent.click(screen.getByRole('button', {name: 'Close show me something'}));
    expect(screen.queryByText('hello from the agent')).toBeNull();
    expect(screen.getByTestId('canvas-empty-ghost')).toBeInTheDocument();
    expect(screen.queryAllByTestId('canvas-trail-entry')).toHaveLength(0);
  });

  it('the entry is labelled by the question until the Planner’s title arrives (decision 4)', async () => {
    const titled = [
      {paintMeta: {surfaceId: 'shell:main', title: 'Agent-titled view'}},
      {version: 'v0.9', createSurface: {surfaceId: 'shell:main', catalogId: CATALOG_ID}},
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId: 'shell:main',
          components: [{id: 'root', component: 'Text', text: 'the titled paint'}],
        },
      },
    ];
    const {sender} = contextualSender([ACTIONABLE_MESSAGES, titled]);
    renderCanvas(sender);
    await ask('show me issues');
    await screen.findByRole('button', {name: 'Open issue'});
    await userEvent.keyboard('{Meta>}k{/Meta}');
    await ask('show me something');
    await screen.findByText('the titled paint');

    await userEvent.click(screen.getByRole('button', {name: 'Trail'}));
    const labels = (await screen.findAllByTestId('canvas-trail-label')).map(el => el.textContent);
    expect(labels).toEqual(['Agent-titled view', 'show me issues']);
    // The question stays the canvas's header, verbatim.
    expect(screen.getByTestId('canvas-question')).toHaveTextContent('show me something');
  });

  it('hovering an entry shows its preview: the canvas scaled, its fragments named', async () => {
    await askTwo();
    await userEvent.click(screen.getByRole('button', {name: 'Trail'}));
    await screen.findByRole('navigation', {name: 'Trail of past canvases'});
    // No preview for the entry being viewed.
    await userEvent.hover(pick('show me something'));
    expect(screen.queryByTestId('canvas-trail-preview')).toBeNull();

    await userEvent.hover(pick('show my filters'));
    const preview = await screen.findByTestId('canvas-trail-preview');
    expect(preview).toHaveAttribute('aria-label', 'Preview of show my filters');
    expect(preview.querySelector('[inert]')).not.toBeNull();
    expect(preview.querySelectorAll('input[type="checkbox"]')).toHaveLength(1);

    await userEvent.unhover(pick('show my filters'));
    expect(screen.queryByTestId('canvas-trail-preview')).toBeNull();
  });

  it('an entry picked under the pointer leaves no preview behind: the rail opens again showing none', async () => {
    await askTwo();
    // Clicks with no pointer moving between them, as a real pick: the rail closes under the
    // pointer and the row never sees it leave.
    fireEvent.click(screen.getByRole('button', {name: 'Trail'}));
    await screen.findByRole('navigation', {name: 'Trail of past canvases'});
    fireEvent.mouseEnter(pick('show my filters'));
    await screen.findByTestId('canvas-trail-preview');
    fireEvent.click(pick('show my filters'));
    // Elsewhere again, so the entry picked is one the rail would preview.
    fireEvent.click(await screen.findByRole('button', {name: /Return to live/}));
    fireEvent.click(await screen.findByRole('button', {name: 'Trail'}));
    await screen.findByRole('navigation', {name: 'Trail of past canvases'});
    expect(screen.queryByTestId('canvas-trail-preview')).toBeNull();
  });
});

/**
 * The shell surface (task 6.5): the canvas built the way the entry builds it — the shell catalog
 * bound to this canvas through the relay — so a shell action raised inside a painted surface
 * lands here.
 */
import {createHostRelay} from './hostRelay';
import {resolveCatalogs} from '../catalogs/resolver';
import {listCatalogs} from '../orchestratorApi';

const HOST_RELAY = createHostRelay();
const BOUND_CATALOGS = resolveCatalogs(await listCatalogs(), HOST_RELAY.host);

/** The hub's answer to a shell-action report: a completed final carrying nothing. */
const EMPTY_FINAL: TaskStatusUpdateEvent = {
  kind: 'status-update',
  taskId: 't2',
  contextId: 'ctx-1',
  final: true,
  status: {state: 'completed'},
};

function renderShellCanvas(beat: string) {
  window.history.replaceState(null, '', `?beat=${beat}&instant`);
  const {sender, sent} = scriptedSender([EMPTY_FINAL]);
  render(
    <Providers>
      <CanvasApp client={sender} catalogs={BOUND_CATALOGS} hostRelay={HOST_RELAY} />
    </Providers>,
  );
  return {sent};
}

describe('CanvasApp shell surface', () => {
  it('a platform answer renders its literal data model through the shell catalog’s bindings (task-6.5 decision 8)', async () => {
    renderShellCanvas('platform-answer');
    // The rows come from the data model the hub sent ahead of the tree, not from the tree.
    expect(await screen.findByText('Google Calendar')).toBeInTheDocument();
    expect(screen.getByText('Events, RSVPs, scheduling')).toBeInTheDocument();
    expect(screen.getByText('Three apps are installed.')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Manage apps'})).toBeInTheDocument();
  });

  it('the capability tile opens the Store over the canvas with the gap as the query, and reports the action on the side (task-6.5 decisions 3, 4, 6)', async () => {
    const {sent} = renderShellCanvas('gap');
    await userEvent.click(await screen.findByRole('button', {name: 'Search the Store'}));

    // The page opens at once, over the canvas: the composition is still on the stage beneath.
    const overlay = await screen.findByRole('dialog', {name: 'Store'});
    expect(overlay).toHaveAttribute('data-query', 'flight booking');
    expect(screen.getByTestId('canvas-stage')).not.toBeEmptyDOMElement();
    // Not a turn: nothing in flight, nothing in the history.
    expect(screen.queryByTestId('canvas-pending')).toBeNull();
    expect(screen.getByRole('button', {name: 'Back'})).toBeDisabled();

    // The report: one standard A2UI action on the shell surface, the query in its context.
    await waitFor(() => expect(sent).toHaveLength(1));
    const part = sent[0].message.parts[0];
    expect(part.kind === 'data' ? part.data : {}).toMatchObject({
      version: 'v0.9',
      action: {
        name: 'openStore',
        surfaceId: 'shell:main',
        sourceComponentId: 'flight',
        context: {query: 'flight booking'},
      },
    });

    await userEvent.click(screen.getByRole('button', {name: 'Back to the canvas'}));
    expect(screen.queryByRole('dialog', {name: 'Store'})).toBeNull();
    expect(screen.getByRole('button', {name: 'Search the Store'})).toBeInTheDocument();
  });

  it('Retry on a failed slot sends the retry beside the turn and gives the tile way at once (task 8.5)', async () => {
    window.history.replaceState(null, '', '?beat=composed&instant');
    // The press's stream stays open: the orchestrator has not answered yet.
    const sent: MessageSendParams[] = [];
    const silent = {
      next: () => new Promise<never>(() => {}),
      return: () => Promise.resolve({done: true as const, value: undefined}),
      throw: (thrown: unknown) => Promise.reject(thrown),
      [Symbol.asyncIterator]: () => silent,
    };
    const sender: A2AMessageSender = {
      sendMessageStream(params) {
        sent.push(params);
        return silent as unknown as ReturnType<A2AMessageSender['sendMessageStream']>;
      },
    };
    render(
      <Providers>
        <CanvasApp client={sender} catalogs={BOUND_CATALOGS} hostRelay={HOST_RELAY} />
      </Providers>,
    );
    const retry = await screen.findByRole('button', {name: 'Retry'});
    await userEvent.click(retry);
    // Drawn at the press, before any answer: the pending line in the tile's place, focus on it.
    expect(screen.queryByRole('button', {name: 'Retry'})).toBeNull();
    const pending = screen.getByText('Loading…');
    expect(document.activeElement).toBe(pending);
    await waitFor(() => expect(sent).toHaveLength(1));
    const part = sent[0].message.parts[0];
    expect(part.kind === 'data' ? part.data : {}).toEqual({
      version: 'v0.9',
      operation: {kind: 'retry', sources: ['gmail']},
    });
    // Not a turn: nothing in the history.
    expect(screen.getByRole('button', {name: 'Back'})).toBeDisabled();
  });

  it('the model’s button opens the App Library; every raise is reported, an open page included', async () => {
    const {sent} = renderShellCanvas('platform-answer');
    const button = await screen.findByRole('button', {name: 'Manage apps'});
    await userEvent.click(button);
    expect(await screen.findByRole('dialog', {name: 'App Library'})).toBeInTheDocument();
    await waitFor(() => expect(sent).toHaveLength(1));

    // The page is open; the same button behind it, raised again, is a second intent.
    await userEvent.click(button);
    await waitFor(() => expect(sent).toHaveLength(2));
    const part = sent[1].message.parts[0];
    expect(part.kind === 'data' ? part.data : {}).toMatchObject({
      action: {name: 'openAppLibrary', surfaceId: 'shell:main', context: {}},
    });
  });
});
