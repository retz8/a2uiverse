/**
 * Worked examples of the synthesize data model, rendered into the system prompt the way the
 * agent kit renders a vendor's examples. One shape: a timeline over the real roster's recorded
 * shapes (Phase 5's temporal merge) — three unrelated data models, opaque ids, a compound key, and
 * one source whose time cannot join the axis. The camera comparison is not among them (task-7.6
 * decision 9); the entity join's example follows the recorded entity-join turn (task 7.13). The
 * examples teach form; the rules doc (`synthesis.md`) teaches the
 * vocabulary and the rules. Their trees are authored against the Synthesizer's pruned shell
 * catalog; its tests put each through the whole validator.
 */
import type {SynthesizeDataModel} from './document.js';
import type {SynthesisSource} from './prompt.js';

export interface SynthesisExample {
  name: string;
  /** The user's utterance. */
  intent: string;
  /** The Planner's request on the synthesis slot. */
  request: string;
  sources: readonly SynthesisSource[];
  output: SynthesizeDataModel;
}

const ref = (surface: string, pointer: string) => ({surface, pointer});
const value = (surface: string, pointer: string) => ({op: 'value', args: [ref(surface, pointer)]});

const GMAIL = 'gmail:needs-attention';
const GITHUB = 'github:prs-needing-attention';
const CALENDAR = 'calendar:needs-attention-today';

/** One timeline entry: which source it came from, its time and what it is — all wiring. */
function entry(surface: string, element: string, when: string, what: string) {
  return {
    source: {op: 'source', args: [ref(surface, `${element}/${when}`)]},
    when: value(surface, `${element}/${when}`),
    what: value(surface, `${element}/${what}`),
  };
}

/**
 * The roster's "today" turn, over the shapes it actually paints: Gmail and GitHub carry a
 * date-and-time and share the axis; Calendar carries a time of day without a date, so its entries
 * stand in their own group with their time shown beside each rather than sorted. GitHub has no
 * single id, so its refs conjoin `repository` and `number`.
 */
export const TODAY_TIMELINE: SynthesisExample = {
  name: 'today-timeline',
  intent: 'What needs my attention today?',
  request:
    'A merged timeline of what needs my attention today, ordered by urgency, showing the source, a brief description, and a timestamp for each item. For GitHub, Gmail and Calendar.',
  sources: [
    {
      surface: GMAIL,
      appId: 'gmail',
      displayName: 'Gmail',
      data: {
        threads: [
          {
            id: '1a06f2abedf045ce',
            sender: 'elin.tanaka@example.com',
            subject: 'Estimate review: status before Friday',
            time: '2026-09-05 01:24 UTC',
          },
          {
            id: '1a06ef027e683325',
            sender: 'sara.moreau@example.com',
            subject: 'Draft agenda for the budget sync',
            time: '2026-09-05 00:20 UTC',
          },
        ],
      },
    },
    {
      surface: GITHUB,
      appId: 'github',
      displayName: 'GitHub',
      data: {
        prs: [
          {
            number: 2531,
            title: 'fix(web_core): classify nested dynamic unions',
            updatedAt: '2026-09-04T22:41:07Z',
            repository: 'a2ui-project/a2ui',
          },
          {
            number: 118,
            title: 'Retry a fragment subtree on validation failure',
            updatedAt: '2026-09-05T00:03:52Z',
            repository: 'a2ui-project/a2ui-samples',
          },
        ],
      },
    },
    {
      surface: CALENDAR,
      appId: 'calendar',
      displayName: 'Google Calendar',
      data: {
        waiting: [
          {
            id: 'ectktv0lkuauv7g3i8hgpmhelg',
            when: '11:00',
            summary: 'Design review — agenda surface',
          },
        ],
        clashes: [
          {
            id: '10fs9gng8s8tdtlejrpim3106g',
            when: '11:30 – 12:15',
            summary: 'Budget sync',
            note: 'Overlaps Design review — agenda surface',
          },
        ],
      },
    },
  ],
  output: {
    tree: {
      components: [
        {
          id: 'root',
          component: 'Column',
          children: ['heading', 'sort', 'timeline', 'calendar-heading', 'calendar'],
        },
        {id: 'heading', component: 'Text', variant: 'h3', text: 'Needs attention today'},
        {id: 'sort', component: 'SortControl', sort: {path: '/sorts/0'}},
        {
          id: 'timeline',
          component: 'Table',
          columns: ['Source', 'When', 'What'],
          children: {path: '/timeline', componentId: 'item'},
        },
        {id: 'item', component: 'TableRow', children: ['i-source', 'i-when', 'i-what']},
        {id: 'i-source', component: 'DerivedValue', cell: {path: 'source'}},
        {id: 'i-when', component: 'DerivedValue', cell: {path: 'when'}, format: {kind: 'datetime'}},
        {id: 'i-what', component: 'DerivedValue', cell: {path: 'what'}},
        {id: 'calendar-heading', component: 'Text', variant: 'h4', text: 'Calendar'},
        {
          id: 'calendar',
          component: 'Table',
          columns: ['When', 'What'],
          children: {path: '/calendar', componentId: 'event'},
        },
        {id: 'event', component: 'TableRow', children: ['e-when', 'e-what']},
        {id: 'e-when', component: 'DerivedValue', cell: {path: 'when'}},
        {id: 'e-what', component: 'DerivedValue', cell: {path: 'what'}},
      ],
    },
    dataModel: {
      timeline: [
        entry(GMAIL, '/threads[id="1a06f2abedf045ce"]', 'time', 'subject'),
        entry(GMAIL, '/threads[id="1a06ef027e683325"]', 'time', 'subject'),
        entry(GITHUB, '/prs[repository="a2ui-project/a2ui",number=2531]', 'updatedAt', 'title'),
        entry(
          GITHUB,
          '/prs[repository="a2ui-project/a2ui-samples",number=118]',
          'updatedAt',
          'title',
        ),
      ],
      calendar: [
        entry(CALENDAR, '/waiting[id="ectktv0lkuauv7g3i8hgpmhelg"]', 'when', 'summary'),
        entry(CALENDAR, '/clashes[id="10fs9gng8s8tdtlejrpim3106g"]', 'when', 'summary'),
      ],
    },
    sorts: [
      {
        path: '/timeline',
        options: [{key: '/when', label: 'Time'}],
        key: '/when',
        direction: 'desc',
      },
    ],
    note: 'Calendar’s times are times of day without a date (“11:00”, “11:30 – 12:15”) and cannot be ordered against the others’ timestamps, so its entries stand in their own group with the time shown beside each. No source carries an urgency; the timeline is ordered by time, latest first.',
  },
};

export const SYNTHESIS_EXAMPLES: readonly SynthesisExample[] = [TODAY_TIMELINE];
