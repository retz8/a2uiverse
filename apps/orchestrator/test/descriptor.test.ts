import {describe, expect, test} from 'vitest';
import type {Message} from '@a2a-js/sdk';
import {describe as describeMessage} from '../src/journal/descriptor.js';

function msg(parts: Message['parts']): Message {
  return {kind: 'message', messageId: 'm', role: 'user', parts};
}

describe('describe', () => {
  test('palette utterance: text parts verbatim, joined by newline', () => {
    const out = describeMessage(
      msg([
        {kind: 'text', text: 'open PRs '},
        {kind: 'text', text: 'for me'},
      ]),
      'github',
    );
    expect(out).toEqual({kind: 'utterance', descriptor: 'open PRs \nfor me'});
  });

  test('surface action: rendered sentence naming action, surface, app, plus the payload', () => {
    const action = {name: 'approve', surfaceId: 'pr-1', context: {prNumber: 42}};
    const out = describeMessage(msg([{kind: 'data', data: {version: 'v0.9', action}}]), 'github');
    expect(out).toEqual({
      kind: 'action',
      descriptor: 'approve on surface pr-1 in github',
      payload: {prNumber: 42},
    });
  });

  test('unknown shape: JSON of the parts', () => {
    const parts: Message['parts'] = [{kind: 'data', data: {something: 1}}];
    const out = describeMessage(msg(parts), 'github');
    expect(out).toEqual({kind: 'unknown', descriptor: JSON.stringify(parts)});
  });
});
