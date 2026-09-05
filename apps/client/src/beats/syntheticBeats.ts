/**
 * Synthetic beat fixtures: hand-authored streams in the recorded `BeatFixture` format — two
 * plain paints, a validation-failure turn (partial paint → cleanup delete → final apology), a
 * declared question paint, a composed turn (shell layout, one slot filling,
 * one flipping to failed) and a synthesis turn (two storefronts merged, then re-synthesized
 * after an in-place reorder). They are deliberately NOT in `recordings/beats/`
 * and never enter `BEAT_FIXTURES`: they are inputs for the transition tests and the chrome
 * baselines, replayable by name through `?beat=` (see `SYNTHETIC_BEATS`). Recorded beats are
 * re-recorded through the orchestrator in 1.4.
 */
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import {CATALOG_ID} from 'github-catalog';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import type {BeatFixture} from './beatFixtures';
import {
  DOCUMENT,
  PAYLOAD,
  SHOP_A,
  SHOP_A_NAME,
  SHOP_A_REVERSED,
  SHOP_B,
  SHOP_B_NAME,
  shopAMessages,
  shopBMessages,
  SYNTHESIS_SLOT,
  synthesisMessages,
} from './synthesisFixture';

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;

const base = {
  model: 'synthetic',
  recordedAt: '2026-08-14T00:00:00Z',
  contextId: 'ctx-synthetic',
  chainedFrom: null,
};

/**
 * The wire shape of a server-side validation failure, as the agent's `_teardown` produces it:
 * the partial paint streams, then the cleanup `deleteSurface`, then the apology prose.
 */
export const VALIDATION_FAILURE_BEAT: BeatFixture = {
  ...base,
  name: 'synthetic-validation-failure',
  beat: 101,
  title: 'Validation-failure turn',
  prompt: 'show me something the agent cannot build',
  turns: [
    {
      taskId: 'synthetic-failure',
      kind: 'utterance',
      prompt: 'show me something the agent cannot build',
      action: null,
      outcome: 'apology',
      durationMs: 300,
      batches: [
        {
          offsetMs: 0,
          messages: [msg({createSurface: {surfaceId: 'doomed-view', catalogId: CATALOG_ID}})],
          texts: [],
        },
        {
          offsetMs: 100,
          messages: [
            msg({
              updateComponents: {
                surfaceId: 'doomed-view',
                components: [{id: 'root', component: 'Text', text: 'half-built content'}],
              },
            }),
          ],
          texts: [],
        },
        {
          offsetMs: 200,
          messages: [msg({deleteSurface: {surfaceId: 'doomed-view'}})],
          texts: ['I could not build that view.'],
        },
      ],
    },
  ],
};

/** A plain painted surface — what an ordinary completed turn leaves on the stage. */
function plainPaint(name: string, surfaceId: string, prompt: string, heading: string): BeatFixture {
  return {
    ...base,
    name,
    beat: 0,
    title: heading,
    prompt,
    turns: [
      {
        taskId: name,
        kind: 'utterance',
        prompt,
        action: null,
        outcome: 'completed',
        durationMs: 200,
        batches: [
          {
            offsetMs: 0,
            messages: [msg({createSurface: {surfaceId, catalogId: CATALOG_ID}})],
            texts: [],
          },
          {
            offsetMs: 100,
            messages: [
              msg({
                updateComponents: {
                  surfaceId,
                  components: [
                    {id: 'root', component: 'Stack', direction: 'vertical', children: ['h', 'p']},
                    {id: 'h', component: 'Heading', text: heading},
                    {id: 'p', component: 'Text', text: `Painted for “${prompt}”.`},
                  ],
                },
              }),
              msg({beginRendering: {surfaceId, root: 'root'}}),
            ],
            texts: [],
          },
        ],
      },
    ],
  };
}

export const PLAIN_PAINT_BEAT = plainPaint(
  'synthetic-plain',
  'plain-view',
  'show me my pull requests',
  'Pull requests',
);
export const SECOND_PLAIN_PAINT_BEAT = plainPaint(
  'synthetic-plain-2',
  'plain-view-2',
  'show me my notifications',
  'Notifications',
);

/**
 * A composed turn as the hub streams one: the shell paints its layout with both slots pending
 * before any agent has answered, one fragment fills its slot, and the other slot flips to failed
 * by shell repaint when its agent does not deliver. Both slots' surfaces would carry their own
 * vendor catalog in life; here the one that paints uses the only vendor catalog installed.
 */
export const COMPOSED_BEAT: BeatFixture = {
  ...base,
  name: 'synthetic-composed',
  beat: 103,
  title: 'Composed turn',
  prompt: 'what needs my attention',
  turns: [
    {
      taskId: 'synthetic-composed',
      kind: 'utterance',
      prompt: 'what needs my attention',
      action: null,
      outcome: 'completed',
      durationMs: 400,
      batches: [
        // First paint: layout and pending slots, before any dispatch has answered.
        {
          offsetMs: 0,
          stamp: {source: 'shell', role: 'shell'},
          messages: [
            msg({createSurface: {surfaceId: 'shell:main', catalogId: SHELL_CATALOG_ID}}),
            msg({
              updateComponents: {
                surfaceId: 'shell:main',
                components: [
                  {
                    id: 'root',
                    component: 'Column',
                    children: ['wrap-slot-github', 'wrap-slot-gmail'],
                  },
                  {
                    id: 'wrap-slot-github',
                    component: 'Column',
                    children: ['attr-slot-github', 'slot-github'],
                  },
                  {
                    id: 'attr-slot-github',
                    component: 'Attribution',
                    displayName: 'GitHub',
                    appId: 'github',
                  },
                  {
                    id: 'slot-github',
                    component: 'Slot',
                    name: 'slot-github',
                    state: 'pending',
                    label: 'GitHub',
                  },
                  {
                    id: 'wrap-slot-gmail',
                    component: 'Column',
                    children: ['attr-slot-gmail', 'slot-gmail'],
                  },
                  {
                    id: 'attr-slot-gmail',
                    component: 'Attribution',
                    displayName: 'Gmail',
                    appId: 'gmail',
                  },
                  {
                    id: 'slot-gmail',
                    component: 'Slot',
                    name: 'slot-gmail',
                    state: 'pending',
                    label: 'Gmail',
                  },
                ],
              },
            }),
          ],
          texts: [],
        },
        // One agent answers: its fragment fills its own slot, namespaced by the hub.
        {
          offsetMs: 150,
          stamp: {source: 'github', slot: 'slot-github', role: 'fragment'},
          messages: [
            msg({createSurface: {surfaceId: 'github:pr-list', catalogId: CATALOG_ID}}),
            msg({
              updateComponents: {
                surfaceId: 'github:pr-list',
                components: [
                  {id: 'root', component: 'Stack', direction: 'vertical', children: ['h']},
                  {id: 'h', component: 'Heading', text: 'Pull requests'},
                ],
              },
            }),
            msg({beginRendering: {surfaceId: 'github:pr-list', root: 'root'}}),
          ],
          // Prose arrives in stream chunks — a sentence splits mid-word across events.
          texts: ['Here are the 4 P', 'Rs awaiting your review.'],
        },
        // A source can speak without painting. This one answers in prose and never delivers a
        // fragment, which is why prose lives in the shell's region and not inside a slot.
        {
          offsetMs: 220,
          stamp: {source: 'gmail', slot: 'slot-gmail', role: 'fragment'},
          messages: [],
          texts: ['I could not reach the mailbox.'],
        },
        // The other never delivers: the hub flips its slot by repainting its own surface.
        {
          offsetMs: 300,
          stamp: {source: 'shell', role: 'shell'},
          messages: [
            msg({
              updateComponents: {
                surfaceId: 'shell:main',
                components: [
                  {
                    id: 'slot-gmail',
                    component: 'Slot',
                    name: 'slot-gmail',
                    state: 'failed',
                    label: 'Gmail',
                  },
                ],
              },
            }),
          ],
          texts: [],
        },
      ],
    },
  ],
};

/**
 * The degenerate composition: one agent, one slot. Structurally identical to the multi-slot
 * case — there is no second render path — so the only difference is visual weight.
 */
export const COMPOSED_SOLO_BEAT: BeatFixture = {
  ...base,
  name: 'synthetic-composed-solo',
  beat: 104,
  title: 'Composed turn, one slot',
  prompt: 'show me my pull requests',
  turns: [
    {
      taskId: 'synthetic-composed-solo',
      kind: 'utterance',
      prompt: 'show me my pull requests',
      action: null,
      outcome: 'completed',
      durationMs: 250,
      batches: [
        {
          offsetMs: 0,
          stamp: {source: 'shell', role: 'shell'},
          messages: [
            msg({createSurface: {surfaceId: 'shell:main', catalogId: SHELL_CATALOG_ID}}),
            msg({
              updateComponents: {
                surfaceId: 'shell:main',
                components: [
                  {id: 'root', component: 'Column', children: ['wrap-slot-github']},
                  {
                    id: 'wrap-slot-github',
                    component: 'Column',
                    children: ['attr-slot-github', 'slot-github'],
                  },
                  {
                    id: 'attr-slot-github',
                    component: 'Attribution',
                    displayName: 'GitHub',
                    appId: 'github',
                  },
                  {
                    id: 'slot-github',
                    component: 'Slot',
                    name: 'slot-github',
                    state: 'pending',
                    label: 'GitHub',
                  },
                ],
              },
            }),
          ],
          texts: [],
        },
        {
          offsetMs: 120,
          stamp: {source: 'github', slot: 'slot-github', role: 'fragment'},
          messages: [
            msg({createSurface: {surfaceId: 'github:pr-list', catalogId: CATALOG_ID}}),
            msg({
              updateComponents: {
                surfaceId: 'github:pr-list',
                components: [
                  {id: 'root', component: 'Stack', direction: 'vertical', children: ['h']},
                  {id: 'h', component: 'Heading', text: 'Pull requests'},
                ],
              },
            }),
            msg({beginRendering: {surfaceId: 'github:pr-list', root: 'root'}}),
          ],
          texts: [],
        },
      ],
    },
  ],
};

/**
 * A composed turn where one fragment asks a question. It does not get the overlay — that would
 * re-parent it out of its slot and let one vendor block a canvas it shares. The shell grants
 * promotion instead: that slot is raised, the rest dimmed, and the fragment never moves.
 */
export const COMPOSED_QUESTION_BEAT: BeatFixture = {
  ...base,
  name: 'synthetic-composed-question',
  beat: 105,
  title: 'Composed turn with a question',
  prompt: 'what needs my attention',
  turns: [
    {
      taskId: 'synthetic-composed-question',
      kind: 'utterance',
      prompt: 'what needs my attention',
      action: null,
      outcome: 'completed',
      durationMs: 400,
      batches: [
        {
          offsetMs: 0,
          stamp: {source: 'shell', role: 'shell'},
          messages: [
            msg({createSurface: {surfaceId: 'shell:main', catalogId: SHELL_CATALOG_ID}}),
            msg({
              updateComponents: {
                surfaceId: 'shell:main',
                components: [
                  {
                    id: 'root',
                    component: 'Column',
                    children: ['wrap-slot-github', 'wrap-slot-gmail'],
                  },
                  {
                    id: 'wrap-slot-github',
                    component: 'Column',
                    children: ['attr-slot-github', 'slot-github'],
                  },
                  {
                    id: 'attr-slot-github',
                    component: 'Attribution',
                    displayName: 'GitHub',
                    appId: 'github',
                  },
                  {
                    id: 'slot-github',
                    component: 'Slot',
                    name: 'slot-github',
                    state: 'pending',
                    label: 'GitHub',
                  },
                  {
                    id: 'wrap-slot-gmail',
                    component: 'Column',
                    children: ['attr-slot-gmail', 'slot-gmail'],
                  },
                  {
                    id: 'attr-slot-gmail',
                    component: 'Attribution',
                    displayName: 'Gmail',
                    appId: 'gmail',
                  },
                  {
                    id: 'slot-gmail',
                    component: 'Slot',
                    name: 'slot-gmail',
                    state: 'pending',
                    label: 'Gmail',
                  },
                ],
              },
            }),
          ],
          texts: [],
        },
        {
          offsetMs: 120,
          stamp: {source: 'github', slot: 'slot-github', role: 'fragment'},
          messages: [
            msg({createSurface: {surfaceId: 'github:pr-list', catalogId: CATALOG_ID}}),
            msg({
              updateComponents: {
                surfaceId: 'github:pr-list',
                components: [
                  {id: 'root', component: 'Stack', direction: 'vertical', children: ['h']},
                  {id: 'h', component: 'Heading', text: 'Pull requests'},
                ],
              },
            }),
            msg({beginRendering: {surfaceId: 'github:pr-list', root: 'root'}}),
          ],
          texts: [],
        },
        {
          offsetMs: 240,
          stamp: {source: 'gmail', slot: 'slot-gmail', role: 'fragment'},
          messages: [
            // The declared marker, not a dialog component: promotion raises a question where it
            // already is, so the question renders inline in its slot rather than as an overlay.
            msg({paintMeta: {surfaceId: 'gmail:ask', kind: 'question'}}),
            msg({createSurface: {surfaceId: 'gmail:ask', catalogId: SHELL_CATALOG_ID}}),
            msg({
              updateComponents: {
                surfaceId: 'gmail:ask',
                components: [
                  {id: 'root', component: 'Column', children: ['q', 'hint']},
                  {id: 'q', component: 'Text', text: 'Which account?'},
                  {id: 'hint', component: 'Text', text: 'Work, or personal?'},
                ],
              },
            }),
          ],
          texts: [],
        },
      ],
    },
  ],
};

/**
 * The shell's layout for a synthesis turn: the synthesis slot first — shell content, no
 * attribution beside it (task-5.5 decision 1) — then one attributed slot per store.
 */
function synthesisShellComponents(
  slots: readonly {slot: string; appId: string; name: string; shell?: boolean}[],
): Array<Record<string, unknown>> {
  return [
    {
      id: 'root',
      component: 'Frame',
      direction: 'row',
      children: slots.map(s => (s.shell ? s.slot : `wrap-${s.slot}`)),
    },
    ...slots.flatMap((s): Array<Record<string, unknown>> =>
      s.shell
        ? [
            {
              id: s.slot,
              component: 'Slot',
              name: s.slot,
              state: 'pending',
              label: s.name,
              content: 'shell',
            },
          ]
        : [
            {id: `wrap-${s.slot}`, component: 'Column', children: [`attr-${s.slot}`, s.slot]},
            {id: `attr-${s.slot}`, component: 'Attribution', displayName: s.name, appId: s.appId},
            {id: s.slot, component: 'Slot', name: s.slot, state: 'pending', label: s.name},
          ],
    ),
  ];
}

const SYNTHESIS_SLOTS = [
  {slot: SYNTHESIS_SLOT, appId: 'shell', name: 'Synthesis', shell: true},
  {slot: 'slot-shop-a', appId: 'shop-a', name: SHOP_A_NAME},
  {slot: 'slot-shop-b', appId: 'shop-b', name: SHOP_B_NAME},
];

/**
 * A synthesis turn as the hub streams one (tasks 4.4, 5.4), over the sdk's camera comparison
 * example (task-5.5 decision 7): the shell reserves the synthesis slot at first paint; two
 * storefronts of unrelated shapes fill their slots, each stamped with its partition's
 * generation; the model-authored view is painted into the reserved slot with its payload beside
 * the stamp. A second, action turn reorders shop A's list in place: the bump arrives on the
 * vendor's own event, and — every ref being keyed — nothing goes stale and no re-synthesis
 * follows (phase decision 6). Both storefronts paint in the shell catalog here for control —
 * the stream is authored, not recorded, and the mocks' catalogs would add nothing it tests.
 */
export const SYNTHESIS_BEAT: BeatFixture = {
  ...base,
  name: 'synthetic-synthesis',
  beat: 106,
  title: 'Synthesis turn',
  prompt: 'compare camera prices across both stores',
  turns: [
    {
      taskId: 'synthetic-synthesis',
      kind: 'utterance',
      prompt: 'compare camera prices across both stores',
      action: null,
      outcome: 'completed',
      durationMs: 2600,
      batches: [
        {
          offsetMs: 0,
          stamp: {source: 'shell', role: 'shell'},
          messages: [
            msg({createSurface: {surfaceId: 'shell:main', catalogId: SHELL_CATALOG_ID}}),
            msg({
              updateComponents: {
                surfaceId: 'shell:main',
                components: synthesisShellComponents(SYNTHESIS_SLOTS),
              },
            }),
          ],
          texts: [],
        },
        {
          offsetMs: 400,
          stamp: {
            source: 'shop-a',
            slot: 'slot-shop-a',
            role: 'fragment',
            generations: {[SHOP_A]: 1},
          },
          messages: shopAMessages(SHELL_CATALOG_ID),
          texts: [],
        },
        {
          offsetMs: 700,
          stamp: {
            source: 'shop-b',
            slot: 'slot-shop-b',
            role: 'fragment',
            generations: {[SHOP_B]: 1},
          },
          messages: shopBMessages(SHELL_CATALOG_ID),
          texts: [],
        },
        // Dead air: the Synthesizer's model call. Then the merged view claims its slot.
        {
          offsetMs: 2600,
          stamp: {source: 'shell', slot: SYNTHESIS_SLOT, role: 'fragment'},
          messages: synthesisMessages(DOCUMENT, SHELL_CATALOG_ID),
          synthesis: PAYLOAD,
          texts: [],
        },
      ],
    },
    {
      taskId: 'synthetic-synthesis-reorder',
      kind: 'surface-action',
      prompt: '',
      action: {
        name: 'reorder',
        context: {},
        surfaceId: SHOP_A,
        sourceComponentId: 'list',
        timestamp: '2026-09-04T00:00:00Z',
      },
      outcome: 'completed',
      durationMs: 300,
      batches: [
        // The vendor's own event carries the bump. Keyed refs survive it: the view holds.
        {
          offsetMs: 0,
          stamp: {
            source: 'shop-a',
            slot: 'slot-shop-a',
            role: 'fragment',
            generations: {[SHOP_A]: 2},
          },
          messages: [
            msg({
              updateDataModel: {
                surfaceId: SHOP_A,
                path: '/items',
                value: SHOP_A_REVERSED.map(item => ({...item})),
              },
            }),
          ],
          texts: [],
        },
      ],
    },
  ],
};

/** Resolve a synthetic beat by the name `?beat=` accepts. */
export function syntheticBeat(name: string): BeatFixture | undefined {
  switch (name) {
    case 'plain':
      return PLAIN_PAINT_BEAT;
    case 'plain-2':
      return SECOND_PLAIN_PAINT_BEAT;
    case 'validation':
      return VALIDATION_FAILURE_BEAT;
    case 'question':
      return QUESTION_BEAT;
    case 'composed':
      return COMPOSED_BEAT;
    case 'composed-solo':
      return COMPOSED_SOLO_BEAT;
    case 'composed-question':
      return COMPOSED_QUESTION_BEAT;
    case 'synthesis':
      return SYNTHESIS_BEAT;
    default:
      return undefined;
  }
}

/** A question paint: declared `kind="question"`, carried by a ConfirmationDialog root. */
export const QUESTION_BEAT: BeatFixture = {
  ...base,
  name: 'synthetic-question',
  beat: 102,
  title: 'Question paint',
  prompt: 'do the ambiguous thing',
  turns: [
    {
      taskId: 'synthetic-question',
      kind: 'utterance',
      prompt: 'do the ambiguous thing',
      action: null,
      outcome: 'completed',
      durationMs: 200,
      batches: [
        {
          offsetMs: 0,
          messages: [
            // The agent declares a question; the ConfirmationDialog root is its own convention,
            // validated agent-side, and no longer something the canvas infers.
            msg({paintMeta: {surfaceId: 'which-repo', kind: 'question'}}),
            msg({createSurface: {surfaceId: 'which-repo', catalogId: CATALOG_ID}}),
          ],
          texts: [],
        },
        {
          offsetMs: 100,
          messages: [
            msg({
              updateComponents: {
                surfaceId: 'which-repo',
                components: [
                  {
                    id: 'root',
                    component: 'ConfirmationDialog',
                    title: 'Which repository?',
                    confirmButtonContent: 'a2ui-project/a2ui',
                    cancelButtonContent: 'Somewhere else',
                    confirmAction: {event: {name: 'choose-a2ui-repo', context: {}}},
                    cancelAction: {event: {name: 'choose-other-repo', context: {}}},
                    children: ['body'],
                  },
                  {
                    id: 'body',
                    component: 'Text',
                    text: 'You have PRs in more than one repository.',
                  },
                ],
              },
            }),
          ],
          texts: [],
        },
      ],
    },
  ],
};
