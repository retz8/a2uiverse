/**
 * The thin command over the registry's operations (task-11.4 decision 14): what installs an app by
 * hand — one the launcher's roster does not name (task 11.6) — over the same HTTP operations the
 * launcher, the Store page and the store loop call.
 *
 *   registry install <app-id> <card-url> [<artifact-dir> ...]   install, or install-over a held id
 *   registry uninstall <app-id>
 *   registry list
 *
 * An artifact directory is what `stellify pack` wrote. The orchestrator is reached at
 * `ORCHESTRATOR_URL` (default `http://localhost:$PORT`, port 10001), its write token read from the
 * state directory (`STATE_DIR`, default `.state` in the orchestrator package). Relative paths are
 * the caller's, not the package's.
 */
import {resolve} from 'node:path';
import {REGISTRY_ROUTE_PREFIX} from './api.js';
import {readTree} from './store.js';
import {readWriteToken} from './token.js';
import type {InstalledRecord} from './types.js';

export const USAGE = [
  'usage: registry install <app-id> <card-url> [<artifact-dir> ...]',
  '       registry uninstall <app-id>',
  '       registry list',
];

export interface CommandIo {
  env: Readonly<Record<string, string | undefined>>;
  /** Where relative artifact paths are resolved: the caller's directory. */
  cwd: string;
  /** Where a relative `STATE_DIR` is resolved, as the orchestrator resolves it: the package's directory. */
  packageDir: string;
  out(line: string): void;
  err(line: string): void;
}

/** Runs one invocation; resolves to the exit code. */
export async function runRegistryCommand(argv: readonly string[], io: CommandIo): Promise<number> {
  const [verb, ...rest] = argv;
  const base = `${(io.env.ORCHESTRATOR_URL ?? `http://localhost:${io.env.PORT ?? 10001}`).replace(/\/$/, '')}${REGISTRY_ROUTE_PREFIX}`;
  const stateDir = resolve(io.packageDir, io.env.STATE_DIR ?? '.state');
  try {
    if (verb === 'install' && rest.length >= 2) {
      const [appId, cardUrl, ...dirs] = rest;
      const catalogs = [];
      for (const dir of dirs) {
        const path = resolve(io.cwd, dir);
        let files: Map<string, Uint8Array>;
        try {
          files = await readTree(path);
        } catch (err) {
          io.err(`cannot read the artifact directory ${path}: ${(err as Error).message}`);
          return 1;
        }
        catalogs.push({
          files: Object.fromEntries(
            [...files].map(([file, bytes]) => [file, Buffer.from(bytes).toString('base64')]),
          ),
        });
      }
      const body = await write(base, stateDir, 'install', {appId, cardUrl, catalogs});
      if (!body.ok) return refused(io, appId, body.findings);
      io.out(body.summary ?? `installed ${appId}`);
      for (const note of body.notes ?? []) io.out(`note: ${note}`);
      return 0;
    }
    if (verb === 'uninstall' && rest.length === 1) {
      const [appId] = rest;
      const body = await write(base, stateDir, 'uninstall', {appId});
      if (!body.ok) return refused(io, appId, body.findings);
      io.out(`uninstalled ${appId}`);
      return 0;
    }
    if (verb === 'list' && rest.length === 0) {
      const response = await fetch(`${base}/apps.json`);
      if (!response.ok) throw new Error(`the orchestrator answered ${response.status}`);
      for (const app of (await response.json()) as InstalledRecord[]) {
        const catalogs = Object.keys(app.catalogs);
        io.out(
          `${app.id}  ${app.cardUrl}  ${catalogs.length > 0 ? catalogs.join(', ') : 'basic catalog'}`,
        );
      }
      return 0;
    }
  } catch (err) {
    io.err((err as Error).message);
    return 1;
  }
  for (const line of USAGE) io.err(line);
  return 1;
}

type WriteAnswer =
  | {ok: true; appId: string; replaced?: boolean; summary?: string; notes?: string[]}
  | {ok: false; findings: string[]};

async function write(
  base: string,
  stateDir: string,
  operation: 'install' | 'uninstall',
  body: unknown,
): Promise<WriteAnswer> {
  let token: string;
  try {
    token = await readWriteToken(stateDir);
  } catch {
    throw new Error(
      `no write token in ${stateDir}: start the orchestrator on this state directory first`,
    );
  }
  let response: Response;
  try {
    response = await fetch(`${base}/${operation}`, {
      method: 'POST',
      headers: {'content-type': 'application/json', authorization: `Bearer ${token}`},
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`cannot reach the orchestrator at ${base}: ${(err as Error).message}`);
  }
  if (response.status === 401) {
    throw new Error(
      `the orchestrator refused the write token from ${stateDir}: is it running on this state directory?`,
    );
  }
  return (await response.json()) as WriteAnswer;
}

function refused(io: CommandIo, appId: string, findings: string[]): number {
  io.err(`refused ${appId}:`);
  for (const finding of findings) io.err(`  ${finding}`);
  return 1;
}
