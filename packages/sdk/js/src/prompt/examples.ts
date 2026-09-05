/**
 * Worked examples of the synthesize data model, rendered into the system prompt the way the
 * agent kit renders a vendor's examples. Two shapes the ladder proves: a comparison of the same
 * things across two storefronts (Phase 4's join, identical shapes), and a timeline over the real
 * roster's recorded shapes (Phase 5's temporal merge): three unrelated data models, opaque ids, a
 * compound key, and one source whose time cannot join the axis. The examples teach form; the
 * composition doc teaches the vocabulary and the rules. Their trees are authored against the
 * shell catalog's basic components and its derived-value and sort primitives; the orchestrator's
 * tests validate them against that catalog, the sdk's against the contract.
 */
import type {SynthesizeDataModel} from '../synthesis.js';
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

const SHOP_A = 'shop-a:list';
const SHOP_B = 'shop-b:list';

const ref = (surface: string, pointer: string) => ({surface, pointer});
const value = (surface: string, pointer: string) => ({op: 'value', args: [ref(surface, pointer)]});

function comparisonRow(id: string) {
  return {
    name: value(SHOP_A, `/items[id="${id}"]/name`),
    priceA: value(SHOP_A, `/items[id="${id}"]/price`),
    priceB: value(SHOP_B, `/products[sku="${id}"]/price`),
    best: {
      op: 'min',
      args: [ref(SHOP_A, `/items[id="${id}"]/price`), ref(SHOP_B, `/products[sku="${id}"]/price`)],
    },
  };
}

/** The same cameras in two stores, under two shapes; a row per camera, best price first. */
export const CAMERA_COMPARISON: SynthesisExample = {
  name: 'camera-comparison',
  intent: 'compare camera prices across both stores',
  request:
    'One row per camera both stores list, with each store’s price side by side and the best of the two; best price first.',
  sources: [
    {
      surface: SHOP_A,
      appId: 'shop-a',
      displayName: 'Aperture & Co',
      data: {
        items: [
          {id: 'lumen-x100', name: 'Lumen X100', price: 1299, inStock: true},
          {id: 'verity-a7', name: 'Verity A7', price: 1849, inStock: false},
          {id: 'lumen-z6', name: 'Lumen Z6', price: 1599, inStock: true},
        ],
      },
    },
    {
      surface: SHOP_B,
      appId: 'shop-b',
      displayName: 'Northlight',
      data: {
        products: [
          {sku: 'verity-a7', title: 'Verity A7 body', price: 1799, available: 2},
          {sku: 'lumen-x100', title: 'Lumen X100', price: 1349, available: 0},
          {sku: 'orbit-gm3', title: 'Orbit GM3', price: 2099, available: 1},
        ],
      },
    },
  ],
  output: {
    tree: {
      components: [
        {id: 'root', component: 'Column', children: ['heading', 'sort', 'header', 'rows']},
        {id: 'heading', component: 'Text', variant: 'h3', text: 'Cameras in both stores'},
        {id: 'sort', component: 'SortControl', sort: {path: '/sorts/0'}},
        {id: 'header', component: 'Row', children: ['h-name', 'h-a', 'h-b', 'h-best']},
        {id: 'h-name', component: 'Text', variant: 'caption', text: 'Camera'},
        {id: 'h-a', component: 'Text', variant: 'caption', text: 'Aperture & Co'},
        {id: 'h-b', component: 'Text', variant: 'caption', text: 'Northlight'},
        {id: 'h-best', component: 'Text', variant: 'caption', text: 'Best price'},
        {id: 'rows', component: 'Column', children: {path: '/rows', componentId: 'row'}},
        {id: 'row', component: 'Row', children: ['c-name', 'c-a', 'c-b', 'c-best']},
        {id: 'c-name', component: 'DerivedValue', cell: {path: 'name'}},
        {id: 'c-a', component: 'DerivedValue', cell: {path: 'priceA'}, format: {kind: 'number'}},
        {id: 'c-b', component: 'DerivedValue', cell: {path: 'priceB'}, format: {kind: 'number'}},
        {id: 'c-best', component: 'DerivedValue', cell: {path: 'best'}, format: {kind: 'number'}},
      ],
    },
    dataModel: {
      rows: [comparisonRow('lumen-x100'), comparisonRow('verity-a7')],
    },
    sorts: [
      {
        path: '/rows',
        options: [
          {key: '/best', label: 'Best price'},
          {key: '/name', label: 'Camera'},
        ],
        key: '/best',
        direction: 'asc',
      },
    ],
    note: 'Lumen Z6 (Aperture & Co only) and Orbit GM3 (Northlight only) are left out: one store each, nothing to compare.',
  },
};

const GMAIL = 'gmail:needs-attention';
const GITHUB = 'github:prs-needing-attention';
const CALENDAR = 'calendar:needs-attention-today';

/** One timeline entry: the element's time and what it is, both passed through. */
function entry(surface: string, element: string, when: string, what: string) {
  return {when: value(surface, `${element}/${when}`), what: value(surface, `${element}/${what}`)};
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
        {id: 'timeline', component: 'Column', children: {path: '/timeline', componentId: 'item'}},
        {id: 'item', component: 'Row', children: ['i-when', 'i-what']},
        {id: 'i-when', component: 'DerivedValue', cell: {path: 'when'}},
        {id: 'i-what', component: 'DerivedValue', cell: {path: 'what'}},
        {id: 'calendar-heading', component: 'Text', variant: 'h4', text: 'Calendar'},
        {id: 'calendar', component: 'Column', children: {path: '/calendar', componentId: 'event'}},
        {id: 'event', component: 'Row', children: ['e-when', 'e-what']},
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
    note: 'Calendar’s times are times of day without a date (“11:00”, “11:30 – 12:15”) and cannot be ordered against the others’ timestamps, so its entries stand in their own group with the time shown beside each. No source carries an urgency; the timeline is ordered by time, latest first. Source is not a column: each value carries its own.',
  },
};

export const SYNTHESIS_EXAMPLES: readonly SynthesisExample[] = [CAMERA_COMPARISON, TODAY_TIMELINE];
