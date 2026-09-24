import {resolve} from 'node:path';
import {parseFaults, type FaultMap} from './agentsPool/faults.js';
import {DEFAULT_PLANNER_MODEL_ID, DEFAULT_SYNTHESIZER_MODEL_ID} from './planner/getModel.js';

export interface Config {
  port: number;
  /** Advertised in the agent card; the tunnel URL in tunnel sessions. */
  baseUrl: string;
  /** The orchestrator's local state directory (intent journal now; registry from M7). */
  stateDir: string;
  /** Include vendor ids under the source stamp (debugging only). */
  debugIds: boolean;
  /** Agent URL overrides by app id (`A2UIVERSE_AGENT_URLS`, JSON object). */
  agentUrls: Record<string, string>;
  /**
   * The agents dir (`A2UIVERSE_AGENTS_DIR`, the launcher's own variable): when set, the roster is
   * read from the manifests one level below it instead of the hardcoded entries. Unset means the
   * hardcoded roster — the orchestrator boots standalone without an apps checkout.
   */
  agentsDir: string | undefined;
  /** Google AI Studio key for the Planner (`GOOGLE_API_KEY`, the a2ui-github convention). */
  googleApiKey: string | undefined;
  /** Planner model id (`A2UIVERSE_PLANNER_MODEL`). */
  plannerModelId: string;
  /** Planner effort tunable (`A2UIVERSE_PLANNER_EFFORT`); starts below default — latency is time-to-first-paint. */
  plannerEffort: 'low' | 'default';
  /** Router shortlist cap (`A2UIVERSE_SHORTLIST_CAP`). */
  shortlistCap: number;
  /** Synthesizer model id (`A2UIVERSE_SYNTHESIZER_MODEL`); follows `A2UIVERSE_PLANNER_MODEL` when set, else its own default. */
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
}

type Env = Readonly<Record<string, string | undefined>>;

const DEFAULT_PORT = 10001;
const DEFAULT_SHORTLIST_CAP = 5;
export const DEFAULT_SOFT_DEADLINE_SECONDS = 10;
export const DEFAULT_HARD_CAP_SECONDS = 300;
/** The heartbeat on an open stream (task-8.7 decision 31): an empty working event after this much silence. */
export const DEFAULT_HEARTBEAT_SECONDS = 30;

export function loadConfig(env: Env = process.env): Config {
  const port = parsePort(env.PORT);
  return {
    port,
    baseUrl: env.BASE_URL ?? `http://localhost:${port}`,
    stateDir: env.STATE_DIR ?? resolve(process.cwd(), '.state'),
    debugIds: env.A2UIVERSE_DEBUG_IDS === '1' || env.A2UIVERSE_DEBUG_IDS === 'true',
    agentUrls: parseAgentUrls(env.A2UIVERSE_AGENT_URLS),
    agentsDir: parseAgentsDir(env.A2UIVERSE_AGENTS_DIR),
    googleApiKey: env.GOOGLE_API_KEY,
    plannerModelId: env.A2UIVERSE_PLANNER_MODEL ?? DEFAULT_PLANNER_MODEL_ID,
    plannerEffort: parseEffort(env.A2UIVERSE_PLANNER_EFFORT, 'A2UIVERSE_PLANNER_EFFORT'),
    shortlistCap: parseCap(env.A2UIVERSE_SHORTLIST_CAP),
    synthesizerModelId:
      env.A2UIVERSE_SYNTHESIZER_MODEL ??
      env.A2UIVERSE_PLANNER_MODEL ??
      DEFAULT_SYNTHESIZER_MODEL_ID,
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

function parseAgentsDir(raw: string | undefined): string | undefined {
  if (raw === undefined || raw.trim() === '') return undefined;
  return resolve(raw.trim());
}

function parseAgentUrls(raw: string | undefined): Record<string, string> {
  if (raw === undefined) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`A2UIVERSE_AGENT_URLS: invalid JSON (${(err as Error).message})`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('A2UIVERSE_AGENT_URLS: expected a JSON object of app id → URL');
  }
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== 'string')
      throw new Error(`A2UIVERSE_AGENT_URLS: "${key}" must be a URL string`);
  }
  return parsed as Record<string, string>;
}
