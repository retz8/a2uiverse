/**
 * Worked examples of the synthesize data model, rendered into the system prompt the way the
 * agent kit renders a vendor's examples. Two shapes the ladder proves: a comparison of the same
 * things across two storefronts (Phase 4's join, identical shapes), and a timeline over sources
 * with unrelated data models (Phase 5's temporal merge). Their trees are authored against the
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

const CALENDAR = 'calendar:today-agenda';
const GMAIL = 'gmail:inbox';
const GITHUB = 'github:pr-queue';

/** Three unrelated data models on one time axis; counts per source; newest last. */
export const TODAY_TIMELINE: SynthesisExample = {
  name: 'today-timeline',
  intent: 'what does my day look like',
  request:
    'One timeline of today across the calendar, the inbox and the pull-request queue: each entry with its time and what it is, ordered by time, earliest first; how many entries each source contributes.',
  sources: [
    {
      surface: CALENDAR,
      appId: 'calendar',
      displayName: 'Google Calendar',
      data: {
        events: [
          {id: 'ev-standup', start: '2026-09-05T09:30:00+09:00', summary: 'Team standup'},
          {id: 'ev-review', start: '2026-09-05T11:00:00+09:00', summary: 'Design review'},
        ],
      },
    },
    {
      surface: GMAIL,
      appId: 'gmail',
      displayName: 'Gmail',
      data: {
        threads: [
          {
            id: 'th-1',
            sender: 'Priya Nakamura',
            subject: 'Budget questions before Friday',
            receivedAt: '2026-09-05T08:12:00+09:00',
          },
        ],
      },
    },
    {
      surface: GITHUB,
      appId: 'github',
      displayName: 'GitHub',
      data: {
        openPrs: [
          {
            number: 2531,
            title: 'fix(web_core): classify nested dynamic unions',
            updatedAt: '2026-09-05T10:05:00+09:00',
          },
        ],
      },
    },
  ],
  output: {
    tree: {
      components: [
        {id: 'root', component: 'Column', children: ['heading', 'sort', 'entries', 'counts']},
        {id: 'heading', component: 'Text', variant: 'h3', text: 'Today'},
        {id: 'sort', component: 'SortControl', sort: {path: '/sorts/0'}},
        {id: 'entries', component: 'Column', children: {path: '/entries', componentId: 'entry'}},
        {id: 'entry', component: 'Row', children: ['e-when', 'e-what']},
        {id: 'e-when', component: 'DerivedValue', cell: {path: 'when'}},
        {id: 'e-what', component: 'DerivedValue', cell: {path: 'what'}},
        {
          id: 'counts',
          component: 'Row',
          children: ['l-cal', 'n-cal', 'l-mail', 'n-mail', 'l-gh', 'n-gh'],
        },
        {id: 'l-cal', component: 'Text', variant: 'caption', text: 'Events'},
        {id: 'n-cal', component: 'DerivedValue', cell: {path: '/counts/events'}},
        {id: 'l-mail', component: 'Text', variant: 'caption', text: 'Threads'},
        {id: 'n-mail', component: 'DerivedValue', cell: {path: '/counts/threads'}},
        {id: 'l-gh', component: 'Text', variant: 'caption', text: 'Pull requests'},
        {id: 'n-gh', component: 'DerivedValue', cell: {path: '/counts/pullRequests'}},
      ],
    },
    dataModel: {
      entries: [
        {
          when: value(GMAIL, '/threads[id="th-1"]/receivedAt'),
          what: value(GMAIL, '/threads[id="th-1"]/subject'),
        },
        {
          when: value(CALENDAR, '/events[id="ev-standup"]/start'),
          what: value(CALENDAR, '/events[id="ev-standup"]/summary'),
        },
        {
          when: value(GITHUB, '/openPrs[number=2531]/updatedAt'),
          what: value(GITHUB, '/openPrs[number=2531]/title'),
        },
        {
          when: value(CALENDAR, '/events[id="ev-review"]/start'),
          what: value(CALENDAR, '/events[id="ev-review"]/summary'),
        },
      ],
      counts: {
        events: {
          op: 'count',
          args: [
            ref(CALENDAR, '/events[id="ev-standup"]'),
            ref(CALENDAR, '/events[id="ev-review"]'),
          ],
        },
        threads: {op: 'count', args: [ref(GMAIL, '/threads[id="th-1"]')]},
        pullRequests: {op: 'count', args: [ref(GITHUB, '/openPrs[number=2531]')]},
      },
    },
    sorts: [
      {
        path: '/entries',
        options: [{key: '/when', label: 'Time'}],
        key: '/when',
        direction: 'asc',
      },
    ],
    note: '',
  },
};

export const SYNTHESIS_EXAMPLES: readonly SynthesisExample[] = [CAMERA_COMPARISON, TODAY_TIMELINE];
