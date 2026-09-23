/**
 * Worked examples of the layout surface (task-6.4 decision 8), rendered into the system prompt the
 * way the Synthesizer's are: a fan-out with a reserved merged view whose vendor requests ask for
 * the field it orders by; a merged view over one kind of thing, its brief stating the join
 * hypothesis over fixture cards (task-7.6 decision 2); a command over the same cards that one agent
 * answers alone, and a status question in one app's own noun merged over every agent holding a part
 * of it (task-7.8 decision 16); a platform answer that calls one reader and templates its
 * result; and a capability gap. The examples teach form; the rules doc
 * (`planner.md`) teaches the vocabulary and the rules. Their trees are authored against the
 * Planner's pruned shell catalog; its tests put each through the whole validator.
 */
import type {LayoutSurface} from './document.js';

export interface ExampleAgent {
  appId: string;
  name: string;
  description: string;
  skills: {name: string; description: string}[];
}

export interface ReaderCall {
  reader: string;
  result: unknown;
}

export interface LayoutExample {
  name: string;
  /** The user's utterance. */
  intent: string;
  /** The cards shown for the turn; `shell` is the platform's own. */
  agents: ExampleAgent[];
  /** The readers the example consulted, and what they returned. */
  readers?: ReaderCall[];
  output: LayoutSurface;
}

const GITHUB: ExampleAgent = {
  appId: 'github',
  name: 'GitHub',
  description: 'Repositories, pull requests and issues for the signed-in account.',
  skills: [
    {name: 'Pull requests', description: 'Lists, reviews and merges pull requests.'},
    {name: 'Issues', description: 'Lists and files issues.'},
  ],
};

const GMAIL: ExampleAgent = {
  appId: 'gmail',
  name: 'Gmail',
  description: 'The signed-in mailbox: inbox, threads, labels, drafts.',
  skills: [
    {name: 'Inbox', description: 'Shows unread and recent mail.'},
    {name: 'Compose', description: 'Drafts and sends mail.'},
  ],
};

const PLATFORM: ExampleAgent = {
  appId: 'shell',
  name: 'A2UIVerse Orchestrator',
  description:
    'The A2UIVerse hub: the platform that composes installed A2UI apps onto one canvas and answers questions about itself.',
  skills: [
    {name: 'What A2UIVerse is', description: 'Explains the platform itself.'},
    {
      name: 'What the canvas can do',
      description: 'Describes what can be done here and what is on the canvas.',
    },
    {name: 'Installed apps', description: 'Lists and describes the installed apps.'},
    {
      name: 'Finding and installing apps',
      description: 'Explains the Store and the App Library and points the user to them.',
    },
  ],
};

/** Two agents and the merged view over them; each request asks for the time the merge orders by. */
export const MORNING_FAN_OUT: LayoutExample = {
  name: 'morning-fan-out',
  intent: 'What needs my attention this morning?',
  agents: [GITHUB, GMAIL, PLATFORM],
  output: {
    dispatch: [
      {
        source: 'github',
        request:
          'Show the pull requests waiting on me — review requested or assigned — as a compact list. For each, include its title, repository, number, and the full date and time it was last updated.',
      },
      {
        source: 'gmail',
        request:
          'Show unread mail that needs a reply, as a compact list. For each thread, include the sender, the subject, and the full date and time it arrived.',
      },
      {
        source: 'shell',
        request:
          'One timeline of everything needing attention this morning across both sources, ordered by time, latest first: the source, when, and a one-line description of each item.',
      },
    ],
    tree: {
      components: [
        {id: 'root', component: 'Column', children: ['timeline', 'sources']},
        {id: 'timeline', component: 'Slot', source: 'shell'},
        {id: 'sources', component: 'Row', children: ['github', 'gmail']},
        {id: 'github', component: 'Slot', source: 'github', weight: 1},
        {id: 'gmail', component: 'Slot', source: 'gmail', weight: 1},
      ],
    },
    dataModel: {},
  },
};

const STORE: ExampleAgent = {
  appId: 'store',
  name: 'Harbor Goods',
  description:
    'The signed-in account’s orders at Harbor Goods: what was bought, when, and where each order stands.',
  skills: [
    {name: 'Orders', description: 'Lists orders with their items, status and shipments.'},
    {name: 'Returns', description: 'Starts and tracks returns.'},
  ],
};

const CARRIER: ExampleAgent = {
  appId: 'carrier',
  name: 'Swift Parcel',
  description: 'Parcels on their way to you: tracking, delivery estimates and delivery history.',
  skills: [{name: 'Tracking', description: 'Tracks parcels by tracking number.'}],
};

const MAILBOX: ExampleAgent = {
  appId: 'mailbox',
  name: 'Mailbox',
  description: 'The signed-in mailbox: inbox, threads and search.',
  skills: [{name: 'Inbox', description: 'Shows recent mail and finds threads.'}],
};

/**
 * A merged view over one kind of thing: the brief states the join hypothesis — the entity, the home
 * source whose orders are the rows, and each other agent's cue — and each request asks its agent,
 * in its own app's words, for the fields its cue needs. The entry carries the view's columns, the
 * agent each column shows, and the entity's noun in each source.
 */
export const ORDERS_JOIN: LayoutExample = {
  name: 'orders-join',
  intent: 'Where are my orders?',
  agents: [STORE, CARRIER, MAILBOX, PLATFORM],
  output: {
    dispatch: [
      {
        source: 'store',
        request:
          'Show my recent orders as a compact list. For each order, include its order number, what was bought, its status, the tracking number of each shipment, and the full date and time it was placed.',
      },
      {
        source: 'carrier',
        request:
          'Show the parcels on their way to me as a compact list. For each parcel, include its tracking number, the sender, its current status, and the estimated delivery date.',
      },
      {
        source: 'mailbox',
        request:
          'Show recent order and shipping mail as a compact list. For each thread, include the sender, the subject, any order number it mentions, and the full date and time it arrived.',
      },
      {
        source: 'shell',
        request:
          'Where each order stands: one row per Harbor Goods order — the home source — with what was bought, its status, where its parcel is, and the latest mail about it; newest order first. A Swift Parcel parcel is the order’s by the tracking number the order carries; a Mailbox thread is the order’s by the order number in its subject.',
        columns: ['Order', 'Items', 'Status', 'Parcel', 'Latest mail', 'Placed'],
        columnSources: ['store', 'store', 'store', 'carrier', 'mailbox', 'store'],
        join: {home: 'store', nouns: {store: 'orders', carrier: 'parcels', mailbox: 'threads'}},
      },
    ],
    tree: {
      components: [
        {id: 'root', component: 'Column', children: ['orders', 'sources']},
        {id: 'orders', component: 'Slot', source: 'shell'},
        {id: 'sources', component: 'Row', children: ['store', 'carrier', 'mailbox']},
        {id: 'store', component: 'Slot', source: 'store', weight: 1},
        {id: 'carrier', component: 'Slot', source: 'carrier', weight: 1},
        {id: 'mailbox', component: 'Slot', source: 'mailbox', weight: 1},
      ],
    },
    dataModel: {},
  },
};

/**
 * The orders join's other side: the same cards, a command inside one app's own object. The store
 * answers alone, with no merged view.
 */
export const ORDER_OPEN: LayoutExample = {
  name: 'order-open',
  intent: 'Open order 1042.',
  agents: [STORE, CARRIER, MAILBOX, PLATFORM],
  output: {
    dispatch: [
      {
        source: 'store',
        request:
          'Open order 1042 and show it in full: what was bought, its status, each shipment with its tracking number, and the full date and time it was placed.',
      },
    ],
    tree: {
      components: [
        {id: 'root', component: 'Column', children: ['order']},
        {id: 'order', component: 'Slot', source: 'store'},
      ],
    },
    dataModel: {},
  },
};

const CAREERS: ExampleAgent = {
  appId: 'careers',
  name: 'Careerline',
  description:
    'The signed-in account’s job applications on Careerline: the roles applied to and where each application stands.',
  skills: [
    {name: 'Applications', description: 'Lists applications with their company, role and status.'},
    {name: 'Job search', description: 'Finds open roles and saves them.'},
  ],
};

const AGENDA: ExampleAgent = {
  appId: 'agenda',
  name: 'Agenda',
  description: 'The signed-in calendar: upcoming events, meetings and calls.',
  skills: [{name: 'Upcoming', description: 'Shows the events coming up, with who they are with.'}],
};

/**
 * A status question in one app's own noun: the applications are Careerline's, and each holds parts
 * the other apps hold — its mail, its interviews. Every agent holding a part is dispatched and
 * merged; the parcel carrier holds none and stays out.
 */
export const APPLICATIONS_JOIN: LayoutExample = {
  name: 'applications-join',
  intent: 'How are my job applications going?',
  agents: [CAREERS, MAILBOX, AGENDA, CARRIER, PLATFORM],
  output: {
    dispatch: [
      {
        source: 'careers',
        request:
          'Show my job applications as a compact list. For each application, include the company, the role, its status, and the full date and time it was last updated.',
      },
      {
        source: 'mailbox',
        request:
          'Show recent mail from companies about job applications as a compact list. For each thread, include the sender, the subject, and the full date and time it arrived.',
      },
      {
        source: 'agenda',
        request:
          'Show my upcoming interviews and calls as a compact list. For each event, include its title, who it is with, and its full start date and time.',
      },
      {
        source: 'shell',
        request:
          'Where each application stands: one row per Careerline application — the home source — with the company, the role, its status, the next interview, and the latest mail about it; most recently updated first. A Mailbox thread is the application’s by the company named in its sender or subject; an Agenda event is the application’s by the company named in its title.',
        columns: ['Company', 'Role', 'Status', 'Next interview', 'Latest mail', 'Updated'],
        columnSources: ['careers', 'careers', 'careers', 'agenda', 'mailbox', 'careers'],
        join: {
          home: 'careers',
          nouns: {careers: 'applications', mailbox: 'threads', agenda: 'interviews'},
        },
      },
    ],
    tree: {
      components: [
        {id: 'root', component: 'Column', children: ['applications', 'sources']},
        {id: 'applications', component: 'Slot', source: 'shell'},
        {id: 'sources', component: 'Row', children: ['careers', 'mailbox', 'agenda']},
        {id: 'careers', component: 'Slot', source: 'careers', weight: 1},
        {id: 'mailbox', component: 'Slot', source: 'mailbox', weight: 1},
        {id: 'agenda', component: 'Slot', source: 'agenda', weight: 1},
      ],
    },
    dataModel: {},
  },
};

/** A platform question: one reader, its result templated into a table, an affordance into the App Library. */
export const INSTALLED_APPS_ANSWER: LayoutExample = {
  name: 'installed-apps-answer',
  intent: 'What apps do I have?',
  agents: [PLATFORM, GITHUB, GMAIL],
  readers: [
    {
      reader: 'installed_apps',
      result: [
        {
          id: 'github',
          displayName: 'GitHub',
          name: 'GitHub',
          description: 'Repositories, pull requests and issues for the signed-in account.',
          skills: [
            {name: 'Pull requests', description: 'Lists, reviews and merges pull requests.'},
            {name: 'Issues', description: 'Lists and files issues.'},
          ],
          reachable: true,
        },
        {
          id: 'gmail',
          displayName: 'Gmail',
          name: 'Gmail',
          description: 'The signed-in mailbox: inbox, threads, labels, drafts.',
          skills: [
            {name: 'Inbox', description: 'Shows unread and recent mail.'},
            {name: 'Compose', description: 'Drafts and sends mail.'},
          ],
          reachable: true,
        },
      ],
    },
  ],
  output: {
    dispatch: [],
    tree: {
      components: [
        {id: 'root', component: 'Column', children: ['heading', 'intro', 'apps', 'library']},
        {id: 'heading', component: 'Text', variant: 'h3', text: 'Your apps'},
        {
          id: 'intro',
          component: 'Text',
          variant: 'body',
          text: 'Two apps are installed. Ask about either at the palette, or ask both at once.',
        },
        {
          id: 'apps',
          component: 'Table',
          columns: ['App', 'What it does', 'Skills'],
          children: {path: '/apps', componentId: 'app'},
        },
        {id: 'app', component: 'TableRow', children: ['app-name', 'app-does', 'app-skills']},
        {id: 'app-name', component: 'Text', text: {path: 'name'}},
        {id: 'app-does', component: 'Text', text: {path: 'does'}},
        {id: 'app-skills', component: 'Text', text: {path: 'skills'}},
        {
          id: 'library',
          component: 'Button',
          child: 'library-label',
          action: {functionCall: {call: 'openAppLibrary', args: {}}},
        },
        {id: 'library-label', component: 'Text', text: 'Manage apps'},
      ],
    },
    dataModel: {
      apps: [
        {
          name: 'GitHub',
          does: 'Repositories, pull requests and issues for the signed-in account.',
          skills: 'Pull requests · Issues',
        },
        {
          name: 'Gmail',
          does: 'The signed-in mailbox: inbox, threads, labels, drafts.',
          skills: 'Inbox · Compose',
        },
      ],
    },
  },
};

/** A capability gap: nothing installed serves it, so one gap slot and nothing else — the tile is the shell's. */
export const CAPABILITY_GAP: LayoutExample = {
  name: 'capability-gap',
  intent: 'Book me a flight to Seoul next Friday.',
  agents: [PLATFORM, GMAIL],
  output: {
    dispatch: [{gap: 'flight booking'}],
    tree: {
      components: [
        {id: 'root', component: 'Column', children: ['flights']},
        {id: 'flights', component: 'Slot', gap: 'flight booking'},
      ],
    },
    dataModel: {},
  },
};

export const LAYOUT_EXAMPLES: readonly LayoutExample[] = [
  MORNING_FAN_OUT,
  ORDERS_JOIN,
  ORDER_OPEN,
  APPLICATIONS_JOIN,
  INSTALLED_APPS_ANSWER,
  CAPABILITY_GAP,
];
