import {existsSync, readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import type {AppRecord} from './types.js';

/**
 * The roster read from an agents dir (task 4.7): every immediate child carrying a `manifest.json`
 * becomes a record, and a child without one is not an app — the launcher's own convention
 * (`scripts/agents-discovery.mjs`), pinned on both sides. The manifest is the record's placeholder
 * until the sdk manifest schema lands (Phase 10), when this reader moves there and the hardcoded
 * entries go. Malformed is fatal naming the file, empty is fatal: the roster is config, and the
 * orchestrator has no listing to show what it skipped.
 */
export function readRoster(agentsDir: string): AppRecord[] {
  if (!existsSync(agentsDir) || !statSync(agentsDir).isDirectory()) {
    throw new Error(`A2UIVERSE_AGENTS_DIR: not a directory — ${agentsDir}`);
  }
  const children = readdirSync(agentsDir, {withFileTypes: true})
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();

  const records: AppRecord[] = [];
  const seen = new Map<string, string>();
  for (const name of children) {
    const manifestPath = join(agentsDir, name, 'manifest.json');
    if (!existsSync(manifestPath)) continue;
    const record = recordFrom(manifestPath);
    const other = seen.get(record.id);
    if (other) {
      throw new Error(`${manifestPath}: id "${record.id}" is already claimed by ${other}`);
    }
    seen.set(record.id, manifestPath);
    records.push(record);
  }
  if (records.length === 0) {
    throw new Error(`A2UIVERSE_AGENTS_DIR: no manifest.json one level below ${agentsDir}`);
  }
  return records;
}

function recordFrom(manifestPath: string): AppRecord {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (err) {
    throw new Error(`${manifestPath}: invalid JSON (${(err as Error).message})`);
  }
  const manifest = requireObject(parsed, manifestPath, 'manifest');
  const id = requireString(manifest.id, manifestPath, 'id');
  const agent = requireObject(manifest.agent, manifestPath, 'agent');
  const catalog = requireObject(manifest.catalog, manifestPath, 'catalog');
  const auth = agent.auth ?? 'none';
  if (auth !== 'none') {
    throw new Error(
      `${manifestPath}: agent.auth must be "none" (the only scheme until M8), got ${JSON.stringify(auth)}`,
    );
  }
  return {
    id,
    displayName: typeof manifest.displayName === 'string' ? manifest.displayName : id,
    agentUrl: requireString(agent.url, manifestPath, 'agent.url'),
    authScheme: 'none',
    catalogId: requireString(catalog.id, manifestPath, 'catalog.id'),
    catalogPackage: requireString(catalog.package, manifestPath, 'catalog.package'),
  };
}

function requireObject(
  value: unknown,
  manifestPath: string,
  field: string,
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${manifestPath}: ${field} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireString(value: unknown, manifestPath: string, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${manifestPath}: ${field} must be a non-empty string`);
  }
  return value.trim();
}
