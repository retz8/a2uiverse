import {resolve} from 'node:path';

export interface Config {
  port: number;
  /** The marketplace's local state directory: the served subtree, the publishers, the model cache. */
  stateDir: string;
  /**
   * How long a live-card fetch may take (`A2UIVERSE_CARD_TIMEOUT_SECONDS`, task-13.3 decision 6):
   * at publish, at the refresh at boot and on a report.
   */
  cardTimeoutMs: number;
  /** How long the smoke request may take (`A2UIVERSE_SMOKE_TIMEOUT_SECONDS`, task-13.3 decision 6). */
  smokeTimeoutMs: number;
}

type Env = Readonly<Record<string, string | undefined>>;

export const DEFAULT_PORT = 10002;
export const DEFAULT_CARD_TIMEOUT_SECONDS = 10;
export const DEFAULT_SMOKE_TIMEOUT_SECONDS = 60;

export function loadConfig(env: Env = process.env): Config {
  return {
    port: parsePort(env.PORT),
    stateDir: env.STATE_DIR ?? resolve(process.cwd(), '.state'),
    cardTimeoutMs: parseSeconds(
      env.A2UIVERSE_CARD_TIMEOUT_SECONDS,
      'A2UIVERSE_CARD_TIMEOUT_SECONDS',
      DEFAULT_CARD_TIMEOUT_SECONDS,
    ),
    smokeTimeoutMs: parseSeconds(
      env.A2UIVERSE_SMOKE_TIMEOUT_SECONDS,
      'A2UIVERSE_SMOKE_TIMEOUT_SECONDS',
      DEFAULT_SMOKE_TIMEOUT_SECONDS,
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

function parsePort(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_PORT;
  const port = Number(raw);
  if (!Number.isInteger(port) || port <= 0)
    throw new Error(`PORT: expected a positive integer, got "${raw}"`);
  return port;
}
