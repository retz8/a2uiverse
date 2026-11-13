import {describe, it, expect, vi} from 'vitest';
import {Role, TaskState, type Message, type Part} from '@a2a-js/sdk';
import type {A2uiClientAction, A2uiClientDataModel} from '@a2ui/web_core/v0_9';
import {
  buildActionMessageParams,
  buildOperationMessageParams,
  buildTextMessageParams,
  dataPart,
  extractA2uiMessagesFromEvent,
  extractAgentTextFromEvent,
  extractContextId,
  extractPaintMetasFromEvent,
  statusUpdateEvent,
  textPart,
  type A2AStreamEventData,
} from './messages';
import {PAGE_SESSION} from './pageSession';

/** The person's clock, fixed for the metadata these tests compare whole (task-12.13 decision 47). */
const CLOCK = vi.hoisted(() => ({now: '2026-10-09T14:20:00+09:00', timeZone: 'Asia/Seoul'}));
vi.mock('./clock', () => ({readClock: () => CLOCK}));

/** The page load's session, on every message (task-12.5 decision 6). */
const SESSION = {a2uiverse: {session: PAGE_SESSION, ...CLOCK}};

const A2UI_DATA = {version: 'v0.9', createSurface: {surfaceId: 's', catalogId: 'cat'}};
const DATA_PART: Part = dataPart(A2UI_DATA);
const TEXT_PART: Part = textPart('hello');
const FOREIGN_PART: Part = dataPart({version: 'v0.8', foo: 1});
/** A v0.9.1 agent's paint, as its message carries it (task-19.3 decision 1). */
const A2UI_DATA_V091 = {version: 'v0.9.1', createSurface: {surfaceId: 't', catalogId: 'cat'}};

const ACTION = {name: 'click', surfaceId: 's'} as unknown as A2uiClientAction;

const CLIENT_DM = {
  version: 'v0.9',
  surfaces: {s: {prs: [{title: 'one', selected: true}]}},
} as unknown as A2uiClientDataModel;

/** A whole part as a sent message holds it, spelled out beside the builders that write it. */
const sentPart = (content: Part['content']): Part => ({
  content,
  metadata: undefined,
  filename: '',
  mediaType: '',
});

function message(parts: Part[], contextId = '', role = Role.ROLE_AGENT): Message {
  return {
    messageId: 'm1',
    contextId,
    taskId: '',
    role,
    parts,
    metadata: undefined,
    extensions: [],
    referenceTaskIds: [],
  };
}

function agentMessage(parts: Part[], contextId?: string): A2AStreamEventData {
  return {payload: {$case: 'message', value: message(parts, contextId)}};
}

function task(parts: Part[] | undefined, contextId = 'ctx-task'): A2AStreamEventData {
  return {
    payload: {
      $case: 'task',
      value: {
        id: 't1',
        contextId,
        status: {
          state: TaskState.TASK_STATE_COMPLETED,
          message: parts ? message(parts) : undefined,
          timestamp: undefined,
        },
        artifacts: [],
        history: [],
        metadata: undefined,
      },
    },
  };
}

function statusUpdate(parts: Part[] | undefined, contextId = 'ctx-status'): A2AStreamEventData {
  return statusUpdateEvent({
    taskId: 't1',
    contextId,
    state: TaskState.TASK_STATE_WORKING,
    parts,
  });
}

function artifactUpdate(parts: Part[]): A2AStreamEventData {
  return {
    payload: {
      $case: 'artifactUpdate',
      value: {
        taskId: 't1',
        contextId: 'ctx-artifact',
        artifact: {
          artifactId: 'a1',
          name: '',
          description: '',
          parts,
          metadata: undefined,
          extensions: [],
        },
        append: false,
        lastChunk: false,
        metadata: undefined,
      },
    },
  };
}

describe('buildTextMessageParams', () => {
  it('wraps user text as a single TextPart user message', () => {
    const params = buildTextMessageParams('show me open PRs');
    expect(params.message!.role).toBe(Role.ROLE_USER);
    expect(params.message!.messageId).toBeTruthy();
    expect(params.message!.parts).toEqual([sentPart({$case: 'text', value: 'show me open PRs'})]);
    expect(params.message!.contextId).toBe('');
  });

  it('attaches the client data model as message metadata when given', () => {
    const params = buildTextMessageParams('show', CLIENT_DM);
    expect(params.message!.metadata).toEqual({a2uiClientDataModel: CLIENT_DM, ...SESSION});
  });

  it('names only the page-load session when no client data model is given', () => {
    expect(buildTextMessageParams('show').message!.metadata).toEqual(SESSION);
  });

  it('advertises the supported catalogs as a2uiClientCapabilities when given', () => {
    const params = buildTextMessageParams('show', undefined, ['cat-a']);
    expect(params.message!.metadata).toEqual({
      a2uiClientCapabilities: {
        'v0.9': {supportedCatalogIds: ['cat-a']},
        'v0.9.1': {supportedCatalogIds: ['cat-a']},
      },
      ...SESSION,
    });
  });
});

describe('buildActionMessageParams', () => {
  it('wraps the action as a version-tagged DataPart without a contextId by default', () => {
    const params = buildActionMessageParams(ACTION);
    expect(params.message!.parts).toEqual([
      sentPart({$case: 'data', value: {version: 'v0.9', action: ACTION}}),
    ]);
    expect(params.message!.contextId).toBe('');
  });

  it('threads a contextId when given', () => {
    const params = buildActionMessageParams(ACTION, 'ctx-9');
    expect(params.message!.contextId).toBe('ctx-9');
  });

  it('attaches the client data model as message metadata when given', () => {
    const params = buildActionMessageParams(ACTION, 'ctx-9', CLIENT_DM);
    expect(params.message!.metadata).toEqual({a2uiClientDataModel: CLIENT_DM, ...SESSION});
  });

  it('names only the page-load session when no client data model is given', () => {
    expect(buildActionMessageParams(ACTION).message!.metadata).toEqual(SESSION);
  });

  it('advertises the supported catalogs alongside the data model', () => {
    const params = buildActionMessageParams(ACTION, 'ctx-9', CLIENT_DM, ['cat-a']);
    expect(params.message!.metadata).toEqual({
      a2uiClientCapabilities: {
        'v0.9': {supportedCatalogIds: ['cat-a']},
        'v0.9.1': {supportedCatalogIds: ['cat-a']},
      },
      a2uiClientDataModel: CLIENT_DM,
      ...SESSION,
    });
  });
});

describe('buildOperationMessageParams', () => {
  it('carries the reader’s press as the composition operation, a data part of its own (task-8.4 decision 14)', () => {
    const params = buildOperationMessageParams({kind: 'include', sources: ['gmail']}, 'ctx', [
      'cat',
    ]);
    expect(params.message!.contextId).toBe('ctx');
    expect(params.message!.parts).toEqual([
      sentPart({
        $case: 'data',
        value: {version: 'v0.9', operation: {kind: 'include', sources: ['gmail']}},
      }),
    ]);
    // It acts on the composition in its context: no data model rides it.
    expect(params.message!.metadata).toEqual({
      a2uiClientCapabilities: {
        'v0.9': {supportedCatalogIds: ['cat']},
        'v0.9.1': {supportedCatalogIds: ['cat']},
      },
      ...SESSION,
    });
  });

  it('a step carries the paint’s data model beside the operation, as an action does (task-9.7 decision 5)', () => {
    const params = buildOperationMessageParams(
      {kind: 'step', sources: ['github'], step: 0},
      'ctx',
      ['cat'],
      CLIENT_DM,
    );
    expect(params.message!.parts).toEqual([
      sentPart({
        $case: 'data',
        value: {version: 'v0.9', operation: {kind: 'step', sources: ['github'], step: 0}},
      }),
    ]);
    expect(params.message!.metadata).toEqual({
      a2uiClientCapabilities: {
        'v0.9': {supportedCatalogIds: ['cat']},
        'v0.9.1': {supportedCatalogIds: ['cat']},
      },
      a2uiClientDataModel: CLIENT_DM,
      ...SESSION,
    });
  });
});

describe('extractA2uiMessagesFromEvent', () => {
  it('extracts version-tagged data parts from a direct agent Message', () => {
    expect(extractA2uiMessagesFromEvent(agentMessage([DATA_PART]))).toEqual([A2UI_DATA]);
  });

  it('extracts from a Task status message', () => {
    expect(extractA2uiMessagesFromEvent(task([DATA_PART]))).toEqual([A2UI_DATA]);
  });

  it('extracts from a TaskStatusUpdateEvent status message', () => {
    expect(extractA2uiMessagesFromEvent(statusUpdate([DATA_PART]))).toEqual([A2UI_DATA]);
  });

  it('ignores TaskArtifactUpdateEvent parts', () => {
    expect(extractA2uiMessagesFromEvent(artifactUpdate([DATA_PART]))).toEqual([]);
  });

  it('filters out text parts and data parts in a version the platform does not speak', () => {
    const event = statusUpdate([TEXT_PART, FOREIGN_PART, DATA_PART]);
    expect(extractA2uiMessagesFromEvent(event)).toEqual([A2UI_DATA]);
  });

  it('returns [] for a Task with no status message', () => {
    expect(extractA2uiMessagesFromEvent(task(undefined))).toEqual([]);
  });
});

describe('the message’s version on the way in and out (task-19.3 decisions 1, 2, 5)', () => {
  const part = (data: Record<string, unknown>): Part => dataPart(data);

  it('takes a message in v0.9 and one in v0.9.1, side by side in one event, in order', () => {
    const event = statusUpdate([DATA_PART, part(A2UI_DATA_V091)]);
    expect(extractA2uiMessagesFromEvent(event)).toEqual([A2UI_DATA, A2UI_DATA_V091]);
  });

  it('passes over a message in a version the platform does not speak, saying nothing', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const foreign = [
      {version: 'v0.8', createSurface: {surfaceId: 'a', catalogId: 'cat'}},
      {version: 'v1.0', createSurface: {surfaceId: 'b', catalogId: 'cat'}},
      {version: '0.9', createSurface: {surfaceId: 'c', catalogId: 'cat'}},
      {createSurface: {surfaceId: 'd', catalogId: 'cat'}},
    ];
    const event = statusUpdate([...foreign.map(part), part(A2UI_DATA_V091)]);
    expect(extractA2uiMessagesFromEvent(event)).toEqual([A2UI_DATA_V091]);
    expect(error).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
    error.mockRestore();
    warn.mockRestore();
  });
});

describe('extractContextId', () => {
  it('reads contextId from each event kind', () => {
    expect(extractContextId(agentMessage([], 'ctx-msg'))).toBe('ctx-msg');
    expect(extractContextId(task([]))).toBe('ctx-task');
    expect(extractContextId(statusUpdate([]))).toBe('ctx-status');
    expect(extractContextId(artifactUpdate([]))).toBe('ctx-artifact');
  });

  it('returns undefined for a Message without one', () => {
    expect(extractContextId(agentMessage([]))).toBeUndefined();
  });
});

describe('extractAgentTextFromEvent', () => {
  it('returns the text of an agent text part', () => {
    expect(extractAgentTextFromEvent(agentMessage([TEXT_PART]))).toEqual(['hello']);
  });

  it('reads the agent text riding a task status message', () => {
    expect(extractAgentTextFromEvent(task([TEXT_PART]))).toEqual(['hello']);
  });

  it('reads the agent text riding a status-update', () => {
    expect(extractAgentTextFromEvent(statusUpdate([TEXT_PART]))).toEqual(['hello']);
  });

  it('ignores data parts, so a surface turn reports no text', () => {
    expect(extractAgentTextFromEvent(agentMessage([DATA_PART]))).toEqual([]);
  });

  it('ignores a user-role message, so the prompt is never echoed into the transcript', () => {
    const userEcho: A2AStreamEventData = {
      payload: {
        $case: 'message',
        value: {...message([TEXT_PART], '', Role.ROLE_USER), messageId: 'm0'},
      },
    };
    expect(extractAgentTextFromEvent(userEcho)).toEqual([]);
  });

  it('returns text verbatim, so the spaces joining stream chunks survive', () => {
    const chunked = agentMessage([textPart('requests on ')]);
    expect(extractAgentTextFromEvent(chunked)).toEqual(['requests on ']);
  });

  it('drops empty parts, which carry nothing to join or render', () => {
    expect(extractAgentTextFromEvent(agentMessage([textPart('')]))).toEqual([]);
  });
});

describe('the canvas on a message (task-9.2 decisions 1, 2)', () => {
  it('a question opens a canvas of its own: no contextId, the parent under the stamp key', () => {
    const params = buildTextMessageParams('what changed?', CLIENT_DM, undefined, 'ctx-parent');
    expect(params.message!.contextId).toBe('');
    expect(params.message!.metadata).toEqual({
      a2uiClientDataModel: CLIENT_DM,
      a2uiverse: {session: PAGE_SESSION, ...CLOCK, parent: 'ctx-parent'},
    });
  });

  it('a root question names no parent', () => {
    const params = buildTextMessageParams('what changed?');
    expect(params.message!.contextId).toBe('');
    expect(params.message!.metadata).toEqual(SESSION);
  });

  it('every message names the page-load session, one id for the page (task-12.5 decision 6)', () => {
    const sessions = [
      buildTextMessageParams('what changed?'),
      buildActionMessageParams(ACTION, 'ctx-9'),
      buildOperationMessageParams({kind: 'retry', sources: ['gmail.1']}, 'ctx-9'),
    ].map(params => (params.message!.metadata as typeof SESSION).a2uiverse.session);
    expect(new Set(sessions)).toEqual(new Set([PAGE_SESSION]));
    expect(PAGE_SESSION).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('an action carries its canvas as the contextId and no parent', () => {
    const params = buildActionMessageParams(ACTION, 'ctx-9', CLIENT_DM);
    expect(params.message!.contextId).toBe('ctx-9');
    expect(params.message!.metadata).toEqual({a2uiClientDataModel: CLIENT_DM, ...SESSION});
  });
});

const PAINT_META_PART: Part = {
  ...dataPart({paintMeta: {surfaceId: 's', title: 'Open PRs — a2ui'}}),
  metadata: {mimeType: 'application/json+a2ui-shell'},
};

describe('paintMeta extraction', () => {
  it('extracts the shell part from a status-update, alongside A2UI parts', () => {
    const event = statusUpdate([PAINT_META_PART, DATA_PART, TEXT_PART]);
    expect(extractPaintMetasFromEvent(event)).toEqual([{surfaceId: 's', title: 'Open PRs — a2ui'}]);
  });

  it('the A2UI extractor never takes a paintMeta part for a protocol message', () => {
    const event = statusUpdate([PAINT_META_PART, DATA_PART]);
    expect(extractA2uiMessagesFromEvent(event)).toEqual([A2UI_DATA]);
  });

  it('carries the question kind through', () => {
    const part: Part = dataPart({
      paintMeta: {surfaceId: 'q', title: 'Which repo?', kind: 'question'},
    });
    expect(extractPaintMetasFromEvent(agentMessage([part]))).toEqual([
      {surfaceId: 'q', title: 'Which repo?', kind: 'question'},
    ]);
  });
});
