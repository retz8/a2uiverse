#!/usr/bin/env node
import {
  claim,
  describeLacks,
  describeNotice,
  listPublished,
  preview,
  publish,
  stellify,
  unpublish,
  writeArtifact
} from "./shared.js";

// src/cli.ts
import { mkdir as mkdir2, readFile as readFile3, writeFile as writeFile2 } from "node:fs/promises";
import { dirname, resolve } from "node:path";

// src/publisher.ts
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
var PUBLISHER_FILE = "publisher.json";
var STELLIFY_HOME = "STELLIFY_HOME";
function publisherDir(env) {
  if (env[STELLIFY_HOME]) return env[STELLIFY_HOME];
  const config = env.XDG_CONFIG_HOME || join(env.HOME ?? homedir(), ".config");
  return join(config, "stellify");
}
var publisherFilePath = (env) => join(publisherDir(env), PUBLISHER_FILE);
async function readPublisherFile(env) {
  const path = publisherFilePath(env);
  let text;
  try {
    text = await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return void 0;
    throw new Error(`cannot read ${path}: ${error.message}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`${path} is not JSON: ${error.message}`);
  }
  const record = parsed;
  for (const field of ["marketplace", "publisher", "token"]) {
    if (typeof record?.[field] !== "string" || record[field] === "") {
      throw new Error(`${path} is not a publisher file: no ${field}`);
    }
  }
  const { marketplace, publisher, token } = record;
  return { marketplace, publisher, token };
}
async function writePublisherFile(env, record) {
  const dir = publisherDir(env);
  await mkdir(dir, { recursive: true, mode: 448 });
  const path = join(dir, PUBLISHER_FILE);
  const temp = `${path}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(record, null, 2)}
`, { mode: 384 });
  await rename(temp, path);
  return path;
}

// src/tree.ts
import { readdir, readFile as readFile2 } from "node:fs/promises";
import { join as join2, relative, sep } from "node:path";
async function readTree(dir) {
  const files = /* @__PURE__ */ new Map();
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const full = join2(entry.parentPath, entry.name);
    files.set(relative(dir, full).split(sep).join("/"), new Uint8Array(await readFile2(full)));
  }
  return new Map([...files].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
}

// src/cli.ts
var CREDENTIAL_VARIABLE = "STELLIFY_CREDENTIAL";
var CARD_TIMEOUT_VARIABLE = "A2UIVERSE_CARD_TIMEOUT_SECONDS";
var SMOKE_TIMEOUT_VARIABLE = "A2UIVERSE_SMOKE_TIMEOUT_SECONDS";
var DEFAULT_PREVIEW_FILE = "preview.json";
var USAGE = [
  "usage: stellify <verb> … [--json]",
  "  pack [packageDir] [--out <dir>]                   writes the catalog artifact (default: dist/artifact) after the gate",
  "  check [packageDir]                                runs the whole pipeline in memory and the gate; writes nothing",
  "  claim <name> --marketplace <url> [--replace]      claims a publisher name; keeps its token in your home directory",
  "  preview <app-id> <card-url> [<artifact-dir> ...] [--out <file>]",
  "                                                    asks your running agent its first screen; writes preview.json",
  "  publish <app-id> <card-url> [<artifact-dir> ...] [--preview <file>]",
  "  unpublish <app-id>",
  "  list                                              what you have published",
  ""
].join("\n");
var VALUE_FLAGS = ["out", "marketplace", "preview"];
var BOOL_FLAGS = ["json", "replace"];
var VERBS = {
  pack: { flags: ["out", "json"], min: 0, max: 1, needs: "[packageDir]" },
  check: { flags: ["json"], min: 0, max: 1, needs: "[packageDir]" },
  claim: { flags: ["marketplace", "replace", "json"], min: 1, max: 1, needs: "<name>" },
  preview: { flags: ["out", "json"], min: 2, max: Infinity, needs: "<app-id> <card-url>" },
  publish: { flags: ["preview", "json"], min: 2, max: Infinity, needs: "<app-id> <card-url>" },
  unpublish: { flags: ["json"], min: 1, max: 1, needs: "<app-id>" },
  list: { flags: ["json"], min: 0, max: 0, needs: "" }
};
function parse(argv) {
  const args = { positional: [], flags: { json: false, replace: false } };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("-")) {
      args.positional.push(arg);
      continue;
    }
    const [name, inline] = arg.replace(/^--/, "").split(/=(.*)/s, 2);
    if (BOOL_FLAGS.includes(name) && inline === void 0) {
      args.flags[name] = true;
    } else if (VALUE_FLAGS.includes(name)) {
      const value = inline ?? argv[++i];
      if (value === void 0) return `--${name} needs a value`;
      args.flags[name] = value;
    } else return `unknown flag ${arg}`;
  }
  args.verb = args.positional.shift();
  return args;
}
function seconds(env, key, fallbackMs) {
  const raw = env[key];
  if (raw === void 0 || raw.trim() === "") return fallbackMs;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return `${key}: expected a positive number of seconds, got ${JSON.stringify(raw)}`;
  }
  return value * 1e3;
}
async function runCli(argv, io) {
  const env = io.env ?? process.env;
  const cwd = io.cwd ?? process.cwd();
  const usage = (message) => {
    io.err(message === void 0 ? USAGE : `${message}
${USAGE}`);
    return 2;
  };
  const args = parse(argv);
  if (typeof args === "string") return usage(args);
  const spec = args.verb === void 0 ? void 0 : VERBS[args.verb];
  if (!spec || args.verb === void 0) return usage();
  const verb = args.verb;
  for (const flag of [...VALUE_FLAGS, ...BOOL_FLAGS]) {
    const set = flag === "json" || flag === "replace" ? args.flags[flag] : args.flags[flag] !== void 0;
    if (set && !spec.flags.includes(flag)) return usage(`${verb} does not take --${flag}`);
  }
  if (args.positional.length > spec.max) return usage("too many arguments");
  if (args.positional.length < spec.min) return usage(`${verb} needs ${spec.needs}`);
  const ctx = { io, env, cwd, args: { ...args, verb } };
  switch (verb) {
    case "pack":
    case "check":
      return runPack(ctx);
    case "claim":
      return runClaim(ctx);
    case "preview":
      return runPreview(ctx);
    case "publish":
      return runPublish(ctx);
    case "unpublish":
      return runUnpublish(ctx);
    case "list":
      return runList(ctx);
    default:
      return usage();
  }
}
async function runPack({ io, args }) {
  const dir = args.positional[0] ?? ".";
  const result = await stellify(
    dir,
    args.flags.out === void 0 ? {} : { outDir: resolve(args.flags.out) }
  );
  const written = args.verb === "pack" && result.findings.length === 0 ? await writeArtifact(result) : void 0;
  if (args.flags.json) {
    io.out(
      `${JSON.stringify({ descriptor: result.descriptor, findings: result.findings, outDir: written ?? null }, null, 2)}
`
    );
  } else if (result.findings.length > 0) {
    for (const finding of result.findings) io.err(`${finding.file}: ${finding.reason}
`);
    io.err(`${count(result.findings.length)}; nothing written
`);
  } else {
    const { name, version } = result.descriptor.package;
    const files = `${result.files.size} files`;
    io.out(
      written === void 0 ? `${name} ${version} — ${files}, no findings
` : `${name} ${version} — ${files} written to ${written}
`
    );
  }
  return result.findings.length === 0 ? 0 : 1;
}
var count = (n) => `${n} finding${n === 1 ? "" : "s"}`;
async function publisherOf({ io, env }) {
  try {
    return await readPublisherFile(env);
  } catch (err) {
    io.err(`${err.message}
`);
    return null;
  }
}
async function requirePublisher(ctx) {
  const record = await publisherOf(ctx);
  if (record === null) return null;
  if (record === void 0) {
    ctx.io.err(
      `no publisher claimed on this machine: run \`stellify claim <name> --marketplace <url>\` first (looked in ${publisherFilePath(ctx.env)})
`
    );
    return null;
  }
  return record;
}
function printNotices(io, notices) {
  for (const notice of notices) io.err(`${describeNotice(notice)}
`);
}
async function noticesFirst(ctx, record) {
  const listed = await listPublished({
    marketplace: record.marketplace,
    publisher: record.publisher
  });
  if (!listed.ok) {
    for (const finding of listed.findings) ctx.io.err(`${finding}
`);
    return null;
  }
  printNotices(ctx.io, listed.notices);
  return listed.apps;
}
function refused(io, appId, findings) {
  io.err(`refused ${appId}:
`);
  for (const finding of findings) io.err(`  ${finding}
`);
  return 1;
}
async function runClaim(ctx) {
  const { io, env, args } = ctx;
  const name = args.positional[0];
  const marketplace = args.flags.marketplace;
  if (marketplace === void 0) {
    io.err(
      `claim needs --marketplace <url>: the marketplace to claim ${JSON.stringify(name)} at
`
    );
    return 2;
  }
  const held = await publisherOf(ctx);
  if (held === null) return 1;
  if (held !== void 0 && !args.flags.replace) {
    io.err(
      `a publisher is already claimed on this machine: ${held.publisher} at ${held.marketplace}, in ${publisherFilePath(env)}
pass --replace to claim another name; the kept token is then forgotten, and a lost token is a lost name
`
    );
    return 1;
  }
  const result = await claim({ marketplace, name });
  if (!result.ok) {
    for (const finding of result.findings) io.err(`${finding}
`);
    return 1;
  }
  const path = await writePublisherFile(env, {
    marketplace: result.marketplace,
    publisher: result.publisher,
    token: result.token
  });
  if (args.flags.json) {
    io.out(
      `${JSON.stringify({ publisher: result.publisher, marketplace: result.marketplace, path }, null, 2)}
`
    );
  } else {
    io.out(`claimed ${result.publisher} at ${result.marketplace} · token kept in ${path}
`);
  }
  return 0;
}
async function readDirectories({ io, cwd }, dirs) {
  const catalogs = [];
  for (const dir of dirs) {
    const path = resolve(cwd, dir);
    try {
      catalogs.push(await readTree(path));
    } catch (err) {
      io.err(`cannot read the artifact directory ${path}: ${err.message}
`);
      return null;
    }
  }
  return catalogs;
}
async function runPreview(ctx) {
  const { io, env, cwd, args } = ctx;
  const [appId, cardUrl, ...dirs] = args.positional;
  const cardTimeoutMs = seconds(env, CARD_TIMEOUT_VARIABLE, 1e4);
  const smokeTimeoutMs = seconds(env, SMOKE_TIMEOUT_VARIABLE, 6e4);
  for (const timeout of [cardTimeoutMs, smokeTimeoutMs]) {
    if (typeof timeout === "string") {
      io.err(`${timeout}
`);
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
    ...credential === void 0 ? {} : { credential },
    ...record ? { marketplace: record.marketplace, publisher: record.publisher } : {},
    cardTimeoutMs,
    smokeTimeoutMs
  });
  printNotices(io, result.notices);
  for (const note of result.notes) io.err(`note: ${note}
`);
  if (result.document === null) {
    for (const finding of result.findings) io.err(`${finding}
`);
    io.err(`${count(result.findings.length)}; nothing written
`);
    return 1;
  }
  const path = resolve(cwd, args.flags.out ?? DEFAULT_PREVIEW_FILE);
  await mkdir2(dirname(path), { recursive: true });
  await writeFile2(path, `${JSON.stringify(result.document, null, 2)}
`);
  if (args.flags.json) {
    io.out(`${JSON.stringify(result.document, null, 2)}
`);
    return 0;
  }
  const surfaces = result.document.messages.filter((m) => "createSurface" in m).length;
  const tail = result.signIn ? "" : "; the card requires no sign-in, so the marketplace captures this app’s preview itself at publish";
  io.out(
    `preview of ${appId} at ${result.document.version} — ${surfaces} surface${surfaces === 1 ? "" : "s"} painted, written to ${path}${tail}
`
  );
  return 0;
}
async function runPublish(ctx) {
  const { io, cwd, args } = ctx;
  const [appId, cardUrl, ...dirs] = args.positional;
  const record = await requirePublisher(ctx);
  if (!record) return 1;
  const catalogs = await readDirectories(ctx, dirs);
  if (catalogs === null) return 1;
  let previewDocument;
  if (args.flags.preview !== void 0) {
    const path = resolve(cwd, args.flags.preview);
    try {
      previewDocument = JSON.parse(await readFile3(path, "utf8"));
    } catch (err) {
      io.err(`cannot read the preview ${path}: ${err.message}
`);
      return 1;
    }
  }
  if (await noticesFirst(ctx, record) === null) return 1;
  const result = await publish({
    marketplace: record.marketplace,
    token: record.token,
    appId,
    cardUrl,
    catalogs,
    ...previewDocument === void 0 ? {} : { preview: previewDocument }
  });
  if (args.flags.json) {
    const { status: _status, ...body } = result;
    io.out(`${JSON.stringify(body, null, 2)}
`);
    return result.ok ? 0 : 1;
  }
  if (!result.ok) return refused(io, appId, findingsOrToken(result, record));
  io.out(`${result.summary}
`);
  for (const note of result.notes) io.out(`note: ${note}
`);
  return 0;
}
function findingsOrToken(result, record) {
  if (result.status !== 401) return result.findings;
  return [
    `the token kept on this machine is not one the marketplace at ${record.marketplace} knows: the name may have been claimed on another marketplace, or the marketplace reset; claim again with --replace`
  ];
}
async function runUnpublish(ctx) {
  const { io, args } = ctx;
  const appId = args.positional[0];
  const record = await requirePublisher(ctx);
  if (!record) return 1;
  if (await noticesFirst(ctx, record) === null) return 1;
  const result = await unpublish({ marketplace: record.marketplace, token: record.token, appId });
  if (args.flags.json) {
    const { status: _status, ...body } = result;
    io.out(`${JSON.stringify(body, null, 2)}
`);
    return result.ok ? 0 : 1;
  }
  if (!result.ok) return refused(io, appId, findingsOrToken(result, record));
  io.out(`unpublished ${result.appId}
`);
  return 0;
}
var shortId = (id) => `${id.slice(0, "sha256-".length + 8)}…`;
async function runList(ctx) {
  const { io, args } = ctx;
  const record = await requirePublisher(ctx);
  if (!record) return 1;
  const listed = await listPublished({
    marketplace: record.marketplace,
    publisher: record.publisher
  });
  if (!listed.ok) {
    for (const finding of listed.findings) io.err(`${finding}
`);
    return 1;
  }
  if (args.flags.json) {
    io.out(`${JSON.stringify(listed.apps, null, 2)}
`);
    return 0;
  }
  if (listed.apps.length === 0) io.out(`nothing published by ${record.publisher}
`);
  for (const app of listed.apps) {
    const catalogs = Object.entries(app.catalogs).map(([id, build]) => `${id} at ${shortId(build)}`).join(", ");
    const parts = [app.appId, app.version, catalogs === "" ? "basic catalog" : catalogs];
    if (app.retired.length > 0) parts.push(`retired: ${app.retired.join(", ")}`);
    if (app.aheadOfStore) parts.push(`ahead of the Store: ${describeLacks(app.aheadOfStore)}`);
    io.out(`${parts.join("  ")}
`);
  }
  return 0;
}

// src/main.ts
process.exitCode = await runCli(process.argv.slice(2), {
  out: (text) => process.stdout.write(text),
  err: (text) => process.stderr.write(text)
});
