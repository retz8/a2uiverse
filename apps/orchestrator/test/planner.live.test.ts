/**
 * Live smoke test of the real Planner against Gemini — proves the model answers the text prompt
 * with one tagged block the whole validator admits, calling a reader when the utterance needs one
 * (task-6.4). Never runs in `pnpm verify`:
 *
 *   set -a; source .env; set +a
 *   A2UIVERSE_PLANNER_LIVE=1 pnpm --filter @a2uiverse/orchestrator test planner.live
 */
import {describe, expect, test} from 'vitest';
import {buildAgentCard} from '../src/agentCard.js';
import {loadConfig} from '../src/config.js';
import {getModel, plannerProviderOptions} from '../src/planner/getModel.js';
import {ModelPlanner} from '../src/planner/planner.js';
import {plannerSystemPrompt, readPlannerFiles} from '../src/planner/prompt.js';
import type {PlatformReaders} from '../src/planner/readers.js';
import type {ShortlistEntry} from '../src/router/router.js';

const live = process.env.A2UIVERSE_PLANNER_LIVE === '1' && !!process.env.GOOGLE_API_KEY;

function entry(appId: string, name: string, description: string, skills: string[]): ShortlistEntry {
  return {
    record: {
      id: appId,
      displayName: name,
      agentUrl: `http://localhost/${appId}`,
      authScheme: 'none',
      catalogId: `cat-${appId}`,
      catalogPackage: `${appId}-catalog`,
    },
    card: {
      name,
      description,
      version: '0.0.0',
      protocolVersion: '0.3.0',
      url: 'http://127.0.0.1:0',
      preferredTransport: 'JSONRPC',
      capabilities: {},
      defaultInputModes: ['text'],
      defaultOutputModes: ['text'],
      skills: skills.map((s, i) => ({id: `s${i}`, name: s, description: s, tags: []})),
    },
    score: 1,
  };
}

const platformCard = buildAgentCard('http://localhost:10001');
const shortlist: ShortlistEntry[] = [
  entry('github', 'GitHub', 'Repositories, pull requests and issues.', [
    'Lists pull requests awaiting review',
  ]),
  entry('gmail', 'Gmail', 'The signed-in mailbox.', ['Shows unread mail']),
  entry('calendar', 'Google Calendar', 'The signed-in calendar.', ['Shows today’s events']),
  {
    record: {
      id: 'shell',
      displayName: 'A2UIVerse',
      agentUrl: platformCard.url,
      authScheme: 'none',
      catalogId: 'shell',
      catalogPackage: '@a2uiverse/shell-catalog',
    },
    card: platformCard,
    score: 1,
  },
];

const readers: PlatformReaders = {
  installedApps: () =>
    shortlist
      .filter(e => e.record.id !== 'shell')
      .map(e => ({
        id: e.record.id,
        displayName: e.record.displayName,
        name: e.card.name,
        description: e.card.description,
        skills: e.card.skills.map(s => ({name: s.name, description: s.description})),
        reachable: true,
        signIn: false,
        accounts: [],
      })),
  thisComposition: () => undefined,
  recentTurns: () => [],
};

describe.skipIf(!live)('Planner (live)', () => {
  const config = loadConfig(process.env);
  const settings = {
    googleApiKey: config.googleApiKey!,
    modelId: config.plannerModelId,
    effort: config.plannerEffort,
  };
  const files = readPlannerFiles();
  const planner = new ModelPlanner({
    model: getModel(settings),
    providerOptions: plannerProviderOptions(settings),
    systemPrompt: plannerSystemPrompt(files),
    catalog: files.catalog,
    readers,
  });

  test('a fan-out with a merged view: every dispatched source gets a slot, the merge is briefed', async () => {
    const started = Date.now();
    const outcome = await planner.plan({
      utterance: 'What needs my attention today?',
      shortlist,
    });
    console.log(`live plan in ${Date.now() - started}ms:`, JSON.stringify(outcome));
    expect(outcome.kind).toBe('planned');
    if (outcome.kind !== 'planned') return;
    const sources = outcome.document.dispatch.filter(d => 'source' in d);
    expect(sources.length).toBeGreaterThanOrEqual(2);
  }, 90_000);

  test('a platform question: no dispatch, one reader called, the answer in the tree', async () => {
    const started = Date.now();
    const outcome = await planner.plan({
      utterance: 'What apps do I have?',
      shortlist,
    });
    console.log(`live platform answer in ${Date.now() - started}ms:`, JSON.stringify(outcome));
    expect(outcome.kind).toBe('planned');
    if (outcome.kind !== 'planned') return;
    expect(outcome.document.dispatch).toEqual([]);
    expect(outcome.toolCalls.map(c => c.name)).toContain('installed_apps');
    expect(outcome.document.tree.components.some(c => c.component === 'Slot')).toBe(false);
  }, 90_000);

  describe('accounts (task 12.6)', () => {
    /** GitHub not signed in yet, Gmail with two accounts, Calendar asking no sign-in. */
    const sourcesOf = (appId: string) =>
      appId === 'github'
        ? [{source: 'github.1', notSignedIn: true as const}]
        : appId === 'gmail'
          ? [
              {source: 'gmail.1', label: 'jioh@gmail.com'},
              {source: 'gmail.2', label: 'jioh@umich.edu'},
            ]
          : [{source: appId}];
    const withAccounts = new ModelPlanner({
      model: getModel(settings),
      providerOptions: plannerProviderOptions(settings),
      systemPrompt: plannerSystemPrompt(files),
      catalog: files.catalog,
      readers: {
        ...readers,
        installedApps: () =>
          readers.installedApps().map(app =>
            app.id === 'gmail'
              ? {
                  ...app,
                  signIn: true,
                  accounts: [
                    {source: 'gmail.1', label: 'jioh@gmail.com'},
                    {source: 'gmail.2', label: 'jioh@umich.edu'},
                  ],
                }
              : app.id === 'github'
                ? {...app, signIn: true}
                : app,
          ),
      },
      sourcesOf,
    });
    const plan = async (utterance: string) => {
      const started = Date.now();
      const outcome = await withAccounts.plan({utterance, shortlist});
      console.log(
        `live ${JSON.stringify(utterance)} in ${Date.now() - started}ms:`,
        JSON.stringify(outcome),
      );
      expect(outcome.kind).toBe('planned');
      if (outcome.kind !== 'planned') throw new Error('not planned');
      return outcome;
    };
    const dispatched = (outcome: Awaited<ReturnType<typeof plan>>) =>
      outcome.document.dispatch.flatMap(d => ('source' in d ? [d.source] : []));

    test('an app not signed in yet is dispatched as the account its sign-in will create (found in 12.10)', async () => {
      const outcome = await plan('Show my open pull requests on GitHub');
      expect(dispatched(outcome)).toEqual(['github.1']);
    }, 90_000);

    test('a command naming no account, for an app with two, asks which', async () => {
      const outcome = await plan('Reply to Bob that I will be ten minutes late');
      expect(outcome.document.dispatch).toEqual([
        {chooseAccount: 'gmail', request: expect.any(String)},
      ]);
    }, 90_000);

    test('a command naming its account goes to that account alone', async () => {
      const outcome = await plan('Show my unread mail on my umich account');
      expect(dispatched(outcome)).toEqual(['gmail.2']);
    }, 90_000);

    test('a question about state gathers from every account', async () => {
      const outcome = await plan('What is unread in my mail?');
      expect(
        dispatched(outcome)
          .filter(s => s.startsWith('gmail'))
          .sort(),
      ).toEqual(['gmail.1', 'gmail.2']);
    }, 90_000);

    test('a status question with a merged view gathers every account of an app (task-12.13 decision 54)', async () => {
      const outcome = await plan('What needs my attention today?');
      expect(
        dispatched(outcome)
          .filter(s => s.startsWith('gmail'))
          .sort(),
      ).toEqual(['gmail.1', 'gmail.2']);
    }, 90_000);

    test('asked to add an account, the answer places the add-account tile for that app (task-12.13 decision 27)', async () => {
      const outcome = await plan('Add another Gmail account');
      const tiles = outcome.document.tree.components.flatMap(c =>
        c.component === 'Slot' && 'addAccount' in c ? [(c as {addAccount: string}).addAccount] : [],
      );
      expect(tiles).toEqual(['gmail']);
    }, 90_000);
  });

  test('what waits on the person gathers every app holding a part, a tracker not signed in yet among them (task-12.13 decision 49)', async () => {
    const tracker = entry(
      'linear',
      'Linear',
      "Shows the user's Linear issues: what is assigned to them or in a team's queue, by status and priority.",
      [
        'Lists the issues assigned to the user — what is in progress, what is up next, what is urgent',
      ],
    );
    const withTracker = new ModelPlanner({
      model: getModel(settings),
      providerOptions: plannerProviderOptions(settings),
      systemPrompt: plannerSystemPrompt(files),
      catalog: files.catalog,
      readers,
      sourcesOf: appId =>
        appId === 'linear'
          ? [{source: 'linear.1', notSignedIn: true}]
          : [{source: `${appId}.1`, label: 'jioh@gmail.com'}],
    });
    const outcome = await withTracker.plan({
      utterance: 'What needs my attention today?',
      shortlist: [...shortlist.slice(0, 3), tracker, shortlist[3]!],
    });
    console.log('live attention plan:', JSON.stringify(outcome));
    expect(outcome.kind).toBe('planned');
    if (outcome.kind !== 'planned') return;
    const sources = outcome.document.dispatch.flatMap(d => ('source' in d ? [d.source] : []));
    expect(sources).toContain('linear.1');
  }, 90_000);

  test('a capability gap: no dispatch, one gap slot', async () => {
    const started = Date.now();
    const outcome = await planner.plan({
      utterance: 'Book me a flight to Seoul next Friday.',
      shortlist,
    });
    console.log(`live gap in ${Date.now() - started}ms:`, JSON.stringify(outcome));
    expect(outcome.kind).toBe('planned');
    if (outcome.kind !== 'planned') return;
    expect(outcome.document.dispatch.some(d => 'gap' in d)).toBe(true);
    expect(outcome.document.dispatch.some(d => 'source' in d)).toBe(false);
  }, 90_000);
});
