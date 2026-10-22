/**
 * The live stories' own calls to the orchestrator, outside the page: waiting for the launcher's
 * installs, and putting back what a story changed so the next finds the stack as it was (task-14.10
 * decision 11). A write goes as the page's does — the JSON body and the page's origin, no token.
 */
import {expect} from '@playwright/test';
import {createSender, supportedCatalogIds} from '../scripts/lib/drive';
import {openCanvas, SIGN_IN_AS, signInSource} from '../scripts/lib/signIn';
import {CLIENT, MARKETPLACE, ORCHESTRATOR} from './stack';

async function read<T>(path: string): Promise<T> {
  const response = await fetch(`${ORCHESTRATOR}${path}`, {cache: 'no-store'});
  if (!response.ok) throw new Error(`${path} answered ${response.status}`);
  return (await response.json()) as T;
}

async function write(path: string, body: unknown): Promise<unknown> {
  const response = await fetch(`${ORCHESTRATOR}${path}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Origin: CLIENT},
    body: JSON.stringify(body),
  });
  return response.json().catch(() => undefined);
}

/** The installed apps' ids; none while the orchestrator cannot be read. */
export async function installedIds(): Promise<string[]> {
  const apps = await read<{id: string}[]>('/registry/apps.json').catch(() => []);
  return apps.map(app => app.id);
}

/** Waits for the launcher to have installed `ids`: it builds and packs each before it publishes it. */
export async function waitInstalled(ids: string[]): Promise<void> {
  await expect
    .poll(installedIds, {timeout: 240_000, intervals: [1_000]})
    .toEqual(expect.arrayContaining(ids));
}

/** Waits for the launcher to have published `appId` to the suite's marketplace. */
export async function waitPublished(appId: string): Promise<void> {
  await expect
    .poll(
      async () => {
        const res = await fetch(`${MARKETPLACE}/index.json`).catch(() => undefined);
        const index = res?.ok ? ((await res.json()) as {appId: string}[]) : [];
        return index.map(entry => entry.appId);
      },
      {timeout: 240_000, intervals: [1_000]},
    )
    .toContain(appId);
}

/** Uninstalls `appId` when it is installed: its accounts go with it. */
export async function ensureUninstalled(appId: string): Promise<void> {
  if (!(await installedIds()).includes(appId)) return;
  await write('/registry/uninstall', {appId});
}

/**
 * `apps` signed in as each one's fake account, outside the page, as the beat recorder signs an
 * orchestrator in: what a story needs answering before it starts. Each as the app's next account —
 * its bare id — since an account number signed out before is never taken again.
 */
export async function signInApps(apps: readonly string[]): Promise<void> {
  const catalogIds = await supportedCatalogIds();
  const canvas = await openCanvas(await createSender(ORCHESTRATOR), catalogIds);
  for (const app of apps) await signInSource(ORCHESTRATOR, canvas, app, SIGN_IN_AS[app]!);
}

/** Installs `appId` from the marketplace by its id when it is not installed. */
export async function ensureInstalled(appId: string): Promise<void> {
  if ((await installedIds()).includes(appId)) return;
  await write('/registry/install', {appId});
}

/** Every account of `appId` signed out. */
export async function signOutAll(appId: string): Promise<void> {
  const apps = await read<{appId: string; accounts: {source: string}[]}[]>('/auth/accounts.json');
  for (const account of apps.find(app => app.appId === appId)?.accounts ?? []) {
    await write('/auth/sign-out', {source: account.source});
  }
}

/** Publish signed out: the orchestrator forgets the publisher it holds, if any. */
export async function signOutPublisher(): Promise<void> {
  await write('/marketplace/sign-out', {});
}

/** The artifact id the registry now loads `catalogId` from. */
export async function installedBuild(catalogId: string): Promise<string | undefined> {
  const table = await read<{catalogId: string; artifact?: string}[]>('/registry/catalogs.json');
  return table.find(row => row.catalogId === catalogId)?.artifact;
}
