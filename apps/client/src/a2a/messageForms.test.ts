/**
 * Every kind of message the client sends, in v1.0's forms (task-21.14 decisions 11, 13): the
 * question, a press, an action, a step, the two failure reports, a shell action, close, and what
 * the release sends an agent on its own — a renderer function's answer, a component's
 * `callAgentFunction`. Each is stamped `1.0`, one message per part, carries the renderer's
 * capabilities under `1.0` alone and its data model on `a2uiRendererDataModel`, and each A2UI
 * message it carries holds to the sdk's schema-form check.
 */
import {describe, expect, it} from 'vitest';
import type {Part, SendMessageRequest} from '@a2a-js/sdk';
import {
  A2UI_RENDERER_CAPABILITIES_KEY,
  A2UI_RENDERER_DATA_MODEL_KEY,
  BASIC_CATALOG_SCHEMA,
  CATALOG_LOAD_FAILED,
  createSchemaFormCheck,
  readOperation,
} from '@a2uiverse/sdk';
import {
  buildActionMessageParams,
  buildErrorMessageParams,
  buildOperationMessageParams,
  buildOutboundMessageParams,
  buildTextMessageParams,
  VALIDATION_FAILED,
  type RendererDataModel,
} from './messages';

const IDS = ['https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json'];
const DATA: RendererDataModel = {version: '1.0', surfaces: {'gmail:inbox': {unread: 3}}};
/**
 * The basic catalog's document with one agent function beside its own, as a catalog declaring one
 * writes it: what a component's `callAgentFunction` names is a function of its catalog.
 */
const BASIC_DEFS = BASIC_CATALOG_SCHEMA.$defs as {anyFunction: {oneOf: unknown[]}};
const CATALOG = {
  ...BASIC_CATALOG_SCHEMA,
  $defs: {
    ...BASIC_DEFS,
    anyFunction: {oneOf: [...BASIC_DEFS.anyFunction.oneOf, {$ref: '#/functions/lookUp'}]},
  },
  functions: {
    ...(BASIC_CATALOG_SCHEMA.functions as Record<string, unknown>),
    lookUp: {
      type: 'object',
      properties: {
        '@call': {const: 'lookUp'},
        args: {type: 'object', properties: {}, unevaluatedProperties: false},
      },
      required: ['@call', 'args'],
    },
  },
};
const check = createSchemaFormCheck({catalog: CATALOG});

/** Each data part a request carries, by what it holds. */
const dataOf = (part: Part) =>
  part.content?.$case === 'data' ? (part.content.value as Record<string, unknown>) : undefined;

const ACTION = {
  name: 'archive',
  surfaceId: 'gmail:inbox',
  sourceComponentId: 'row',
  timestamp: '2026-11-28T00:00:00Z',
  context: {id: 'm1'},
};

/** One request of each kind the client sends, as its builder writes it. */
const SENT: [kind: string, request: SendMessageRequest][] = [
  ['the question', buildTextMessageParams('what needs my attention', DATA, IDS)],
  ['a press', buildOperationMessageParams({kind: 'retry', sources: ['gmail']}, 'ctx', IDS)],
  ['an action', buildActionMessageParams(ACTION, 'ctx', DATA, IDS)],
  [
    'a step',
    buildOperationMessageParams({kind: 'step', sources: ['gmail'], step: 1}, 'ctx', IDS, DATA),
  ],
  [
    'a failure report',
    buildErrorMessageParams(
      {code: VALIDATION_FAILED, surfaceId: 'gmail:inbox', path: '/', message: 'invalid'},
      'ctx',
      DATA,
      IDS,
    ),
  ],
  [
    'a catalog load failure',
    buildErrorMessageParams(
      {
        code: CATALOG_LOAD_FAILED,
        surfaceId: 'gmail:inbox',
        message: 'the entry threw',
        catalogId: 'urn:gmail',
      },
      'ctx',
      DATA,
      IDS,
    ),
  ],
  [
    'a shell action',
    buildActionMessageParams(
      {...ACTION, name: 'openStore', surfaceId: 'shell:main', sourceComponentId: 'functionCall'},
      'ctx',
      undefined,
      IDS,
    ),
  ],
  ['close', buildOperationMessageParams({kind: 'close', sources: []}, 'ctx', IDS)],
  [
    'a function’s answer',
    buildOutboundMessageParams(
      {
        version: '1.0',
        rendererFunctionResponse: {functionCallId: 'gmail:call-1', value: 'Friday'},
      },
      'ctx',
      DATA,
      IDS,
    ),
  ],
  [
    'a function’s error answer',
    buildOutboundMessageParams(
      {
        version: '1.0',
        rendererFunctionResponse: {
          functionCallId: 'gmail:call-2',
          error: {code: 'INVALID_FUNCTION_CALL', message: 'Catalog not found: urn:gmail'},
        },
      },
      'ctx',
      DATA,
      IDS,
    ),
  ],
  [
    'a component’s agent function call',
    buildOutboundMessageParams(
      {
        version: '1.0',
        callAgentFunction: {
          surfaceId: 'gmail:inbox',
          functionCallId: 'call-3',
          callFunction: {'@call': 'lookUp', args: {}},
        },
      },
      'ctx',
      DATA,
      IDS,
    ),
  ],
];

describe('every message the client sends, in v1.0’s forms', () => {
  it.each(SENT)('%s carries the renderer’s capabilities under 1.0 alone', (_kind, request) => {
    const metadata = request.message!.metadata as Record<string, unknown>;
    expect(metadata[A2UI_RENDERER_CAPABILITIES_KEY]).toEqual({'1.0': {supportedCatalogIds: IDS}});
    expect(Object.keys(metadata).filter(key => /a2uiClient/.test(key))).toEqual([]);
  });

  it.each(SENT)('%s stamps each part 1.0, one message per part', (_kind, request) => {
    for (const part of request.message!.parts) {
      const data = dataOf(part);
      if (data === undefined) continue;
      expect(Array.isArray(data)).toBe(false);
      expect(data.version).toBe('1.0');
    }
  });

  it.each(SENT)('%s holds to the schema-form check', (_kind, request) => {
    for (const part of request.message!.parts) {
      const data = dataOf(part);
      // The A2UIVerse extension's operation part is no A2UI message: it is read by its own reader.
      if (data === undefined || 'operation' in data) continue;
      expect(check.rendererToAgent(data)).toEqual([]);
    }
  });

  it('a press and a step carry the A2UIVerse extension’s operation, stamped 1.0', () => {
    const operations = SENT.flatMap(([, request]) =>
      request.message!.parts.flatMap(part => {
        const data = dataOf(part);
        return data && 'operation' in data ? [data] : [];
      }),
    );
    expect(operations).toHaveLength(3);
    for (const data of operations) {
      expect(data.version).toBe('1.0');
      expect(readOperation(data)).toBeDefined();
    }
  });

  it('a message with the renderer’s data model carries it on a2uiRendererDataModel', () => {
    const [, action] = SENT.find(([kind]) => kind === 'an action')!;
    expect(
      (action.message!.metadata as Record<string, unknown>)[A2UI_RENDERER_DATA_MODEL_KEY],
    ).toEqual(DATA);
  });
});
