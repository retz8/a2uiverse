/**
 * The plan cache (task-17.6 decisions 7–12): a plan the Planner wrote, handed back when the very
 * same request comes again. Its key is a hash of everything the model would receive — the fixed
 * system prompt, the tools, the turn as built with each shortlisted card and its accounts, the
 * model and the effort — so a hit is a request byte for byte the same, and any change to them
 * misses on its own. A plan is stored once a turn it led closes clean, and thrown out once a
 * reuse fails the validator or an app it asked fails. It lives on disk beside the journal, the
 * least recently used leaving past the cap, none reused past its age. Nothing here breaks a turn:
 * a file that cannot be read or written leaves the Planner to plan.
 */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {mkdir, rename, writeFile} from 'node:fs/promises';
import {dirname} from 'node:path';
import {asSchema, type LanguageModel, type ToolSet} from 'ai';
import type {JournalEntry} from '../journal/types.js';
import {logLine} from '../log.js';
import {layoutSurfaceBlock} from './prompt.js';

/** The plan cache's file in the state directory. */
export const PLAN_CACHE_FILE = 'plan-cache.json';
/** How many plans it holds: a starting value with no source behind it (task-17.6 decision 9). */
export const PLAN_CACHE_SIZE = 200;
/** How old a plan may be and still be reused: a starting value with no source behind it (decision 9). */
export const PLAN_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** On a plan's outcome and its record: its request's key, and whether the cache served it. */
export interface PlanCacheMark {
  key: string;
  hit?: true;
}

interface Stored {
  key: string;
  /** The plan as used, as the model answers with it, re-checked by the validator on every reuse. */
  text: string;
  storedAt: number;
}

export interface PlanCacheOptions {
  now?: () => number;
  size?: number;
  maxAgeMs?: number;
}

export class PlanCache {
  readonly #path: string;
  readonly #now: () => number;
  readonly #size: number;
  readonly #maxAgeMs: number;
  /** In use order, the least recently used first. */
  readonly #plans = new Map<string, Stored>();
  #saving: Promise<void> = Promise.resolve();

  constructor(path: string, options: PlanCacheOptions = {}) {
    this.#path = path;
    this.#now = options.now ?? Date.now;
    this.#size = options.size ?? PLAN_CACHE_SIZE;
    this.#maxAgeMs = options.maxAgeMs ?? PLAN_CACHE_MAX_AGE_MS;
    for (const plan of readPlans(path)) this.#plans.set(plan.key, plan);
  }

  /** The plan stored for this request, unless it has aged out; reading it makes it the most recently used. */
  get(key: string): string | undefined {
    const plan = this.#plans.get(key);
    if (plan === undefined) return undefined;
    this.#plans.delete(key);
    if (this.#now() - plan.storedAt > this.#maxAgeMs) {
      this.#save();
      return undefined;
    }
    this.#plans.set(key, plan);
    this.#save();
    return plan.text;
  }

  store(key: string, text: string): void {
    this.#plans.delete(key);
    this.#plans.set(key, {key, text, storedAt: this.#now()});
    for (const oldest of this.#plans.keys()) {
      if (this.#plans.size <= this.#size) break;
      this.#plans.delete(oldest);
    }
    this.#save();
  }

  evict(key: string, why: string): void {
    if (!this.#plans.delete(key)) return;
    logLine(`plan cache: a plan thrown out — ${why}`);
    this.#save();
  }

  /**
   * A closed turn decides (task-17.6 decision 8): a plan the cache served is thrown out when an app
   * it asked failed; a plan the model wrote, with no tool called, is stored when every app it asked
   * answered or asked the person to sign in. A turn the person closed decides nothing. What is
   * stored is the plan as used — after a retry on the layout alone, the first answer's list with
   * the retry's layout (task-17.9 decision 11).
   */
  settle(entry: JournalEntry): void {
    const plan = entry.plan;
    const mark = plan?.cache;
    if (plan === undefined || mark === undefined || plan.outcome !== 'planned' || entry.closed) {
      return;
    }
    const clean = entry.dispatch.every(
      d =>
        d.outcome === 'completed' ||
        (d.authority !== undefined && d.cause === undefined && d.update === undefined),
    );
    if (mark.hit) {
      if (!clean) this.evict(mark.key, 'an app it asked failed');
      return;
    }
    const text = plan.layoutSurface
      ? layoutSurfaceBlock(plan.layoutSurface)
      : plan.attempts.at(-1)?.text;
    if (clean && plan.toolCalls.length === 0 && text !== undefined) this.store(mark.key, text);
  }

  /** Written whole after each change, one write after another; a failed write is a log line. */
  #save(): void {
    const plans = [...this.#plans.values()];
    this.#saving = this.#saving.then(async () => {
      try {
        await mkdir(dirname(this.#path), {recursive: true});
        const tmp = `${this.#path}.tmp`;
        await writeFile(tmp, JSON.stringify({plans}));
        await rename(tmp, this.#path);
      } catch (err) {
        logLine(`plan cache: not written — ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  }

  /** Resolves once every write so far has landed. */
  async flushed(): Promise<void> {
    await this.#saving;
  }
}

function readPlans(path: string): Stored[] {
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return [];
  }
  try {
    const plans = (JSON.parse(raw) as {plans?: unknown}).plans;
    return Array.isArray(plans) ? plans.filter(isStored) : [];
  } catch (err) {
    logLine(
      `plan cache: not read, starting empty — ${err instanceof Error ? err.message : String(err)}`,
    );
    return [];
  }
}

function isStored(value: unknown): value is Stored {
  const plan = value as Partial<Stored> | null;
  return (
    typeof plan?.key === 'string' &&
    typeof plan.text === 'string' &&
    typeof plan.storedAt === 'number'
  );
}

/** The request the model would receive, hashed (task-17.6 decision 7). */
export async function planKey(parts: {
  model: LanguageModel;
  reasoning?: string;
  system: string;
  tools: ToolSet;
  turn: string;
}): Promise<string> {
  const tools = await Promise.all(
    Object.entries(parts.tools).map(async ([name, tool]) => [
      name,
      tool.description ?? null,
      await asSchema(tool.inputSchema).jsonSchema,
    ]),
  );
  const model =
    typeof parts.model === 'string'
      ? parts.model
      : `${parts.model.provider}/${parts.model.modelId}`;
  return createHash('sha256')
    .update(
      JSON.stringify({
        model,
        reasoning: parts.reasoning ?? null,
        system: parts.system,
        tools,
        turn: parts.turn,
      }),
    )
    .digest('hex');
}
