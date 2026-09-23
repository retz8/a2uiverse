/**
 * The transport a beat's streams beside the turn replay over (task-8.6 decisions 1, 2): it stands
 * where the orchestrator stands for the wiring's side sends — a press, a failure report, a shell
 * action's report — and answers each from the beat's recorded stream, turned back into the A2A
 * events the real handler reads. A press is answered by the stream armed for it; a failure report by
 * the next recorded answer to one; anything else by a stream that answers and says nothing, as the
 * hub answers a shell action.
 *
 * Every answer opens at once with the task, as the hub publishes a turn's task before any work
 * runs, so the handler takes the request for arrived however late the first paint comes. A press's
 * batches are pushed by the replay at their place on the beat's clock; a report's answer paces
 * itself from its own send, since the client decides when it reports.
 */
import type {MessageSendParams, Task, TaskStatusUpdateEvent} from '@a2a-js/sdk';
import {STAMP_KEY, SYNTHESIS_KEY} from '@a2uiverse/sdk';
import type {A2AMessageSender} from '../a2a/client';
import type {A2AStreamEventData} from '../a2a/messages';
import type {BeatBatch, BeatTurn} from '../beats/beatFixtures';

/** A recorded stream the replay feeds one batch at a time. */
export interface ReplayChannel {
  /** Deliver one batch; settles once the handler has taken it, or the stream is gone. */
  push(batch: BeatBatch): Promise<void>;
  /** The stream ends: the handler's loop finishes as it does on the hub's last event. */
  close(): void;
  /** Nothing will read the stream — the press was never sent: every push settles at once. */
  abandon(): void;
}

export interface ReplayTransport {
  sender: A2AMessageSender;
  /** The next press sent is answered on this channel. */
  armPress(): ReplayChannel;
  /** The recorded answers to the client's failure reports, taken in order as the client reports. */
  queueReports(turns: readonly BeatTurn[], paced: boolean): void;
  /** Settles once every report's answer has played out. */
  settled(): Promise<void>;
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** One recorded batch as the hub's event: a working status-update carrying its parts and stamp. */
export function eventOfBatch(batch: BeatBatch, taskId: string, contextId: string) {
  const event: TaskStatusUpdateEvent = {
    kind: 'status-update',
    taskId,
    contextId,
    final: false,
    status: {
      state: 'working',
      message: {
        kind: 'message',
        role: 'agent',
        messageId: crypto.randomUUID(),
        // Fresh objects, as a real stream delivers them (see `replayBeatOnCanvas`).
        parts: [
          ...structuredClone(batch.messages).map(message => ({
            kind: 'data' as const,
            data: message as unknown as Record<string, unknown>,
          })),
          ...batch.texts.map(text => ({kind: 'text' as const, text})),
        ],
      },
    },
    metadata: {
      ...(batch.stamp ? {[STAMP_KEY]: batch.stamp} : {}),
      ...(batch.synthesis ? {[SYNTHESIS_KEY]: structuredClone(batch.synthesis)} : {}),
    },
  };
  return event;
}

const taskEvent = (taskId: string, contextId: string): Task => ({
  kind: 'task',
  id: taskId,
  contextId,
  status: {state: 'submitted'},
});

type Item = {batch: BeatBatch; taken: () => void};

/** A channel the replay pushes into and the handler's stream reads from. */
function createChannel(): ReplayChannel & {
  stream(signal: AbortSignal | undefined, contextId: string): AsyncGenerator<A2AStreamEventData>;
} {
  const queue: Item[] = [];
  let closed = false;
  let gone = false;
  let wake: (() => void) | null = null;
  const nudge = () => {
    wake?.();
    wake = null;
  };
  const drop = () => {
    gone = true;
    for (const item of queue.splice(0)) item.taken();
    nudge();
  };
  return {
    push(batch) {
      if (gone) return Promise.resolve();
      return new Promise<void>(taken => {
        queue.push({batch, taken});
        nudge();
      });
    },
    close() {
      closed = true;
      nudge();
    },
    abandon: drop,
    async *stream(signal, contextId) {
      const taskId = `replay-${crypto.randomUUID()}`;
      const abort = () => drop();
      signal?.addEventListener('abort', abort, {once: true});
      let last: Item | undefined;
      try {
        yield taskEvent(taskId, contextId);
        for (;;) {
          // The handler asked for the next event: the one before it is applied.
          last?.taken();
          last = undefined;
          if (signal?.aborted) throw signal.reason ?? new Error('aborted');
          const item = queue.shift();
          if (item) {
            last = item;
            yield eventOfBatch(item.batch, taskId, contextId);
            continue;
          }
          if (closed) return;
          await new Promise<void>(resolve => (wake = resolve));
        }
      } finally {
        signal?.removeEventListener('abort', abort);
        last?.taken();
        drop();
      }
    },
  };
}

/** The data part a sent message carries: an operation, a client error, or neither. */
function sentKind(params: MessageSendParams): 'press' | 'report' | 'other' {
  for (const part of params.message.parts) {
    if (part.kind !== 'data') continue;
    if ('operation' in part.data) return 'press';
    if ('error' in part.data) return 'report';
  }
  return 'other';
}

export function createReplayTransport(contextId = 'ctx-replay'): ReplayTransport {
  let armed: ReturnType<typeof createChannel> | null = null;
  const reports: Array<{turn: BeatTurn; paced: boolean}> = [];
  const playing = new Set<Promise<void>>();

  /** A report's recorded answer, played from its own send. */
  const playReport = (channel: ReplayChannel, turn: BeatTurn, paced: boolean) => {
    const run = (async () => {
      let elapsed = 0;
      for (const batch of turn.batches) {
        if (paced && batch.offsetMs > elapsed) {
          await sleep(batch.offsetMs - elapsed);
          elapsed = batch.offsetMs;
        }
        await channel.push(batch);
      }
      channel.close();
    })();
    playing.add(run);
    void run.finally(() => playing.delete(run));
  };

  const sender: A2AMessageSender = {
    sendMessageStream(params, options) {
      const kind = sentKind(params);
      let channel: ReturnType<typeof createChannel>;
      if (kind === 'press' && armed) {
        channel = armed;
        armed = null;
      } else {
        channel = createChannel();
        const next = kind === 'report' ? reports.shift() : undefined;
        if (next) playReport(channel, next.turn, next.paced);
        else channel.close();
      }
      return channel.stream(options?.signal, contextId);
    },
  };

  return {
    sender,
    armPress() {
      armed = createChannel();
      return armed;
    },
    queueReports(turns, paced) {
      for (const turn of turns) reports.push({turn, paced});
    },
    async settled() {
      while (playing.size > 0) await Promise.all([...playing]);
    },
  };
}
