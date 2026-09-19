/**
 * Synthetic beat fixtures: hand-authored streams in the recorded `BeatFixture` format — two
 * plain paints, a validation-failure turn (partial paint → cleanup delete → final apology), a
 * declared question paint, a composed turn (shell layout, one slot filling,
 * one flipping to failed), a synthesis turn (two storefronts merged, then re-synthesized
 * after an in-place reorder), a platform answer (the shell answering from its own data model)
 * and a capability gap (the fixed tile). They are deliberately NOT in `recordings/beats/`
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
  SHOP_B_NAME,
  shopAMessages,
  shopBMessages,
  SYNTHESIS_SOURCE,
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

/** One slot of a layout: a vendor's, the reserved synthesis slot (`shell`), or a gap. */
interface LayoutSlot {
  appId: string;
  name: string;
  state?: 'pending' | 'failed' | 'collapsed';
  /** The synthesis slot: shell content, no attribution around it (task-5.5 decision 1). */
  shell?: boolean;
  weight?: number;
}

/**
 * The layout surface as the shell painter emits it (task-6.4 decisions 1, 3, 11): the slots
 * laid along one axis, each vendor slot the `child` of an `Attribution` naming its source and
 * carrying its weight, the wrapper standing where the slot stood in the parent; the synthesis
 * slot bare. Ids are the model's — here `slot-<source>` and the painter's `attribution-` prefix.
 */
function layoutComponents(
  slots: readonly LayoutSlot[],
  axis: 'Row' | 'Column' = 'Column',
): Array<Record<string, unknown>> {
  const idOf = (s: LayoutSlot) => `slot-${s.appId}`;
  return [
    {
      id: 'root',
      component: axis,
      children: slots.map(s => (s.shell ? idOf(s) : `attribution-${idOf(s)}`)),
    },
    ...slots.flatMap((s): Array<Record<string, unknown>> => {
      const weight = s.weight !== undefined ? {weight: s.weight} : {};
      const slot = {
        id: idOf(s),
        component: 'Slot',
        source: s.appId,
        state: s.state ?? 'pending',
        label: s.name,
        ...weight,
      };
      if (s.shell) return [{...slot, content: 'shell'}];
      return [
        {
          id: `attribution-${idOf(s)}`,
          component: 'Attribution',
          displayName: s.name,
          appId: s.appId,
          child: idOf(s),
          ...weight,
        },
        slot,
      ];
    }),
  ];
}

/** The hub's first paint of a composed turn: createSurface, then the whole layout. */
function layoutPaint(slots: readonly LayoutSlot[], axis?: 'Row' | 'Column'): A2uiMessage[] {
  return [
    msg({createSurface: {surfaceId: 'shell:main', catalogId: SHELL_CATALOG_ID}}),
    msg({updateComponents: {surfaceId: 'shell:main', components: layoutComponents(slots, axis)}}),
  ];
}

/** An in-turn shell repaint: the whole tree again, a slot's state flipped (task-6.4 decision 11). */
function layoutRepaint(slots: readonly LayoutSlot[], axis?: 'Row' | 'Column'): A2uiMessage[] {
  return [
    msg({updateComponents: {surfaceId: 'shell:main', components: layoutComponents(slots, axis)}}),
  ];
}

const GITHUB: LayoutSlot = {appId: 'github', name: 'GitHub'};
const GMAIL: LayoutSlot = {appId: 'gmail', name: 'Gmail'};

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
          messages: layoutPaint([GITHUB, GMAIL]),
          texts: [],
        },
        // One agent answers: its fragment fills its own slot, namespaced by the hub.
        {
          offsetMs: 150,
          stamp: {source: 'github', role: 'fragment'},
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
          stamp: {source: 'gmail', role: 'fragment'},
          messages: [],
          texts: ['I could not reach the mailbox.'],
        },
        // The other never delivers: the hub flips its slot by repainting its own surface.
        {
          offsetMs: 300,
          stamp: {source: 'shell', role: 'shell'},
          messages: layoutRepaint([GITHUB, {...GMAIL, state: 'failed'}]),
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
          messages: layoutPaint([GITHUB]),
          texts: [],
        },
        {
          offsetMs: 120,
          stamp: {source: 'github', role: 'fragment'},
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
          messages: layoutPaint([GITHUB, GMAIL]),
          texts: [],
        },
        {
          offsetMs: 120,
          stamp: {source: 'github', role: 'fragment'},
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
          stamp: {source: 'gmail', role: 'fragment'},
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
 * attribution around it (task-5.5 decision 1) — then one attributed slot per store, in a row.
 */
const SYNTHESIS_SLOTS: LayoutSlot[] = [
  {appId: SYNTHESIS_SOURCE, name: 'Synthesis', shell: true},
  {appId: 'shop-a', name: SHOP_A_NAME},
  {appId: 'shop-b', name: SHOP_B_NAME},
];

/**
 * A synthesis turn as the hub streams one (tasks 4.4, 5.4), over the sdk's camera comparison
 * example (task-5.5 decision 7): the shell reserves the synthesis slot at first paint; two
 * storefronts of unrelated shapes fill their slots; the model-authored view is painted into the
 * reserved slot with its payload beside the stamp. A second, action turn reorders shop A's list
 * in place on the vendor's own event, and — every ref being keyed — nothing goes stale and no
 * re-synthesis follows (phase decision 6). Both storefronts paint in the shell catalog here for control —
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
          messages: layoutPaint(SYNTHESIS_SLOTS, 'Row'),
          texts: [],
        },
        {
          offsetMs: 400,
          stamp: {source: 'shop-a', role: 'fragment'},
          messages: shopAMessages(SHELL_CATALOG_ID),
          texts: [],
        },
        {
          offsetMs: 700,
          stamp: {source: 'shop-b', role: 'fragment'},
          messages: shopBMessages(SHELL_CATALOG_ID),
          texts: [],
        },
        // Dead air: the Synthesizer's model call. Then the merged view claims its slot.
        {
          offsetMs: 2600,
          stamp: {source: 'shell', role: 'fragment'},
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
        // The vendor's own event reorders the list. Keyed refs survive it: the view holds.
        {
          offsetMs: 0,
          stamp: {source: 'shop-a', role: 'fragment'},
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
    case 'platform-answer':
      return PLATFORM_ANSWER_BEAT;
    case 'gap':
      return GAP_BEAT;
    default:
      return undefined;
  }
}

/**
 * A platform answer (phase-6 decisions 2, 8): the Planner answers "what apps do I have?" itself,
 * in the shell catalog, from the installed-apps reader. No slot, no vendor: `shell:main` carries
 * a data model of literals — the apps as plain values — and a tree bound to it through the
 * catalog's list template, with a button into the App Library. The hub sends the data model
 * ahead of the tree (task-6.4 decision 11), and the turn closes right after first paint.
 */
export const PLATFORM_ANSWER_BEAT: BeatFixture = {
  ...base,
  name: 'synthetic-platform-answer',
  beat: 107,
  title: 'Platform answer',
  prompt: 'what apps do I have?',
  turns: [
    {
      taskId: 'synthetic-platform-answer',
      kind: 'utterance',
      prompt: 'what apps do I have?',
      action: null,
      outcome: 'completed',
      durationMs: 200,
      batches: [
        {
          offsetMs: 0,
          stamp: {source: 'shell', role: 'shell'},
          messages: [
            msg({createSurface: {surfaceId: 'shell:main', catalogId: SHELL_CATALOG_ID}}),
            msg({
              updateDataModel: {
                surfaceId: 'shell:main',
                value: {
                  apps: [
                    {name: 'GitHub', skills: 'Pull requests, issues, reviews'},
                    {name: 'Gmail', skills: 'Inbox, search, drafting'},
                    {name: 'Google Calendar', skills: 'Events, RSVPs, scheduling'},
                  ],
                },
              },
            }),
            msg({
              updateComponents: {
                surfaceId: 'shell:main',
                components: [
                  {id: 'root', component: 'Column', children: ['heading', 'apps', 'manage']},
                  {id: 'heading', component: 'Text', text: 'Three apps are installed.'},
                  {
                    id: 'apps',
                    component: 'Table',
                    columns: ['App', 'What it does'],
                    children: {path: '/apps', componentId: 'app-row'},
                  },
                  {id: 'app-row', component: 'TableRow', children: ['app-name', 'app-skills']},
                  {id: 'app-name', component: 'Text', text: {path: 'name'}},
                  {id: 'app-skills', component: 'Text', text: {path: 'skills'}},
                  {
                    id: 'manage',
                    component: 'Button',
                    child: 'manage-label',
                    action: {functionCall: {call: 'openAppLibrary', args: {}}},
                  },
                  {id: 'manage-label', component: 'Text', text: 'Manage apps'},
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
 * A capability gap (phase-6 decision 6): nothing installed serves "book me a flight", so the
 * Planner names the gap and places a `Slot` for it; the catalog draws the capability tile, whose
 * one action opens the Store with the gap as the query. No vendor is dispatched, no prose is
 * painted, and the turn closes at first paint.
 */
export const GAP_BEAT: BeatFixture = {
  ...base,
  name: 'synthetic-gap',
  beat: 108,
  title: 'Capability gap',
  prompt: 'book me a flight to Tokyo',
  turns: [
    {
      taskId: 'synthetic-gap',
      kind: 'utterance',
      prompt: 'book me a flight to Tokyo',
      action: null,
      outcome: 'completed',
      durationMs: 200,
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
                  {id: 'root', component: 'Column', children: ['flight']},
                  {id: 'flight', component: 'Slot', gap: 'flight booking'},
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
