/**
 * The marketplace's in-process A2A 0.3 agent for tests: the shared package's fake agent, with the
 * cards and the paints the marketplace's suite publishes.
 */
import {BASIC_CATALOG_ID} from '@a2uiverse/sdk';
import {
  authRequiredScript as sharedAuthRequiredScript,
  completingScript,
  finalUpdate,
  firstTurnTask,
  paintParts,
  startFakeAgent as startSharedFakeAgent,
  statusUpdate,
  unmarkedScript as sharedUnmarkedScript,
  type FakeAgent,
  type Script,
  type TaskState,
  type AdmitRequest,
} from '@a2uiverse/smoke-transport/testing';
import {cardFor, signInCardFor, type CardOptions} from './fixture.js';

export {failedScript, hangingScript, submittedOnlyScript} from '@a2uiverse/smoke-transport/testing';
export type {FakeAgent, Script};

export interface FakeAgentOptions extends CardOptions {
  script?: Script;
  /** The card requires sign-in (an OAuth scheme on every request). */
  signIn?: boolean;
  /** Whether a request is let in; refused, it is answered 401. */
  admit?: (request: AdmitRequest) => boolean;
  /** Serve no card: the well-known path answers 404. */
  noCard?: boolean;
}

/** The catalog the default script paints in. */
export const FAKE_CATALOG_ID = 'https://example.com/fake/catalog.json';

/** Paints one surface in `catalogId` and completes, as the deterministic roster does. */
export const paintingScript = (catalogId = FAKE_CATALOG_ID, text = 'hi'): Script =>
  completingScript(paintParts(catalogId, {text}));

/**
 * A tree streamed as upstream's restaurant finder streams it: each working update sends the tree so
 * far again, a Button's action `{}` in one copy and whole in the next, a placeholder child dropped
 * on the way; then the task completes with no parts. The basic catalog's web_core refuses the
 * half-written copy, so a paint kept as sent fails the Store's sample.
 */
export const STREAMED_SURFACE = 'list';
const streamedCopy = (components: unknown[]) => ({
  kind: 'data' as const,
  data: {version: 'v0.9', updateComponents: {surfaceId: STREAMED_SURFACE, components}},
});
export const STREAMED_BOOK = {event: {name: 'book', context: {name: {path: '/name'}}}};
export const STREAMED_SETTLED = [
  {id: 'root', component: 'Column', children: ['title', 'book']},
  {id: 'title', component: 'Text', text: 'Restaurants'},
  {id: 'book', component: 'Button', child: 'book-label', action: STREAMED_BOOK},
  {id: 'book-label', component: 'Text', text: 'Book'},
];
export const streamedScript =
  (catalogId = BASIC_CATALOG_ID): Script =>
  ({ctx, firstTurn}) => [
    ...(firstTurn ? [firstTurnTask(ctx)] : []),
    statusUpdate(
      ctx,
      'working',
      [
        {
          kind: 'data',
          data: {version: 'v0.9', createSurface: {surfaceId: STREAMED_SURFACE, catalogId}},
        },
        streamedCopy([
          {id: 'root', component: 'Column', children: ['loading_title']},
          {id: 'loading_title', component: 'Text', text: ''},
        ]),
      ],
      false,
    ),
    statusUpdate(
      ctx,
      'working',
      [
        streamedCopy([
          {id: 'root', component: 'Column', children: ['title', 'book']},
          {id: 'title', component: 'Text', text: 'Restaurants'},
          {id: 'book', component: 'Button', child: 'book-label', action: {}},
        ]),
      ],
      false,
    ),
    statusUpdate(ctx, 'working', [streamedCopy(STREAMED_SETTLED)], false),
    finalUpdate(ctx, 'completed', []),
  ];

/** Paints, then the credential input the bar refuses. */
export const credentialScript =
  (catalogId = FAKE_CATALOG_ID): Script =>
  ({ctx}) => [
    finalUpdate(ctx, 'completed', [
      {kind: 'data', data: {version: 'v0.9', createSurface: {surfaceId: 's1', catalogId}}},
      {
        kind: 'data',
        data: {
          version: 'v0.9',
          updateComponents: {
            surfaceId: 's1',
            components: [{id: 'root', component: 'Text', text: 'Enter it', password: ''}],
          },
        },
      },
    ]),
  ];

/** Ends the task as `auth-required`, naming `scheme`. */
export const authRequiredScript = (scheme = 'signIn', scopes = ['read']): Script =>
  sharedAuthRequiredScript(scheme, scopes);

/**
 * Paints in `catalogId`, then moves through `states` with no update marked final and closes the
 * stream: upstream's restaurant finder ends its answers on `input-required` this way.
 */
export const unmarkedScript = (states: TaskState[], catalogId = FAKE_CATALOG_ID): Script =>
  sharedUnmarkedScript(states, paintParts(catalogId));

export function startFakeAgent(options: FakeAgentOptions = {}): Promise<FakeAgent> {
  const {script = paintingScript(), catalogs = [FAKE_CATALOG_ID], admit, noCard} = options;
  const cardOptions = {...options, catalogs};
  return startSharedFakeAgent({
    script,
    card: url => (options.signIn ? signInCardFor(url, cardOptions) : cardFor(url, cardOptions)),
    ...(admit ? {admit} : {}),
    ...(noCard ? {noCard} : {}),
  });
}
