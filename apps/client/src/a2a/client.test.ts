import {afterEach, describe, it, expect, vi} from 'vitest';
import type {MessageSendParams} from '@a2a-js/sdk';
import {agentCardUrl, FIRST_EVENT_TIMEOUT_MS, sendAndApply, type A2AMessageSender} from './client';
import type {A2AStreamEventData} from './messages';

describe('agentCardUrl', () => {
  const CARD = '/.well-known/agent-card.json';

  it('appends the card path to a base URL without a trailing slash', () => {
    expect(agentCardUrl('https://host.example')).toBe(`https://host.example${CARD}`);
  });

  it('collapses a trailing slash instead of producing a double slash', () => {
    expect(agentCardUrl('https://host.example/')).toBe(`https://host.example${CARD}`);
  });

  it('collapses multiple trailing slashes', () => {
    expect(agentCardUrl('http://localhost:10002///')).toBe(`http://localhost:10002${CARD}`);
  });
});

describe('sendAndApply — a request that gets no answer (task-7.9)', () => {
  const params = {
    message: {kind: 'message', messageId: 'm-1', role: 'user', parts: []},
  } as unknown as MessageSendParams;
  const event = (text: string) =>
    ({
      kind: 'status-update',
      taskId: 't',
      contextId: 'c',
      final: false,
      status: {
        state: 'working',
        message: {kind: 'message', messageId: text, role: 'agent', parts: [{kind: 'text', text}]},
      },
    }) as unknown as A2AStreamEventData;

  /** A stream that never answers: its first `next` settles only when its signal aborts, by throwing. */
  function silent(signal?: AbortSignal): AsyncGenerator<A2AStreamEventData, void, undefined> {
    const never = new Promise<never>((_, reject) =>
      signal?.addEventListener('abort', () => reject(new Error('aborted')), {once: true}),
    );
    const stream = {
      next: () => never,
      return: () => Promise.resolve({done: true as const, value: undefined}),
      throw: (error: unknown) => Promise.reject(error),
      [Symbol.asyncIterator]: () => stream,
    };
    return stream as unknown as AsyncGenerator<A2AStreamEventData, void, undefined>;
  }

  async function* answering(
    ...texts: string[]
  ): AsyncGenerator<A2AStreamEventData, void, undefined> {
    for (const text of texts) yield event(text);
  }

  afterEach(() => vi.useRealTimers());

  it('says when the first event arrives — a throw after it is a stream that broke (task 8.5)', async () => {
    const reached = vi.fn();
    const sender: A2AMessageSender = {sendMessageStream: () => answering('one', 'two')};
    await sendAndApply(sender, params, {apply: () => {}, onFirstEvent: reached});
    expect(reached).toHaveBeenCalledOnce();
  });

  it('is aborted and sent once more under the same message id; the second answer is applied', async () => {
    vi.useFakeTimers();
    const sent: MessageSendParams[] = [];
    const sender: A2AMessageSender = {
      sendMessageStream(p, options) {
        sent.push(p);
        return sent.length === 1 ? silent(options?.signal) : answering('hello');
      },
    };
    const heard: string[] = [];
    const done = sendAndApply(sender, params, {apply: () => {}, onAgentText: t => heard.push(t)});
    await vi.advanceTimersByTimeAsync(FIRST_EVENT_TIMEOUT_MS);
    await done;
    expect(sent).toHaveLength(2);
    expect(sent[1]).toBe(params);
    expect(heard).toEqual(['hello']);
  });

  it('fails when the second send gets no answer either', async () => {
    vi.useFakeTimers();
    let sends = 0;
    const sender: A2AMessageSender = {
      sendMessageStream: (_p, options) => (sends++, silent(options?.signal)),
    };
    const done = sendAndApply(sender, params, {apply: () => {}});
    const failure = expect(done).rejects.toThrow(/did not answer/);
    await vi.advanceTimersByTimeAsync(FIRST_EVENT_TIMEOUT_MS * 2);
    await failure;
    expect(sends).toBe(2);
  });

  it('never cuts a stream that has answered, however long it then goes quiet', async () => {
    vi.useFakeTimers();
    let sends = 0;
    async function* slow(): AsyncGenerator<A2AStreamEventData, void, undefined> {
      yield event('first paint');
      // Dead air: the Synthesizer's call, longer than the limit.
      await new Promise(resolve => setTimeout(resolve, FIRST_EVENT_TIMEOUT_MS * 3));
      yield event('merged view');
    }
    const sender: A2AMessageSender = {sendMessageStream: () => (sends++, slow())};
    const heard: string[] = [];
    const done = sendAndApply(sender, params, {apply: () => {}, onAgentText: t => heard.push(t)});
    await vi.advanceTimersByTimeAsync(FIRST_EVENT_TIMEOUT_MS * 4);
    await done;
    expect(sends).toBe(1);
    expect(heard).toEqual(['first paint', 'merged view']);
  });

  it("the caller's cancel is not a silence: it throws through, and nothing is sent again", async () => {
    vi.useFakeTimers();
    let sends = 0;
    const sender: A2AMessageSender = {
      sendMessageStream: (_p, options) => (sends++, silent(options?.signal)),
    };
    const cancel = new AbortController();
    const done = sendAndApply(sender, params, {apply: () => {}, signal: cancel.signal});
    const failure = expect(done).rejects.toThrow('aborted');
    cancel.abort();
    await failure;
    await vi.advanceTimersByTimeAsync(FIRST_EVENT_TIMEOUT_MS * 2);
    expect(sends).toBe(1);
  });
});

describe("sendAndApply — an app's reply said once (task 18.5.2)", () => {
  const params = {
    message: {kind: 'message', messageId: 'm-1', role: 'user', parts: []},
  } as unknown as MessageSendParams;
  const stamped = (source: string, part: unknown) =>
    ({
      kind: 'status-update',
      taskId: 't',
      contextId: 'c',
      final: false,
      metadata: {a2uiverse: {source, role: 'fragment'}},
      status: {
        state: 'working',
        message: {kind: 'message', messageId: crypto.randomUUID(), role: 'agent', parts: [part]},
      },
    }) as unknown as A2AStreamEventData;
  const say = (source: string, text: string) => stamped(source, {kind: 'text', text});
  const paint = (source: string) =>
    stamped(source, {
      kind: 'data',
      data: {version: 'v0.9', createSurface: {surfaceId: `${source}:default`, catalogId: 'basic'}},
    });

  /** The words passed on, by source, over one answer per list of events. */
  async function heard(...answers: A2AStreamEventData[][]) {
    const words: [string, string | undefined][] = [];
    for (const events of answers) {
      const sender = {
        async *sendMessageStream() {
          yield* events;
        },
      } as unknown as A2AMessageSender;
      await sendAndApply(sender, params, {
        apply: () => {},
        onAgentText: (text, stamp) => words.push([text, stamp?.source]),
      });
    }
    return words;
  }

  it('a reply said whole again after its paint is passed on once', async () => {
    expect(
      await heard([
        say('rf', 'Here is your booking'),
        say('rf', ' confirmation:'),
        paint('rf'),
        say('rf', 'Here is your booking confirmation:'),
        paint('rf'),
      ]),
    ).toEqual([
      ['Here is your booking', 'rf'],
      [' confirmation:', 'rf'],
    ]);
  });

  it('a reply whose words follow its paint, said whole again, is passed on once', async () => {
    expect(
      await heard([
        paint('rf'),
        say('rf', 'Your reservation has been confirmed!'),
        paint('rf'),
        say('rf', 'Your reservation has been confirmed!'),
      ]),
    ).toEqual([['Your reservation has been confirmed!', 'rf']]);
  });

  it('the same words in a new answer are passed on again', async () => {
    expect(
      await heard([say('rf', 'Done.'), paint('rf')], [say('rf', 'Done.'), paint('rf')]),
    ).toEqual([
      ['Done.', 'rf'],
      ['Done.', 'rf'],
    ]);
  });

  it("another app's same words are its own", async () => {
    expect(await heard([say('a', 'Done.'), paint('a'), say('b', 'Done.')])).toEqual([
      ['Done.', 'a'],
      ['Done.', 'b'],
    ]);
  });
});
