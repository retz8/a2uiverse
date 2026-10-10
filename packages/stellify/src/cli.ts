/**
 * The command line (task-11.3 decision 5; task-13.4 decisions 3, 6, 7, 9, 10): `pack` and
 * `check` over the pipeline, `claim`, `preview`, `publish`, `unpublish` and `list` over the
 * marketplace verbs. It alone reads the publisher file and the directories; every verb's work is
 * the API's. `--json` on every verb prints a machine-readable result; findings print one per
 * line; any finding exits 1, a usage error 2.
 */
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {dirname, resolve} from 'node:path';
import {stellify, writeArtifact} from './index.js';
import {describeLacks, describeNotice} from './notices.js';
import {preview} from './preview.js';
import {
  publisherFilePath,
  readPublisherFile,
  STELLIFY_HOME,
  writePublisherFile,
  type Env,
} from './publisher.js';
import {readTree} from './tree.js';
import type {Notice, PublishedApp, PublisherRecord} from './types.js';
import {claim, listPublished, publish, unpublish} from './verbs.js';

export interface CliIo {
  out(text: string): void;
  err(text: string): void;
  /** The environment; the process's by default. */
  env?: Env;
  /** Where relative paths are resolved; the process's working directory by default. */
  cwd?: string;
}

/** The variable the publisher's own credential is read from (task-13.4 decision 5). */
export const CREDENTIAL_VARIABLE = 'STELLIFY_CREDENTIAL';
/** The timeouts, the marketplace's own variables (task-13.4 decision 12). */
export const CARD_TIMEOUT_VARIABLE = 'A2UIVERSE_CARD_TIMEOUT_SECONDS';
export const SMOKE_TIMEOUT_VARIABLE = 'A2UIVERSE_SMOKE_TIMEOUT_SECONDS';
const DEFAULT_PREVIEW_FILE = 'preview.json';

const USAGE = [
  'usage: stellify <verb> … [--json]',
  '  pack [packageDir] [--out <dir>]                   writes the catalog artifact (default: dist/artifact) after the gate',
  '  check [packageDir]                                runs the whole pipeline in memory and the gate; writes nothing',
  '  claim <name> --marketplace <url> [--replace]      claims a publisher name; keeps its token in your home directory',
  '  preview <app-id> <card-url> [<artifact-dir> ...] [--out <file>]',
  '                                                    asks your running agent its first screen; writes preview.json',
  '  publish <app-id> <card-url> [<artifact-dir> ...] [--preview <file>]',
  '  unpublish <app-id>',
  '  list                                              what you have published',
  '',
].join('\n');

const VALUE_FLAGS = ['out', 'marketplace', 'preview'] as const;
const BOOL_FLAGS = ['json', 'replace'] as const;
type ValueFlag = (typeof VALUE_FLAGS)[number];
type BoolFlag = (typeof BOOL_FLAGS)[number];

interface Args {
  verb?: string;
  positional: string[];
  flags: Partial<Record<ValueFlag, string>> & Record<BoolFlag, boolean>;
}

const VERBS: Record<string, {flags: readonly string[]; min: number; max: number; needs: string}> = {
  pack: {flags: ['out', 'json'], min: 0, max: 1, needs: '[packageDir]'},
  check: {flags: ['json'], min: 0, max: 1, needs: '[packageDir]'},
  claim: {flags: ['marketplace', 'replace', 'json'], min: 1, max: 1, needs: '<name>'},
  preview: {flags: ['out', 'json'], min: 2, max: Infinity, needs: '<app-id> <card-url>'},
  publish: {flags: ['preview', 'json'], min: 2, max: Infinity, needs: '<app-id> <card-url>'},
  unpublish: {flags: ['json'], min: 1, max: 1, needs: '<app-id>'},
  list: {flags: ['json'], min: 0, max: 0, needs: ''},
};

function parse(argv: string[]): Args | string {
  const args: Args = {positional: [], flags: {json: false, replace: false}};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (!arg.startsWith('-')) {
      args.positional.push(arg);
      continue;
    }
    const [name, inline] = arg.replace(/^--/, '').split(/=(.*)/s, 2) as [string, string?];
    if ((BOOL_FLAGS as readonly string[]).includes(name) && inline === undefined) {
      args.flags[name as BoolFlag] = true;
    } else if ((VALUE_FLAGS as readonly string[]).includes(name)) {
      const value = inline ?? argv[++i];
      if (value === undefined) return `--${name} needs a value`;
      args.flags[name as ValueFlag] = value;
    } else return `unknown flag ${arg}`;
  }
  args.verb = args.positional.shift();
  return args;
}

/** A positive number of seconds from the environment, as milliseconds; unset is the default. */
function seconds(env: Env, key: string, fallbackMs: number): number | string {
  const raw = env[key];
  if (raw === undefined || raw.trim() === '') return fallbackMs;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return `${key}: expected a positive number of seconds, got ${JSON.stringify(raw)}`;
  }
  return value * 1000;
}

export async function runCli(argv: string[], io: CliIo): Promise<number> {
  const env = io.env ?? process.env;
  const cwd = io.cwd ?? process.cwd();
  const usage = (message?: string): number => {
    io.err(message === undefined ? USAGE : `${message}\n${USAGE}`);
    return 2;
  };
  const args = parse(argv);
  if (typeof args === 'string') return usage(args);
  const spec = args.verb === undefined ? undefined : VERBS[args.verb];
  if (!spec || args.verb === undefined) return usage();
  const verb = args.verb;
  for (const flag of [...VALUE_FLAGS, ...BOOL_FLAGS]) {
    const set =
      flag === 'json' || flag === 'replace' ? args.flags[flag] : args.flags[flag] !== undefined;
    if (set && !spec.flags.includes(flag)) return usage(`${verb} does not take --${flag}`);
  }
  if (args.positional.length > spec.max) return usage('too many arguments');
  if (args.positional.length < spec.min) return usage(`${verb} needs ${spec.needs}`);

  const ctx: Context = {io, env, cwd, args: {...args, verb}};
  switch (verb) {
    case 'pack':
    case 'check':
      return runPack(ctx);
    case 'claim':
      return runClaim(ctx);
    case 'preview':
      return runPreview(ctx);
    case 'publish':
      return runPublish(ctx);
    case 'unpublish':
      return runUnpublish(ctx);
    case 'list':
      return runList(ctx);
    default:
      return usage();
  }
}

interface Context {
  io: CliIo;
  env: Env;
  cwd: string;
  args: Args & {verb: string};
}

// --- pack, check ------------------------------------------------------------------------------

async function runPack({io, args}: Context): Promise<number> {
  const dir = args.positional[0] ?? '.';
  // `--out` is relative to the working directory, as a flag is; the config's outDir to the package.
  const result = await stellify(
    dir,
    args.flags.out === undefined ? {} : {outDir: resolve(args.flags.out)},
  );
  const written =
    args.verb === 'pack' && result.findings.length === 0 ? await writeArtifact(result) : undefined;
  if (args.flags.json) {
    io.out(
      `${JSON.stringify({descriptor: result.descriptor, findings: result.findings, outDir: written ?? null}, null, 2)}\n`,
    );
  } else if (result.findings.length > 0) {
    for (const finding of result.findings) io.err(`${finding.file}: ${finding.reason}\n`);
    io.err(`${count(result.findings.length)}; nothing written\n`);
  } else {
    const {name, version} = result.descriptor!.package;
    const files = `${result.files.size} files`;
    io.out(
      written === undefined
        ? `${name} ${version} — ${files}, no findings\n`
        : `${name} ${version} — ${files} written to ${written}\n`,
    );
  }
  return result.findings.length === 0 ? 0 : 1;
}

const count = (n: number) => `${n} finding${n === 1 ? '' : 's'}`;

// --- the publisher file and the notices ---------------------------------------------------------

/** The claimed publisher; a damaged file is reported and `null` returned. */
async function publisherOf({io, env}: Context): Promise<PublisherRecord | undefined | null> {
  try {
    return await readPublisherFile(env);
  } catch (err) {
    io.err(`${(err as Error).message}\n`);
    return null;
  }
}

/** The claimed publisher, required: none is a refusal naming the path. */
async function requirePublisher(ctx: Context): Promise<PublisherRecord | null> {
  const record = await publisherOf(ctx);
  if (record === null) return null;
  if (record === undefined) {
    ctx.io.err(
      `no publisher claimed on this machine: run \`stellify claim <name> --marketplace <url>\` first (looked in ${publisherFilePath(ctx.env)})\n`,
    );
    return null;
  }
  return record;
}

function printNotices(io: CliIo, notices: readonly Notice[]): void {
  for (const notice of notices) io.err(`${describeNotice(notice)}\n`);
}

/** The notices on every contact: `index.json` read first; a marketplace not reached is the verb's own failure. */
async function noticesFirst(ctx: Context, record: PublisherRecord): Promise<PublishedApp[] | null> {
  const listed = await listPublished({
    marketplace: record.marketplace,
    publisher: record.publisher,
  });
  if (!listed.ok) {
    for (const finding of listed.findings) ctx.io.err(`${finding}\n`);
    return null;
  }
  printNotices(ctx.io, listed.notices);
  return listed.apps;
}

function refused(io: CliIo, appId: string, findings: readonly string[]): number {
  io.err(`refused ${appId}:\n`);
  for (const finding of findings) io.err(`  ${finding}\n`);
  return 1;
}

// --- claim ------------------------------------------------------------------------------------

async function runClaim(ctx: Context): Promise<number> {
  const {io, env, args} = ctx;
  const name = args.positional[0]!;
  const marketplace = args.flags.marketplace;
  if (marketplace === undefined) {
    io.err(
      `claim needs --marketplace <url>: the marketplace to claim ${JSON.stringify(name)} at\n`,
    );
    return 2;
  }
  const held = await publisherOf(ctx);
  if (held === null) return 1;
  if (held !== undefined && !args.flags.replace) {
    io.err(
      `a publisher is already claimed on this machine: ${held.publisher} at ${held.marketplace}, in ${publisherFilePath(env)}\n` +
        'pass --replace to claim another name; the kept token is then forgotten, and a lost token is a lost name\n',
    );
    return 1;
  }
  const result = await claim({marketplace, name});
  if (!result.ok) {
    for (const finding of result.findings) io.err(`${finding}\n`);
    return 1;
  }
  const path = await writePublisherFile(env, {
    marketplace: result.marketplace,
    publisher: result.publisher,
    token: result.token,
  });
  if (args.flags.json) {
    io.out(
      `${JSON.stringify({publisher: result.publisher, marketplace: result.marketplace, path}, null, 2)}\n`,
    );
  } else {
    io.out(`claimed ${result.publisher} at ${result.marketplace} · token kept in ${path}\n`);
  }
  return 0;
}

// --- the artifact directories ---------------------------------------------------------------------

async function readDirectories(
  {io, cwd}: Context,
  dirs: readonly string[],
): Promise<Map<string, Uint8Array>[] | null> {
  const catalogs: Map<string, Uint8Array>[] = [];
  for (const dir of dirs) {
    const path = resolve(cwd, dir);
    try {
      catalogs.push(await readTree(path));
    } catch (err) {
      io.err(`cannot read the artifact directory ${path}: ${(err as Error).message}\n`);
      return null;
    }
  }
  return catalogs;
}

// --- preview ----------------------------------------------------------------------------------

async function runPreview(ctx: Context): Promise<number> {
  const {io, env, cwd, args} = ctx;
  const [appId, cardUrl, ...dirs] = args.positional as [string, string, ...string[]];
  const cardTimeoutMs = seconds(env, CARD_TIMEOUT_VARIABLE, 10_000);
  const smokeTimeoutMs = seconds(env, SMOKE_TIMEOUT_VARIABLE, 60_000);
  for (const timeout of [cardTimeoutMs, smokeTimeoutMs]) {
    if (typeof timeout === 'string') {
      io.err(`${timeout}\n`);
      return 2;
    }
  }
  const record = await publisherOf(ctx);
  if (record === null) return 1;
  const catalogs = await readDirectories(ctx, dirs);
  if (catalogs === null) return 1;
  const credential = env[CREDENTIAL_VARIABLE];
  const result = await preview({
    appId,
    cardUrl,
    catalogs,
    ...(credential === undefined ? {} : {credential}),
    ...(record ? {marketplace: record.marketplace, publisher: record.publisher} : {}),
    cardTimeoutMs: cardTimeoutMs as number,
    smokeTimeoutMs: smokeTimeoutMs as number,
  });
  printNotices(io, result.notices);
  for (const note of result.notes) io.err(`note: ${note}\n`);
  if (result.document === null) {
    for (const finding of result.findings) io.err(`${finding}\n`);
    io.err(`${count(result.findings.length)}; nothing written\n`);
    return 1;
  }
  const path = resolve(cwd, args.flags.out ?? DEFAULT_PREVIEW_FILE);
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, `${JSON.stringify(result.document, null, 2)}\n`);
  if (args.flags.json) {
    io.out(`${JSON.stringify(result.document, null, 2)}\n`);
    return 0;
  }
  const surfaces = result.document.messages.filter(m => 'createSurface' in m).length;
  const tail = result.signIn
    ? ''
    : '; the card requires no sign-in, so the marketplace captures this app’s preview itself at publish';
  io.out(
    `preview of ${appId} at ${result.document.version} — ${surfaces} surface${surfaces === 1 ? '' : 's'} painted, written to ${path}${tail}\n`,
  );
  return 0;
}

// --- publish ----------------------------------------------------------------------------------

async function runPublish(ctx: Context): Promise<number> {
  const {io, cwd, args} = ctx;
  const [appId, cardUrl, ...dirs] = args.positional as [string, string, ...string[]];
  const record = await requirePublisher(ctx);
  if (!record) return 1;
  const catalogs = await readDirectories(ctx, dirs);
  if (catalogs === null) return 1;
  let previewDocument: unknown;
  if (args.flags.preview !== undefined) {
    const path = resolve(cwd, args.flags.preview);
    try {
      previewDocument = JSON.parse(await readFile(path, 'utf8'));
    } catch (err) {
      io.err(`cannot read the preview ${path}: ${(err as Error).message}\n`);
      return 1;
    }
  }
  if ((await noticesFirst(ctx, record)) === null) return 1;
  const result = await publish({
    marketplace: record.marketplace,
    token: record.token,
    appId,
    cardUrl,
    catalogs,
    ...(previewDocument === undefined
      ? {}
      : {preview: previewDocument as Parameters<typeof publish>[0]['preview']}),
  });
  if (args.flags.json) {
    const {status: _status, ...body} = result as typeof result & {status?: number};
    io.out(`${JSON.stringify(body, null, 2)}\n`);
    return result.ok ? 0 : 1;
  }
  if (!result.ok) return refused(io, appId, findingsOrToken(result, record));
  io.out(`${result.summary}\n`);
  for (const note of result.notes) io.out(`note: ${note}\n`);
  return 0;
}

/** A 401's words: the kept token is not one this marketplace knows. */
function findingsOrToken(
  result: {status?: number; findings: string[]},
  record: PublisherRecord,
): string[] {
  if (result.status !== 401) return result.findings;
  return [
    `the token kept on this machine is not one the marketplace at ${record.marketplace} knows: the name may have been claimed on another marketplace, or the marketplace reset; claim again with --replace`,
  ];
}

// --- unpublish --------------------------------------------------------------------------------

async function runUnpublish(ctx: Context): Promise<number> {
  const {io, args} = ctx;
  const appId = args.positional[0]!;
  const record = await requirePublisher(ctx);
  if (!record) return 1;
  if ((await noticesFirst(ctx, record)) === null) return 1;
  const result = await unpublish({marketplace: record.marketplace, token: record.token, appId});
  if (args.flags.json) {
    const {status: _status, ...body} = result as typeof result & {status?: number};
    io.out(`${JSON.stringify(body, null, 2)}\n`);
    return result.ok ? 0 : 1;
  }
  if (!result.ok) return refused(io, appId, findingsOrToken(result, record));
  io.out(`unpublished ${result.appId}\n`);
  return 0;
}

// --- list -------------------------------------------------------------------------------------

/** An artifact id as a line names it: its digest's first characters. */
const shortId = (id: string) => `${id.slice(0, 'sha256-'.length + 8)}…`;

async function runList(ctx: Context): Promise<number> {
  const {io, args} = ctx;
  const record = await requirePublisher(ctx);
  if (!record) return 1;
  const listed = await listPublished({
    marketplace: record.marketplace,
    publisher: record.publisher,
  });
  if (!listed.ok) {
    for (const finding of listed.findings) io.err(`${finding}\n`);
    return 1;
  }
  if (args.flags.json) {
    io.out(`${JSON.stringify(listed.apps, null, 2)}\n`);
    return 0;
  }
  if (listed.apps.length === 0) io.out(`nothing published by ${record.publisher}\n`);
  for (const app of listed.apps) {
    const catalogs = Object.entries(app.catalogs)
      .map(([id, build]) => `${id} at ${shortId(build)}`)
      .join(', ');
    const parts = [app.appId, app.version, catalogs === '' ? 'basic catalog' : catalogs];
    if (app.retired.length > 0) parts.push(`retired: ${app.retired.join(', ')}`);
    if (app.aheadOfStore) parts.push(`ahead of the Store: ${describeLacks(app.aheadOfStore)}`);
    io.out(`${parts.join('  ')}\n`);
  }
  return 0;
}

export {STELLIFY_HOME};
