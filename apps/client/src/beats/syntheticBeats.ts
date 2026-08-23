/**
 * Synthetic beat fixtures: hand-authored streams in the recorded `BeatFixture` format — two
 * plain paints, a validation-failure turn (partial paint → cleanup delete → final apology) and
 * a question paint (`ConfirmationDialog` root). They are deliberately NOT in `recordings/beats/`
 * and never enter `BEAT_FIXTURES`: they are inputs for the transition tests and the chrome
 * baselines, replayable by name through `?beat=` (see `SYNTHETIC_BEATS`). Recorded beats are
 * re-recorded through the orchestrator in 1.4.
 */
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import {CATALOG_ID} from 'github-catalog';
import type {BeatFixture} from './beatFixtures';

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
    default:
      return undefined;
  }
}

/** A question paint: a `ConfirmationDialog`-rooted surface — the overlay carrier. */
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
          messages: [msg({createSurface: {surfaceId: 'which-repo', catalogId: CATALOG_ID}})],
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
