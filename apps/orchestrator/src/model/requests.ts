/**
 * The orchestrator's measurement (task 17.5): one record per model request the Planner and the
 * Synthesizer make, the counterpart of the kit's (task 17.3). The numbers are the AI SDK's own,
 * read off each step's result — the time waiting on the model, each tool call's execution time,
 * how the step finished and its usage (decision 2) — with no clock of the orchestrator's beyond
 * the instant an attempt starts, which places its requests on the record's clock (decision 1).
 * Each request is logged as it ends (decision 4).
 *
 * Measurement is diagnostics: nothing here throws into a turn.
 */
import type {StepResult, ToolSet} from 'ai';
import {logLine} from '../log.js';
import type {Seam} from './getModel.js';

/** The four counts the provider's usage is read for, each absent when the provider gave none. */
export interface RequestUsage {
  promptTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cachedTokens?: number;
}

/**
 * One model request (task-17.5 decisions 1–3): its attempt and its step within the attempt, both
 * from 1; the model the SDK names for its step; its start and end on the record's clock — the
 * plan's from the utterance arriving, the synthesis's from its release; the time waiting on the
 * model; how it ended, with the SDK's finish reason and the tools it called; its usage.
 */
export interface ModelRequestRecord {
  attempt: number;
  step: number;
  model: {provider: string; modelId: string};
  startMs: number;
  endMs: number;
  modelMs: number;
  ended: 'text' | 'toolCall' | 'error';
  finish: string;
  tools?: string[];
  usage?: RequestUsage;
}

/**
 * Where a turn's requests sit: the instant its clock starts — the utterance arriving for a plan,
 * the release for a synthesis — and the task its log lines name.
 */
export interface RequestClock {
  origin: number;
  task?: string;
}

/** The step's measurement as the SDK gives it, before the attempt places it on a clock. */
export interface StepMeasure {
  model: {provider: string; modelId: string};
  modelMs: number;
  stepMs: number;
  ended: ModelRequestRecord['ended'];
  finish: string;
  tools: {name: string; ms?: number}[];
  usage?: RequestUsage;
}

/** One step's result read for its measure. */
export function measureOf(step: StepResult<ToolSet>): StepMeasure {
  const performance = step.performance;
  const executed = performance?.toolExecutionMs ?? {};
  const tools = step.toolCalls.map(call => {
    const ms = wholeMs(executed[call.toolCallId]);
    return {name: call.toolName, ...(ms !== undefined ? {ms} : {})};
  });
  const ended = tools.length > 0 ? 'toolCall' : step.text.length > 0 ? 'text' : 'error';
  const usage = usageOf(step.usage);
  return {
    model: {provider: step.model.provider, modelId: step.model.modelId},
    modelMs: wholeMs(performance?.responseTimeMs) ?? 0,
    stepMs: wholeMs(performance?.stepTimeMs ?? performance?.responseTimeMs) ?? 0,
    ended,
    finish: step.finishReason,
    tools,
    ...(usage ? {usage} : {}),
  };
}

/** The SDK times on a high-resolution clock; the records keep whole milliseconds, as the journal's others. */
export function wholeMs(ms: number | undefined): number | undefined {
  return ms === undefined ? undefined : Math.round(ms);
}

function usageOf(usage: StepResult<ToolSet>['usage'] | undefined): RequestUsage | undefined {
  if (!usage) return undefined;
  const counts: RequestUsage = {
    ...(usage.inputTokens !== undefined ? {promptTokens: usage.inputTokens} : {}),
    ...(usage.outputTokens !== undefined ? {outputTokens: usage.outputTokens} : {}),
    ...(usage.outputTokenDetails?.reasoningTokens !== undefined
      ? {reasoningTokens: usage.outputTokenDetails.reasoningTokens}
      : {}),
    ...(usage.inputTokenDetails?.cacheReadTokens !== undefined
      ? {cachedTokens: usage.inputTokenDetails.cacheReadTokens}
      : {}),
  };
  return Object.keys(counts).length > 0 ? counts : undefined;
}

/**
 * One attempt's requests, in order: the attempt's start read on the record's clock, each step
 * after it placed where the steps before it ended — the SDK runs them one after another.
 */
export class AttemptMeasurement {
  readonly records: ModelRequestRecord[] = [];
  readonly #seam: Seam;
  readonly #attempt: number;
  readonly #clock: RequestClock;
  readonly #startedAt = Date.now();
  #next: number;

  constructor(seam: Seam, attempt: number, clock: RequestClock | undefined) {
    this.#seam = seam;
    this.#attempt = attempt;
    this.#clock = clock ?? {origin: this.#startedAt};
    this.#next = this.#startedAt - this.#clock.origin;
  }

  /** The SDK's step end, read for its measure; a step that cannot be read is left out. */
  take(step: StepResult<ToolSet>): void {
    try {
      this.step(measureOf(step));
    } catch {
      // Diagnostics only: the turn goes on without this record.
    }
  }

  /** A step that ended: recorded, its line logged. */
  step(measure: StepMeasure): ModelRequestRecord {
    const record: ModelRequestRecord = {
      attempt: this.#attempt,
      step: this.records.length + 1,
      model: measure.model,
      startMs: this.#next,
      endMs: this.#next + measure.modelMs,
      modelMs: measure.modelMs,
      ended: measure.ended,
      finish: measure.finish,
      ...(measure.tools.length > 0 ? {tools: measure.tools.map(tool => tool.name)} : {}),
      ...(measure.usage ? {usage: measure.usage} : {}),
    };
    this.#next += measure.stepMs;
    this.records.push(record);
    logLine(requestLine(this.#seam, this.#clock.task, record, measure.tools));
    return record;
  }

  /** A request that threw: no step result, so only its line, with the time since the attempt began. */
  failed(err: unknown): void {
    const ms = Date.now() - this.#startedAt;
    const why = err instanceof Error ? err.message : String(err);
    logLine(
      `${this.#seam} request${task(this.#clock.task)} ${this.#attempt}.${this.records.length + 1}: ` +
        `error after ${ms} ms in the attempt — ${why}`,
    );
  }
}

function task(id: string | undefined): string {
  return id !== undefined ? ` task=${id}` : '';
}

/** The log line of one request (decision 4), as the kit's reads: the numbers, then the usage. */
export function requestLine(
  seam: Seam,
  taskId: string | undefined,
  record: ModelRequestRecord,
  tools: readonly {name: string; ms?: number}[] = [],
): string {
  const ended =
    record.ended === 'toolCall'
      ? `ended in toolCall (${tools.map(t => (t.ms !== undefined ? `${t.name} ${t.ms} ms` : t.name)).join(', ')})`
      : `ended in ${record.ended}`;
  const finish =
    record.finish === 'stop' || record.finish === 'tool-calls' ? '' : ` [${record.finish}]`;
  const usage = record.usage
    ? (
        [
          ['promptTokens', 'prompt'],
          ['outputTokens', 'output'],
          ['reasoningTokens', 'reasoning'],
          ['cachedTokens', 'cached'],
        ] as const
      )
        .filter(([key]) => record.usage?.[key] !== undefined)
        .map(([key, word]) => `${record.usage?.[key]} ${word}`)
        .join(' / ') + ' tokens'
    : 'no usage reported';
  return (
    `${seam} request${task(taskId)} ${record.attempt}.${record.step} on ${record.model.modelId}: ` +
    `model ${record.modelMs} ms at ${record.startMs} ms, ${ended}${finish}, ${usage}`
  );
}
