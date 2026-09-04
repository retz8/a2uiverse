import {resolve} from 'node:path';
import {DEFAULT_PLANNER_MODEL_ID} from './planner/getModel.js';

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
  /** Synthesizer model id (`A2UIVERSE_SYNTHESIZER_MODEL`); follows the Planner's by default. */
  synthesizerModelId: string;
  /** Synthesizer effort (`A2UIVERSE_SYNTHESIZER_EFFORT`); `low` by default — dead air is measured first. */
  synthesizerEffort: 'low' | 'default';
}

type Env = Readonly<Record<string, string | undefined>>;

const DEFAULT_PORT = 10001;
const DEFAULT_SHORTLIST_CAP = 5;

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
      env.A2UIVERSE_SYNTHESIZER_MODEL ?? env.A2UIVERSE_PLANNER_MODEL ?? DEFAULT_PLANNER_MODEL_ID,
    synthesizerEffort: parseEffort(
      env.A2UIVERSE_SYNTHESIZER_EFFORT,
      'A2UIVERSE_SYNTHESIZER_EFFORT',
    ),
  };
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
