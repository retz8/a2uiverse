import {resolve} from 'node:path';

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
}

type Env = Readonly<Record<string, string | undefined>>;

const DEFAULT_PORT = 10001;

export function loadConfig(env: Env = process.env): Config {
  const port = parsePort(env.PORT);
  return {
    port,
    baseUrl: env.BASE_URL ?? `http://localhost:${port}`,
    stateDir: env.STATE_DIR ?? resolve(process.cwd(), '.state'),
    debugIds: env.A2UIVERSE_DEBUG_IDS === '1' || env.A2UIVERSE_DEBUG_IDS === 'true',
    agentUrls: parseAgentUrls(env.A2UIVERSE_AGENT_URLS),
  };
}

function parsePort(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_PORT;
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0)
    throw new Error(`PORT: expected a positive integer, got "${raw}"`);
  return port;
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
