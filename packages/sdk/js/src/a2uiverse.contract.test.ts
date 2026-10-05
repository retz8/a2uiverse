/** Asserts this projection against the normative contract (`packages/sdk/contracts`). Drift is a red build. */
import {readFileSync} from 'node:fs';
import {expect, test} from 'vitest';
import {
  A2UIVERSE_EXTENSION_URI,
  AUTH_REQUIRED_FIELDS,
  AUTH_REQUIRED_STATE,
  CANVAS_PARENT_FIELDS,
  CLIENT_SESSION_FIELDS,
  CATALOG_LOAD_FAILED,
  CATALOG_LOAD_FAILURE_FIELDS,
  OPERATION_FIELDS,
  OPERATION_KINDS,
  PAINT_META_FIELDS,
  PAINT_META_KINDS,
  PAINT_META_MIME_TYPE,
  PAINT_META_TITLE_MAX_LENGTH,
  QUESTION_PAINT_KIND,
  STAMP_FIELDS,
  SOURCE_ID_SEPARATOR,
  STAMP_KEY,
  SURFACE_NS_SEPARATOR,
  authRequiredData,
  canvasParentMetadata,
  clientSessionMetadata,
  clipPaintMetaTitle,
  namespaceSurfaceId,
  operationData,
  paintMetaData,
  parseSourceId,
  sourceName,
  parseSurfaceId,
  readAuthRequired,
  readCanvasParent,
  readClientSession,
  readCatalogLoadFailure,
  readOperation,
  readPaintMeta,
  readStamp,
  sourceId,
} from './a2uiverse';

const contract = JSON.parse(
  readFileSync(new URL('../../contracts/a2uiverse.v0.9.json', import.meta.url), 'utf8'),
) as {
  extensionUri: string;
  stampKey: string;
  sourceIdSeparator: string;
  surfaceIdSeparator: string;
  canvasIdentity: {is: string};
  paintMetaMimeType: string;
  paintMetaTitleMaxLength: number;
  catalogLoadFailedCode: string;
  shapes: Record<
    string,
    {direction: string; required?: string[]; optional?: string[]; kinds?: string[]}
  >;
};

test('constants match the contract', () => {
  expect(A2UIVERSE_EXTENSION_URI).toBe(contract.extensionUri);
  expect(STAMP_KEY).toBe(contract.stampKey);
  expect(SOURCE_ID_SEPARATOR).toBe(contract.sourceIdSeparator);
  expect(SURFACE_NS_SEPARATOR).toBe(contract.surfaceIdSeparator);
  expect(PAINT_META_MIME_TYPE).toBe(contract.paintMetaMimeType);
  expect(PAINT_META_TITLE_MAX_LENGTH).toBe(contract.paintMetaTitleMaxLength);
  expect(CATALOG_LOAD_FAILED).toBe(contract.catalogLoadFailedCode);
});

test('a canvas is an A2A context: the contract names no canvas id of its own', () => {
  expect(contract.canvasIdentity.is).toBe('the A2A contextId');
  for (const shape of Object.values(contract.shapes)) {
    expect([...(shape.required ?? []), ...(shape.optional ?? [])]).not.toContain('canvas');
  }
});

test('shape fields match the contract', () => {
  const stamp = contract.shapes.compositionStamp!;
  expect([...STAMP_FIELDS].sort()).toEqual([...stamp.required!, ...stamp.optional!].sort());
  const parent = contract.shapes.canvasParent!;
  expect(parent.direction).toBe('client → orchestrator');
  expect([...CANVAS_PARENT_FIELDS].sort()).toEqual(
    [...parent.required!, ...parent.optional!].sort(),
  );
  const session = contract.shapes.clientSession!;
  expect(session.direction).toBe('client → orchestrator');
  expect([...CLIENT_SESSION_FIELDS].sort()).toEqual(
    [...session.required!, ...session.optional!].sort(),
  );
  const paintMeta = contract.shapes.paintMeta!;
  expect(paintMeta.direction).toBe('orchestrator → client');
  expect([...PAINT_META_FIELDS].sort()).toEqual(
    [...paintMeta.required!, ...paintMeta.optional!].sort(),
  );
  expect([...PAINT_META_KINDS]).toEqual(paintMeta.kinds);
  expect(PAINT_META_KINDS).toContain(QUESTION_PAINT_KIND);
});

test('the operation matches the contract: its fields and its kinds', () => {
  const operation = contract.shapes.compositionOperation!;
  expect(operation.direction).toBe('client → orchestrator');
  expect([...OPERATION_FIELDS].sort()).toEqual(
    [...operation.required!, ...operation.optional!].sort(),
  );
  expect([...OPERATION_KINDS]).toEqual(operation.kinds);
});

test('the session rides every client message beside the parent, and reads back', () => {
  const metadata = clientSessionMetadata('page-1', 'ctx-parent');
  expect(readClientSession(metadata)).toEqual({session: 'page-1'});
  expect(readCanvasParent(metadata)).toEqual({parent: 'ctx-parent'});
  expect(readClientSession(clientSessionMetadata('page-1'))).toEqual({session: 'page-1'});
  expect(readClientSession(canvasParentMetadata('ctx-parent'))).toBeUndefined();
  expect(readClientSession({[STAMP_KEY]: {session: ''}})).toBeUndefined();
});

test('the catalog load failure matches the contract', () => {
  const failure = contract.shapes.catalogLoadFailure!;
  expect(failure.direction).toBe('client → orchestrator');
  expect([...CATALOG_LOAD_FAILURE_FIELDS].sort()).toEqual(
    [...failure.required!, ...failure.optional!].sort(),
  );
});

test('readCatalogLoadFailure reads the code, the surface and the catalog, and refuses the rest', () => {
  const error = {
    code: CATALOG_LOAD_FAILED,
    surfaceId: 'gmail:inbox',
    message: 'the registry does not hold it',
    catalogId: 'https://example.com/gmail/catalog.json',
  };
  expect(readCatalogLoadFailure(error)).toEqual(error);
  expect(readCatalogLoadFailure({...error, code: 'VALIDATION_FAILED'})).toBeUndefined();
  expect(readCatalogLoadFailure({...error, catalogId: ''})).toBeUndefined();
  expect(readCatalogLoadFailure({...error, surfaceId: undefined})).toBeUndefined();
  expect(readCatalogLoadFailure('CATALOG_LOAD_FAILED')).toBeUndefined();
});

test('the contract carries no vendor-facing shape; the one shape from an agent is the auth-required request', () => {
  expect(Object.keys(contract.shapes)).toEqual([
    'compositionStamp',
    'canvasParent',
    'clientSession',
    'compositionOperation',
    'catalogLoadFailure',
    'paintMeta',
    'authRequired',
    'synthesizeDataModel',
  ]);
  for (const [name, shape] of Object.entries(contract.shapes)) {
    const from = name === 'authRequired' ? ['agent → orchestrator'] : [];
    expect(['orchestrator → client', 'client → orchestrator', ...from]).toContain(shape.direction);
  }
});

test('the auth-required request matches the contract', () => {
  const request = contract.shapes.authRequired!;
  expect(request.direction).toBe('agent → orchestrator');
  expect([...AUTH_REQUIRED_FIELDS].sort()).toEqual(
    [...request.required!, ...request.optional!].sort(),
  );
  expect(AUTH_REQUIRED_STATE).toBe('auth-required');
});

test("an auth-required request round-trips in the card's own requirement shape", () => {
  const request = {security: [{github_oauth: ['repo']}, {github_pat: []}]};
  expect(authRequiredData(request)).toEqual(request);
  expect(readAuthRequired(authRequiredData(request))).toEqual(request);
  expect(readAuthRequired({security: [{oauth: ['read', 'write'], api_key: []}]})).toEqual({
    security: [{oauth: ['read', 'write'], api_key: []}],
  });
});

test('readAuthRequired refuses what is not a well-formed request', () => {
  expect(readAuthRequired(undefined)).toBeUndefined();
  expect(readAuthRequired('auth-required')).toBeUndefined();
  expect(readAuthRequired({})).toBeUndefined();
  expect(readAuthRequired({security: []})).toBeUndefined();
  expect(readAuthRequired({security: {oauth: ['repo']}})).toBeUndefined();
  expect(readAuthRequired({security: [{}]})).toBeUndefined();
  expect(readAuthRequired({security: [['oauth']]})).toBeUndefined();
  expect(readAuthRequired({security: [{'': ['repo']}]})).toBeUndefined();
  expect(readAuthRequired({security: [{oauth: 'repo'}]})).toBeUndefined();
  expect(readAuthRequired({security: [{oauth: ['']}]})).toBeUndefined();
  expect(readAuthRequired({security: [{oauth: [3]}]})).toBeUndefined();
  expect(readAuthRequired({security: [{oauth: ['repo', 'repo']}]})).toBeUndefined();
});

test('a source is the app and its account: <appId>.<n>, the bare app id with no account', () => {
  expect(sourceId('gmail', 2)).toBe('gmail.2');
  expect(sourceId('github')).toBe('github');
  expect(parseSourceId('gmail.2')).toEqual({appId: 'gmail', account: 2});
  expect(parseSourceId('github')).toEqual({appId: 'github'});
  expect(parseSourceId('shell')).toEqual({appId: 'shell'});
  expect(parseSourceId('')).toBeUndefined();
  expect(parseSourceId('.2')).toBeUndefined();
  expect(parseSourceId('gmail.')).toBeUndefined();
  expect(parseSourceId('gmail.0')).toBeUndefined();
  expect(parseSourceId('gmail.02')).toBeUndefined();
  expect(parseSourceId('gmail.x')).toBeUndefined();
  expect(parseSourceId('gmail.1.2')).toBeUndefined();
});

test("a source's name is the app's, with the account's label when there is one", () => {
  expect(sourceName('Gmail', 'alice@example.com')).toBe('Gmail · alice@example.com');
  expect(sourceName('Gmail')).toBe('Gmail');
  expect(sourceName('Gmail', null)).toBe('Gmail');
});

test('an operation round-trips through its data part', () => {
  const data = operationData({kind: 'include', sources: ['github', 'circleci']}, 'v0.9');
  expect(data).toEqual({
    version: 'v0.9',
    operation: {kind: 'include', sources: ['github', 'circleci']},
  });
  expect(readOperation(data)).toEqual({kind: 'include', sources: ['github', 'circleci']});
  expect(readOperation(operationData({kind: 'retry', sources: ['gmail']}, 'v0.9'))).toEqual({
    kind: 'retry',
    sources: ['gmail'],
  });
  expect(readOperation(operationData({kind: 'tryAgain', sources: []}, 'v0.9'))).toEqual({
    kind: 'tryAgain',
    sources: [],
  });
});

test('a dismiss names the one source whose scope request Not now drops', () => {
  const dismiss = operationData({kind: 'dismiss', sources: ['github.1']}, 'v0.9');
  expect(dismiss).toEqual({version: 'v0.9', operation: {kind: 'dismiss', sources: ['github.1']}});
  expect(readOperation(dismiss)).toEqual({kind: 'dismiss', sources: ['github.1']});
  expect(
    readOperation({version: 'v0.9', operation: {kind: 'dismiss', sources: []}}),
  ).toBeUndefined();
  expect(
    readOperation({version: 'v0.9', operation: {kind: 'dismiss', sources: ['a', 'b']}}),
  ).toBeUndefined();
  expect(
    readOperation({version: 'v0.9', operation: {kind: 'dismiss', sources: ['a'], step: 0}}),
  ).toBeUndefined();
});

test('a useAccount names the one account the account choice sends to', () => {
  const use = operationData({kind: 'useAccount', sources: ['gmail.2']}, 'v0.9');
  expect(use).toEqual({version: 'v0.9', operation: {kind: 'useAccount', sources: ['gmail.2']}});
  expect(readOperation(use)).toEqual({kind: 'useAccount', sources: ['gmail.2']});
  expect(
    readOperation({version: 'v0.9', operation: {kind: 'useAccount', sources: []}}),
  ).toBeUndefined();
  expect(
    readOperation({version: 'v0.9', operation: {kind: 'useAccount', sources: ['a.1', 'a.2']}}),
  ).toBeUndefined();
});

test('a step names one agent and the step it shows; a close names nothing', () => {
  const step = operationData({kind: 'step', sources: ['github'], step: 0}, 'v0.9');
  expect(step).toEqual({version: 'v0.9', operation: {kind: 'step', sources: ['github'], step: 0}});
  expect(readOperation(step)).toEqual({kind: 'step', sources: ['github'], step: 0});
  expect(
    readOperation(operationData({kind: 'step', sources: ['github'], step: 3}, 'v0.9')),
  ).toEqual({kind: 'step', sources: ['github'], step: 3});
  const close = operationData({kind: 'close', sources: []}, 'v0.9');
  expect(close).toEqual({version: 'v0.9', operation: {kind: 'close', sources: []}});
  expect(readOperation(close)).toEqual({kind: 'close', sources: []});
  // A stray `step` on another kind is dropped by the builder, refused by the reader.
  expect(operationData({kind: 'retry', sources: ['gmail'], step: 2}, 'v0.9').operation).toEqual({
    kind: 'retry',
    sources: ['gmail'],
  });
});

test('readOperation refuses a malformed press: the kind, the sources, how many the kind names, and the step', () => {
  const read = (operation: unknown, version: unknown = 'v0.9') =>
    readOperation({version, operation});
  expect(readOperation({operation: {kind: 'retry', sources: ['a']}})).toBeUndefined();
  expect(read('retry')).toBeUndefined();
  expect(read({kind: 'refresh', sources: []})).toBeUndefined();
  expect(read({kind: 'include', sources: 'github'})).toBeUndefined();
  expect(read({kind: 'include', sources: [1]})).toBeUndefined();
  expect(read({kind: 'include', sources: []})).toBeUndefined();
  expect(read({kind: 'include', sources: ['a', 'a']})).toBeUndefined();
  expect(read({kind: 'retry', sources: ['a', 'b']})).toBeUndefined();
  expect(read({kind: 'retry', sources: ['']})).toBeUndefined();
  expect(read({kind: 'tryAgain', sources: ['a']})).toBeUndefined();
  expect(read({kind: 'step', sources: ['a']})).toBeUndefined();
  expect(read({kind: 'step', sources: ['a', 'b'], step: 0})).toBeUndefined();
  expect(read({kind: 'step', sources: [], step: 0})).toBeUndefined();
  expect(read({kind: 'step', sources: ['a'], step: -1})).toBeUndefined();
  expect(read({kind: 'step', sources: ['a'], step: 1.5})).toBeUndefined();
  expect(read({kind: 'step', sources: ['a'], step: '0'})).toBeUndefined();
  expect(read({kind: 'close', sources: ['a']})).toBeUndefined();
  expect(read({kind: 'close', sources: [], step: 0})).toBeUndefined();
  expect(read({kind: 'retry', sources: ['a'], step: 0})).toBeUndefined();
});

test('the parent canvas rides under the stamp key on the opening utterance', () => {
  const metadata = canvasParentMetadata('ctx-parent');
  expect(metadata).toEqual({[STAMP_KEY]: {parent: 'ctx-parent'}});
  expect(readCanvasParent(metadata)).toEqual({parent: 'ctx-parent'});
  expect(readCanvasParent(undefined)).toBeUndefined();
  expect(readCanvasParent({})).toBeUndefined();
  expect(readCanvasParent({[STAMP_KEY]: {parent: ''}})).toBeUndefined();
  expect(readCanvasParent({[STAMP_KEY]: {parent: 3}})).toBeUndefined();
  // The key is two-directional: an outbound stamp is not a parent, and a parent is not a stamp.
  expect(readCanvasParent({[STAMP_KEY]: {source: 'github', role: 'fragment'}})).toBeUndefined();
  expect(readStamp(metadata)).toBeUndefined();
});

test('a paintMeta round-trips through its data part', () => {
  expect(paintMetaData({surfaceId: 'shell:main', title: 'Works for today'})).toEqual({
    paintMeta: {surfaceId: 'shell:main', title: 'Works for today'},
  });
  expect(readPaintMeta(paintMetaData({surfaceId: 'shell:main', title: 'Works for today'}))).toEqual(
    {surfaceId: 'shell:main', title: 'Works for today'},
  );
  expect(readPaintMeta({paintMeta: {surfaceId: 'github:ask', kind: 'question'}})).toEqual({
    surfaceId: 'github:ask',
    kind: 'question',
  });
  expect(readPaintMeta({paintMeta: {surfaceId: 's', title: '', kind: ''}})).toEqual({
    surfaceId: 's',
  });
});

test('readPaintMeta refuses what is not a paintMeta naming a surface', () => {
  expect(readPaintMeta(undefined)).toBeUndefined();
  expect(readPaintMeta(null)).toBeUndefined();
  expect(readPaintMeta({version: 'v0.9', createSurface: {surfaceId: 's'}})).toBeUndefined();
  expect(readPaintMeta({paintMeta: 'title'})).toBeUndefined();
  expect(readPaintMeta({paintMeta: []})).toBeUndefined();
  expect(readPaintMeta({paintMeta: {title: 'no surface'}})).toBeUndefined();
  expect(readPaintMeta({paintMeta: {surfaceId: ''}})).toBeUndefined();
});

test('a title past the cap is clipped with an ellipsis, whitespace collapsed first', () => {
  expect(clipPaintMetaTitle('Works for today')).toBe('Works for today');
  expect(clipPaintMetaTitle('  Works\n for   today ')).toBe('Works for today');
  const long = 'Pull requests, issues and runs waiting on you across every tool';
  const clipped = clipPaintMetaTitle(long);
  expect(clipped.length).toBe(PAINT_META_TITLE_MAX_LENGTH);
  expect(clipped.endsWith('…')).toBe(true);
  expect(clipped.startsWith('Pull requests, issues and runs waiting on you')).toBe(true);
  expect(clipPaintMetaTitle('x'.repeat(PAINT_META_TITLE_MAX_LENGTH))).toBe(
    'x'.repeat(PAINT_META_TITLE_MAX_LENGTH),
  );
  expect(clipPaintMetaTitle('   ')).toBe('');
});

test('surface id namespacing round-trips, by source', () => {
  expect(namespaceSurfaceId('github', 'pr-list')).toBe('github:pr-list');
  expect(namespaceSurfaceId('gmail.2', 'inbox')).toBe('gmail.2:inbox');
  expect(parseSurfaceId('github:pr-list')).toEqual({source: 'github', surfaceId: 'pr-list'});
  expect(parseSurfaceId('gmail.2:inbox')).toEqual({source: 'gmail.2', surfaceId: 'inbox'});
  expect(parseSurfaceId('gmail:chat:1')).toEqual({source: 'gmail', surfaceId: 'chat:1'});
  expect(parseSurfaceId('un-namespaced')).toBeUndefined();
  expect(parseSurfaceId(':pr-list')).toBeUndefined();
  expect(parseSurfaceId('github:')).toBeUndefined();
});

test('readStamp accepts a stamped event and rejects malformed metadata', () => {
  expect(readStamp({[STAMP_KEY]: {source: 'github', role: 'fragment'}})).toEqual({
    source: 'github',
    role: 'fragment',
  });
  expect(readStamp(undefined)).toBeUndefined();
  expect(readStamp({})).toBeUndefined();
  expect(readStamp({[STAMP_KEY]: 'github'})).toBeUndefined();
  expect(readStamp({[STAMP_KEY]: {role: 'fragment'}})).toBeUndefined();
});

test('the stamp carries no generations', () => {
  const stamp = contract.shapes.compositionStamp!;
  expect([...stamp.required!, ...stamp.optional!]).not.toContain('generations');
  expect(STAMP_FIELDS).not.toContain('generations');
});
