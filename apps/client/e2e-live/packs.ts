/**
 * What the live stories publish, packed at run time (task-14.10 decision 10): a catalog package of
 * the apps checkout, built there through its own turbo as the launcher builds it, then copied into
 * scratch — its manifest, its schema and its built output, its dependencies linked, never copied —
 * changed once there and packed with this repo's Stellify. The checkout's sources are never touched.
 */
import {execFile} from 'node:child_process';
import {cp, mkdir, readFile, rm, symlink, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {promisify} from 'node:util';
import {artifactFiles, preview, publish, stellify, writeArtifact} from '@a2uiverse/stellify';
import {AGENTS_DIR, MARKETPLACE, PACKS, PUBLISHER_FILE} from './stack';

const run = promisify(execFile);

/** The two catalog packages the stories pack, by app: their package name and folder in the checkout. */
const CATALOGS = {
  'shop-a': {name: 'shop-a-catalog', folder: join('mocks', 'shop-a', 'shop-a-catalog')},
  'shop-b': {name: 'shop-b-catalog', folder: join('mocks', 'shop-b', 'shop-b-catalog')},
} as const;
type PackedApp = keyof typeof CATALOGS;

/** A packed artifact: its folder on disk, and its files as an install or a publish carries them. */
export interface Pack {
  dir: string;
  files: Map<string, Uint8Array>;
}

/** The package built in the checkout, an unchanged package a cache hit. */
async function built(app: PackedApp): Promise<string> {
  await run('pnpm', ['exec', 'turbo', 'run', 'build', `--filter=${CATALOGS[app].name}`], {
    cwd: AGENTS_DIR,
  });
  return join(AGENTS_DIR, CATALOGS[app].folder);
}

/**
 * `app`'s catalog packed into `PACKS/<name>/<folder>`, `change` run on the scratch copy first.
 * The folder carries the package's own name, as the folder Stellify writes is picked in life.
 */
export async function pack(
  app: PackedApp,
  name: string,
  change?: (copy: string) => Promise<void>,
): Promise<Pack> {
  const source = await built(app);
  const copy = join(PACKS, name, 'package');
  await rm(join(PACKS, name), {recursive: true, force: true});
  await mkdir(copy, {recursive: true});
  for (const part of ['package.json', 'catalogs']) {
    await cp(join(source, part), join(copy, part), {recursive: true});
  }
  await cp(join(source, 'dist'), join(copy, 'dist'), {
    recursive: true,
    filter: path => !path.startsWith(join(source, 'dist', 'artifact')),
  });
  await symlink(join(source, 'node_modules'), join(copy, 'node_modules'));
  await change?.(copy);
  const result = await stellify(copy);
  if (result.findings.length > 0) {
    throw new Error(
      `Stellify refused ${name}: ${result.findings.map(f => `${f.file}: ${f.reason}`).join('; ')}`,
    );
  }
  const dir = await writeArtifact(result, join(PACKS, name, CATALOGS[app].name));
  return {dir, files: artifactFiles(result)};
}

/**
 * A change that leaves the catalog as it is and moves its build: one statement in its built entry,
 * leaving `stamp` on the window once the build is loaded.
 */
export const newerBuild = (stamp: string) => async (copy: string) => {
  const entry = join(copy, 'dist', 'index.js');
  const mark = `globalThis.__a2uiverseE2eBuild = ${JSON.stringify(stamp)};\n`;
  await writeFile(entry, `${await readFile(entry, 'utf8')}\n${mark}`);
};

/** A change the gate refuses as breaking: one component taken out of the schema. */
export const componentRemoved =
  (component: string) =>
  async (copy: string): Promise<void> => {
    const schema = join(copy, 'catalogs', 'v0.9.1', 'catalog.json');
    const parsed = JSON.parse(await readFile(schema, 'utf8')) as {
      components: Record<string, unknown>;
    };
    delete parsed.components[component];
    await writeFile(schema, `${JSON.stringify(parsed, null, 2)}\n`);
  };

/**
 * The sample a sign-in app's publisher captures on their own terminal (phase-14 decision 6), with
 * the app's demo key from the launcher's roster: written where the page's file picker reads it.
 */
export async function capturePreview(
  app: PackedApp,
  cardUrl: string,
  packed: Pack,
  publisher: string,
): Promise<string> {
  const rosterPath = join(import.meta.dirname, '..', '..', '..', 'scripts', 'dev-roster.mjs');
  const {ROSTER} = (await import(rosterPath)) as {ROSTER: {id: string; previewKey?: string}[]};
  const credential = ROSTER.find(entry => entry.id === app)?.previewKey;
  if (!credential) throw new Error(`the roster names no demo key for ${app}`);
  const captured = await preview({
    appId: app,
    cardUrl,
    catalogs: [packed.files],
    credential,
    marketplace: MARKETPLACE,
    publisher,
  });
  if (!captured.document)
    throw new Error(`the preview was refused: ${captured.findings.join('; ')}`);
  const file = join(PACKS, `${app}-preview.json`);
  await writeFile(file, `${JSON.stringify(captured.document, null, 2)}\n`);
  return file;
}

/** Publishes as the dev publisher the launcher holds for this run, behind the page (decision 6). */
export async function publishAsDevPublisher(appId: string, cardUrl: string, packed: Pack) {
  const {token} = JSON.parse(await readFile(PUBLISHER_FILE, 'utf8')) as {token: string};
  const answer = await publish({
    marketplace: MARKETPLACE,
    token,
    appId,
    cardUrl,
    catalogs: [packed.files],
  });
  if (!answer.ok)
    throw new Error(`the marketplace refused ${appId}: ${answer.findings.join('; ')}`);
  return answer;
}
