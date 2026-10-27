import {resolve} from 'node:path';
import {parseFaults, type FaultMap} from './agentsPool/faults.js';
import {
  DEFAULT_PLANNER_MODEL_ID,
  DEFAULT_SYNTHESIZER_MODEL_ID,
  parseModelName,
} from './model/getModel.js';

export interface Config {
  port: number;
  /** Advertised in the agent card; the tunnel URL in tunnel sessions. */
  baseUrl: string;
  /** The orchestrator's local state directory: the registry, the intent journal, the model cache. */
  stateDir: string;
  /** Include vendor ids under the source stamp (debugging only). */
  debugIds: boolean;
  /** Google AI Studio key (`GOOGLE_API_KEY`, the a2ui-github convention): the key of a Gemini model. */
  googleApiKey: string | undefined;
  /** Anthropic key (`ANTHROPIC_API_KEY`): the key of a Claude model (task-17.2 decision 3). */
  anthropicApiKey: string | undefined;
  /** Planner model (`A2UIVERSE_PLANNER_MODEL`): `provider/model`, a bare name being Gemini (task-17.2 decision 2). */
  plannerModelId: string;
  /** Planner effort tunable (`A2UIVERSE_PLANNER_EFFORT`); starts below default — latency is time-to-first-paint. */
  plannerEffort: 'low' | 'default';
  /** Router shortlist cap (`A2UIVERSE_SHORTLIST_CAP`). */
  shortlistCap: number;
  /** Synthesizer model (`A2UIVERSE_SYNTHESIZER_MODEL`), the Planner's form; follows `A2UIVERSE_PLANNER_MODEL` when set, else its own default. */
  synthesizerModelId: string;
  /** Synthesizer effort (`A2UIVERSE_SYNTHESIZER_EFFORT`); `low` by default — dead air is measured first. */
  synthesizerEffort: 'low' | 'default';
  /**
   * The soft deadline (`A2UIVERSE_SOFT_DEADLINE_SECONDS`, task-8.3 decision 1): once the sources
   * that arrived could make a merge, how long with no source settling releases the synthesis.
   */
  softDeadlineMs: number;
  /** The hard cap (`A2UIVERSE_HARD_CAP_SECONDS`, task-8.3 decision 2): from each dispatch to its slot failing. */
  hardCapMs: number;
  /**
   * The heartbeat (`A2UIVERSE_HEARTBEAT_SECONDS`, task-8.7 decision 31): an open stream that has
   * sent nothing for this long sends an empty working event, so a proxy's idle timeout never cuts
   * a turn waiting on a slow source.
   */
  heartbeatMs: number;
  /** The dev-only fault map (`A2UIVERSE_FAULTS`, task-8.3 decision 14); empty when unset. */
  faults: FaultMap;
  /**
   * The marketplace this orchestrator installs from, checks against and reports to
   * (`MARKETPLACE_URL`, task-13.5 decision 1): the marketplace's own default port unless set. One
   * that cannot be reached is one boot line and every update state unknown, never a failed boot.
   */
  marketplaceUrl: string;
  /** Every request to the marketplace has this long (`A2UIVERSE_MARKETPLACE_TIMEOUT_SECONDS`, task-13.5 decision 11). */
  marketplaceTimeoutMs: number;
}

type Env = Readonly<Record<string, string | undefined>>;

const DEFAULT_PORT = 10001;
/** The marketplace's default port, as its own config has it. */
export const DEFAULT_MARKETPLACE_URL = 'http://localhost:10002';
export const DEFAULT_MARKETPLACE_TIMEOUT_SECONDS = 10;
const DEFAULT_SHORTLIST_CAP = 5;
export const DEFAULT_SOFT_DEADLINE_SECONDS = 10;
export const DEFAULT_HARD_CAP_SECONDS = 300;
/** The heartbeat on an open stream (task-8.7 decision 31): an empty working event after this much silence. */
export const DEFAULT_HEARTBEAT_SECONDS = 30;
/**
 * The quiet after a step before its walk starts (task-10.9 decision 7): presses of the way back
 * closer together than this are one gesture, so the walk runs only where they stop. Windows'
 * default double-click time — "the system uses the default double-click time of 500
 * milliseconds" (Microsoft Learn, `SetDoubleClickTime`).
 */
export const STEP_QUIET_MS = 500;

export function loadConfig(env: Env = process.env): Config {
  const port = parsePort(env.PORT);
  return {
    port,
    baseUrl: env.BASE_URL ?? `http://localhost:${port}`,
    stateDir: env.STATE_DIR ?? resolve(process.cwd(), '.state'),
    debugIds: env.A2UIVERSE_DEBUG_IDS === '1' || env.A2UIVERSE_DEBUG_IDS === 'true',
    googleApiKey: env.GOOGLE_API_KEY,
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    plannerModelId: parseModel(
      env.A2UIVERSE_PLANNER_MODEL ?? DEFAULT_PLANNER_MODEL_ID,
      'A2UIVERSE_PLANNER_MODEL',
    ),
    plannerEffort: parseEffort(env.A2UIVERSE_PLANNER_EFFORT, 'A2UIVERSE_PLANNER_EFFORT'),
    shortlistCap: parseCap(env.A2UIVERSE_SHORTLIST_CAP),
    synthesizerModelId: parseModel(
      env.A2UIVERSE_SYNTHESIZER_MODEL ??
        env.A2UIVERSE_PLANNER_MODEL ??
        DEFAULT_SYNTHESIZER_MODEL_ID,
      'A2UIVERSE_SYNTHESIZER_MODEL',
    ),
    synthesizerEffort: parseEffort(
      env.A2UIVERSE_SYNTHESIZER_EFFORT,
      'A2UIVERSE_SYNTHESIZER_EFFORT',
    ),
    softDeadlineMs: parseSeconds(
      env.A2UIVERSE_SOFT_DEADLINE_SECONDS,
      'A2UIVERSE_SOFT_DEADLINE_SECONDS',
      DEFAULT_SOFT_DEADLINE_SECONDS,
    ),
    hardCapMs: parseSeconds(
      env.A2UIVERSE_HARD_CAP_SECONDS,
      'A2UIVERSE_HARD_CAP_SECONDS',
      DEFAULT_HARD_CAP_SECONDS,
    ),
    heartbeatMs: parseSeconds(
      env.A2UIVERSE_HEARTBEAT_SECONDS,
      'A2UIVERSE_HEARTBEAT_SECONDS',
      DEFAULT_HEARTBEAT_SECONDS,
    ),
    faults: parseFaults(env.A2UIVERSE_FAULTS),
    marketplaceUrl: (env.MARKETPLACE_URL ?? DEFAULT_MARKETPLACE_URL).replace(/\/$/, ''),
    marketplaceTimeoutMs: parseSeconds(
      env.A2UIVERSE_MARKETPLACE_TIMEOUT_SECONDS,
      'A2UIVERSE_MARKETPLACE_TIMEOUT_SECONDS',
      DEFAULT_MARKETPLACE_TIMEOUT_SECONDS,
    ),
  };
}

/** A positive number of seconds, as milliseconds; fractions allowed so a test can run fast. */
function parseSeconds(raw: string | undefined, key: string, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback * 1000;
  const seconds = Number(raw);
  if (!Number.isFinite(seconds) || seconds <= 0)
    throw new Error(`${key}: expected a positive number of seconds, got "${raw}"`);
  return seconds * 1000;
}

/** The name as written, once its provider is one the seam knows (task-17.2 decision 6). */
function parseModel(raw: string, key: string): string {
  parseModelName(raw, key);
  return raw;
}

function parseEffort(raw: string | undefined, key: string): 'low' | 'default' {
  if (raw === undefined || raw === 'low') return 'low';
  if (raw === 'default') return 'default';
  throw new Error(`${key}: expected "low" or "default", got "${raw}"`);
}

function parseCap(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_SHORTLIST_CAP;
  const cap = Number(raw);
  if (!Number.isInteger(cap) || cap <= 0)
    throw new Error(`A2UIVERSE_SHORTLIST_CAP: expected a positive integer, got "${raw}"`);
  return cap;
}

function parsePort(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_PORT;
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0)
    throw new Error(`PORT: expected a positive integer, got "${raw}"`);
  return port;
}
