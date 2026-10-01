/**
 * The launcher's side of the orchestrator's registry (task-11.6 decisions 5, 8 and 9): where the
 * orchestrator is, its write token, and install, uninstall and the installed list over
 * `orchestratorApi`. Resolved as the orchestrator's own `registry` command resolves them —
 * `ORCHESTRATOR_URL`, else `http://localhost:$PORT` on 10001; the state directory `STATE_DIR`
 * against the orchestrator's package, `.state` by default; the token at `registry/write-token`
 * inside it — over the orchestrator's `.env` with the shell's environment winning, as `tsx
 * --env-file` gives the orchestrator.
 */
import {existsSync, readFileSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {parseEnv} from 'node:util';

const ROUTE_PREFIX = '/registry';
const TOKEN_PATH = ['registry', 'write-token'];

/** The orchestrator's address and state directory, as its `registry` command reads them. */
export function orchestratorOf({env, orchestratorDir}) {
  const envFile = join(orchestratorDir, '.env');
  const merged = {
    ...(existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')) : {}),
    ...env,
  };
  const url = (merged.ORCHESTRATOR_URL ?? `http://localhost:${merged.PORT ?? 10001}`).replace(
    /\/$/,
    '',
  );
  return {url, stateDir: resolve(orchestratorDir, merged.STATE_DIR ?? '.state')};
}

/** Whether an A2A server answers at its card URL — an agent, or the orchestrator. */
export async function cardAnswers(cardUrl) {
  try {
    const res = await fetch(cardUrl, {signal: AbortSignal.timeout(2_000)});
    return res.ok;
  } catch {
    return false;
  }
}

/** The install request's body: one catalog's files, base64, as the install route reads them. */
export function installBody(appId, cardUrl, files) {
  const encoded = {};
  for (const [path, bytes] of files) encoded[path] = Buffer.from(bytes).toString('base64');
  return {appId, cardUrl, catalogs: [{files: encoded}]};
}

/** Thrown when there is no token or the orchestrator refuses it: nothing can be written this launch. */
export class CannotWrite extends Error {}

export class Registry {
  constructor({url, stateDir}) {
    this.url = url;
    this.stateDir = stateDir;
  }

  /** The token the running orchestrator wrote at its startup; read after it answers. */
  async readToken() {
    try {
      this.token = (await readFile(join(this.stateDir, ...TOKEN_PATH), 'utf8')).trim();
    } catch {
      throw new CannotWrite(
        `no write token in ${this.stateDir}: is the orchestrator at ${this.url} running on this state directory?`,
      );
    }
  }

  /** `{ok: true, replaced?, notes?}`, or `{ok: false, findings}` when the gate refuses. */
  install(body) {
    return this.#write('install', body);
  }

  uninstall(appId) {
    return this.#write('uninstall', {appId});
  }

  /** The installed records, as `/registry/apps.json` serves them. */
  async installed() {
    const res = await fetch(`${this.url}${ROUTE_PREFIX}/apps.json`);
    if (!res.ok) throw new Error(`the orchestrator answered ${res.status} for its installed list`);
    return res.json();
  }

  async #write(operation, body) {
    const res = await fetch(`${this.url}${ROUTE_PREFIX}/${operation}`, {
      method: 'POST',
      headers: {'content-type': 'application/json', authorization: `Bearer ${this.token}`},
      body: JSON.stringify(body),
    });
    if (res.status === 401) {
      throw new CannotWrite(
        `the orchestrator at ${this.url} refused the write token from ${this.stateDir}: is it running on this state directory?`,
      );
    }
    return res.json();
  }
}
