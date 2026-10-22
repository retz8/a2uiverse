/**
 * The registry of the orchestrator in daily use, as the recording scripts read it over
 * `orchestratorApi` (task-11.6 decisions 12 and 13): its installed apps, and each app's artifacts
 * copied file by file into another orchestrator through the install operation.
 */
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';

const ROUTE_PREFIX = '/registry';

/** An installed app as `/registry/apps.json` serves it — the fields the scripts read. */
export interface InstalledApp {
  id: string;
  cardUrl: string;
  /** Catalog id → the id of its artifact. */
  catalogs: Record<string, string>;
  /** What the hub advertises to the app as its supported catalogs. */
  entitlement: string[];
}

export async function installedApps(orchestratorUrl: string): Promise<InstalledApp[]> {
  const res = await fetch(`${orchestratorUrl}${ROUTE_PREFIX}/apps.json`);
  if (!res.ok) {
    throw new Error(`the orchestrator at ${orchestratorUrl} answered ${res.status} for apps.json`);
  }
  return (await res.json()) as InstalledApp[];
}

async function bytesOf(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

/** One artifact's files as the install route takes them: the descriptor and every file it lists. */
async function artifactFiles(from: string, artifact: string): Promise<Record<string, string>> {
  const base = `${from}${ROUTE_PREFIX}/artifacts/${artifact}/`;
  const at = (path: string) => base + path.split('/').map(encodeURIComponent).join('/');
  const descriptor = await bytesOf(at('artifact.json'));
  const files: Record<string, string> = {'artifact.json': descriptor.toString('base64')};
  const {files: listed} = JSON.parse(descriptor.toString('utf8')) as {
    files: Record<string, string>;
  };
  for (const path of Object.keys(listed))
    files[path] = (await bytesOf(at(path))).toString('base64');
  return files;
}

const writeToken = async (stateDir: string) =>
  (await readFile(join(stateDir, 'registry', 'write-token'), 'utf8')).trim();

/**
 * Install into the orchestrator at `to` — its write token in `stateDir` — every app the one at
 * `from` has installed, or those of them `only` names, each from its card URL with its artifacts'
 * files. Returns the ids.
 */
export async function copyInstalls(
  from: string,
  to: string,
  stateDir: string,
  only?: readonly string[],
): Promise<string[]> {
  const installed = await installedApps(from);
  if (installed.length === 0) {
    throw new Error(`the orchestrator at ${from} has no app installed — launch the apps first`);
  }
  const apps = only ? installed.filter(app => only.includes(app.id)) : installed;
  const missing = (only ?? []).filter(id => !installed.some(app => app.id === id));
  if (missing.length) {
    throw new Error(`the orchestrator at ${from} has not installed ${missing.join(', ')}`);
  }
  const token = await writeToken(stateDir);
  for (const app of apps) {
    const catalogs = [];
    for (const artifact of Object.values(app.catalogs)) {
      catalogs.push({files: await artifactFiles(from, artifact)});
    }
    const res = await fetch(`${to}${ROUTE_PREFIX}/install`, {
      method: 'POST',
      headers: {'content-type': 'application/json', authorization: `Bearer ${token}`},
      body: JSON.stringify({appId: app.id, cardUrl: app.cardUrl, catalogs}),
    });
    const answer = (await res.json()) as {ok: boolean; findings?: string[]};
    if (!answer.ok) {
      throw new Error(`${app.id} did not install: ${(answer.findings ?? []).join('; ')}`);
    }
  }
  return apps.map(app => app.id);
}

/** What an install answers: done with its summary, or refused with its findings. */
export interface InstallAnswer {
  ok: boolean;
  summary?: string;
  findings?: string[];
}

/**
 * Install `appId` into the orchestrator at `to` — its write token in `stateDir` — from its
 * marketplace by id alone, as the Store and the slot's Install do (task-15.10 decision 7); or
 * uninstall it, so a take tried again starts where the first one did.
 */
export async function installById(
  to: string,
  stateDir: string,
  appId: string,
  write: 'install' | 'uninstall' = 'install',
): Promise<InstallAnswer> {
  const res = await fetch(`${to}${ROUTE_PREFIX}/${write}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${await writeToken(stateDir)}`,
    },
    body: JSON.stringify({appId}),
  });
  return (await res.json()) as InstallAnswer;
}
