import {describe, it, expect} from 'vitest';
import type {
  Message,
  Part,
  Task,
  TaskArtifactUpdateEvent,
  TaskStatusUpdateEvent,
} from '@a2a-js/sdk';
import type {A2uiClientAction, A2uiClientDataModel} from '@a2ui/web_core/v0_9';
import type {ForkContext} from './messages';
import {
  buildActionMessageParams,
  buildTextMessageParams,
  extractA2uiMessages,
  extractA2uiMessagesFromEvent,
  extractAgentTextFromEvent,
  extractContextId,
  extractPaintMetasFromEvent,
  paintMetaOf,
} from './messages';

const A2UI_DATA = {version: 'v0.9', createSurface: {surfaceId: 's', catalogId: 'cat'}};
const DATA_PART: Part = {kind: 'data', data: A2UI_DATA};
const TEXT_PART: Part = {kind: 'text', text: 'hello'};
const FOREIGN_PART: Part = {kind: 'data', data: {version: 'v0.8', foo: 1}};

const ACTION = {name: 'click', surfaceId: 's'} as unknown as A2uiClientAction;

const CLIENT_DM = {
  version: 'v0.9',
  surfaces: {s: {prs: [{title: 'one', selected: true}]}},
} as unknown as A2uiClientDataModel;

function agentMessage(parts: Part[], contextId?: string): Message {
  return {kind: 'message', role: 'agent', messageId: 'm1', parts, contextId};
}

function task(parts: Part[] | undefined, contextId = 'ctx-task'): Task {
  return {
    kind: 'task',
    id: 't1',
    contextId,
    status: {state: 'completed', message: parts ? agentMessage(parts) : undefined},
  };
}

function statusUpdate(parts: Part[] | undefined, contextId = 'ctx-status'): TaskStatusUpdateEvent {
  return {
    kind: 'status-update',
    taskId: 't1',
    contextId,
    final: false,
    status: {state: 'working', message: parts ? agentMessage(parts) : undefined},
  };
}

function artifactUpdate(parts: Part[]): TaskArtifactUpdateEvent {
  return {
    kind: 'artifact-update',
    taskId: 't1',
    contextId: 'ctx-artifact',
    artifact: {artifactId: 'a1', parts},
  };
}

describe('buildTextMessageParams', () => {
  it('wraps user text as a single TextPart user message', () => {
    const params = buildTextMessageParams('show me open PRs');
    expect(params.message.kind).toBe('message');
    expect(params.message.role).toBe('user');
    expect(params.message.messageId).toBeTruthy();
    expect(params.message.parts).toEqual([{kind: 'text', text: 'show me open PRs'}]);
    expect(params.message.contextId).toBeUndefined();
  });

  it('threads a contextId when given', () => {
    const params = buildTextMessageParams('again', 'ctx-9');
    expect(params.message.contextId).toBe('ctx-9');
  });

  it('attaches the client data model as message metadata when given', () => {
    const params = buildTextMessageParams('show', 'ctx-9', CLIENT_DM);
    expect(params.message.metadata).toEqual({a2uiClientDataModel: CLIENT_DM});
  });

  it('omits metadata when no client data model is given', () => {
    expect(buildTextMessageParams('show').message.metadata).toBeUndefined();
  });

  it('advertises the supported catalogs as a2uiClientCapabilities when given', () => {
    const params = buildTextMessageParams('show', undefined, undefined, undefined, ['cat-a']);
    expect(params.message.metadata).toEqual({
      a2uiClientCapabilities: {'v0.9': {supportedCatalogIds: ['cat-a']}},
    });
  });
});

describe('buildActionMessageParams', () => {
  it('wraps the action as a version-tagged DataPart without a contextId by default', () => {
    const params = buildActionMessageParams(ACTION);
    expect(params.message.parts).toEqual([{kind: 'data', data: {version: 'v0.9', action: ACTION}}]);
    expect(params.message.contextId).toBeUndefined();
  });

  it('threads a contextId when given', () => {
    const params = buildActionMessageParams(ACTION, 'ctx-9');
    expect(params.message.contextId).toBe('ctx-9');
  });

  it('attaches the client data model as message metadata when given', () => {
    const params = buildActionMessageParams(ACTION, 'ctx-9', CLIENT_DM);
    expect(params.message.metadata).toEqual({a2uiClientDataModel: CLIENT_DM});
  });

  it('omits metadata when no client data model is given', () => {
    expect(buildActionMessageParams(ACTION).message.metadata).toBeUndefined();
  });

  it('advertises the supported catalogs alongside the data model', () => {
    const params = buildActionMessageParams(ACTION, 'ctx-9', CLIENT_DM, undefined, ['cat-a']);
    expect(params.message.metadata).toEqual({
      a2uiClientCapabilities: {'v0.9': {supportedCatalogIds: ['cat-a']}},
      a2uiClientDataModel: CLIENT_DM,
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

  it('filters out text parts and non-v0.9 data parts', () => {
    const event = statusUpdate([TEXT_PART, FOREIGN_PART, DATA_PART]);
    expect(extractA2uiMessagesFromEvent(event)).toEqual([A2UI_DATA]);
  });

  it('returns [] for a Task with no status message', () => {
    expect(extractA2uiMessagesFromEvent(task(undefined))).toEqual([]);
  });
});

describe('extractA2uiMessages (terminal result)', () => {
  it('still extracts from a completed Task', () => {
    expect(extractA2uiMessages(task([DATA_PART]))).toEqual([A2UI_DATA]);
  });

  it('still extracts from a direct agent Message', () => {
    expect(extractA2uiMessages(agentMessage([DATA_PART]))).toEqual([A2UI_DATA]);
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
    const userEcho: Message = {kind: 'message', role: 'user', messageId: 'm0', parts: [TEXT_PART]};
    expect(extractAgentTextFromEvent(userEcho)).toEqual([]);
  });

  it('returns text verbatim, so the spaces joining stream chunks survive', () => {
    const chunked = agentMessage([{kind: 'text', text: 'requests on '}]);
    expect(extractAgentTextFromEvent(chunked)).toEqual(['requests on ']);
  });

  it('drops empty parts, which carry nothing to join or render', () => {
    expect(extractAgentTextFromEvent(agentMessage([{kind: 'text', text: ''}]))).toEqual([]);
  });
});

const FORK: ForkContext = {
  paintId: 4,
  title: 'Open PRs — a2ui',
  paintedAt: 1755230000000,
  position: 3,
};

describe('fork context metadata (task 8.5)', () => {
  it('rides beside the client data model on an action message', () => {
    const params = buildActionMessageParams(ACTION, 'ctx-9', CLIENT_DM, FORK);
    expect(params.message.metadata).toEqual({
      a2uiClientDataModel: CLIENT_DM,
      a2uiForkContext: FORK,
    });
  });

  it('rides alone when no data model is reported', () => {
    const params = buildActionMessageParams(ACTION, 'ctx-9', undefined, FORK);
    expect(params.message.metadata).toEqual({a2uiForkContext: FORK});
  });

  it('rides on a text message too — a parked utterance is also a fork', () => {
    const params = buildTextMessageParams('what changed?', 'ctx-9', CLIENT_DM, FORK);
    expect(params.message.metadata).toEqual({
      a2uiClientDataModel: CLIENT_DM,
      a2uiForkContext: FORK,
    });
  });

  it('a live dispatch carries no fork key', () => {
    const params = buildActionMessageParams(ACTION, 'ctx-9', CLIENT_DM);
    expect(params.message.metadata).toEqual({a2uiClientDataModel: CLIENT_DM});
  });
});

const PAINT_META_PART: Part = {
  kind: 'data',
  data: {paintMeta: {surfaceId: 's', title: 'Open PRs — a2ui'}},
  metadata: {mimeType: 'application/json+a2ui-shell'},
};

describe('paintMeta extraction (task 8.5)', () => {
  it('extracts the shell part from a status-update, alongside A2UI parts', () => {
    const event = statusUpdate([PAINT_META_PART, DATA_PART, TEXT_PART]);
    expect(extractPaintMetasFromEvent(event)).toEqual([{surfaceId: 's', title: 'Open PRs — a2ui'}]);
  });

  it('the A2UI extractor never takes a paintMeta part for a protocol message', () => {
    const event = statusUpdate([PAINT_META_PART, DATA_PART]);
    expect(extractA2uiMessagesFromEvent(event)).toEqual([A2UI_DATA]);
  });

  it('carries the question kind through', () => {
    const part: Part = {
      kind: 'data',
      data: {paintMeta: {surfaceId: 'q', title: 'Which repo?', kind: 'question'}},
    };
    expect(extractPaintMetasFromEvent(agentMessage([part]))).toEqual([
      {surfaceId: 'q', title: 'Which repo?', kind: 'question'},
    ]);
  });

  it('rejects malformed metas', () => {
    expect(paintMetaOf({paintMeta: {title: 'no surface'}})).toBeUndefined();
    expect(paintMetaOf({paintMeta: {surfaceId: 42}})).toBeUndefined();
    expect(paintMetaOf({paintMeta: 'nope'})).toBeUndefined();
    expect(paintMetaOf(A2UI_DATA)).toBeUndefined();
    expect(paintMetaOf(null)).toBeUndefined();
  });

  it('drops empty title and kind rather than carrying empty strings', () => {
    expect(paintMetaOf({paintMeta: {surfaceId: 's', title: '', kind: ''}})).toEqual({
      surfaceId: 's',
    });
  });
});
