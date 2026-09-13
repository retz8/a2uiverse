/**
 * Worked examples of the layout surface (task-6.4 decision 8), rendered into the system prompt the
 * way the Synthesizer's are: the three kinds of turn the phase proves — a fan-out with a reserved
 * merged view whose vendor requests ask for the join field, a platform answer that calls one reader
 * and templates its result, and a capability gap. The examples teach form; the rules doc
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
        {id: 'root', component: 'Column', children: ['heading', 'timeline', 'sources']},
        {id: 'heading', component: 'Text', variant: 'h3', text: 'This morning'},
        {id: 'timeline', component: 'Slot', source: 'shell'},
        {id: 'sources', component: 'Row', children: ['github', 'gmail']},
        {id: 'github', component: 'Slot', source: 'github', weight: 1},
        {id: 'gmail', component: 'Slot', source: 'gmail', weight: 1},
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
  INSTALLED_APPS_ANSWER,
  CAPABILITY_GAP,
];
