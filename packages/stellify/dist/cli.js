#!/usr/bin/env node

// src/cli.ts
import { resolve } from "node:path";
import { stellify, writeArtifact } from "./index.js";
var USAGE = [
  "usage: stellify <pack|check> [packageDir] [--out <dir>] [--json]",
  "  pack   writes the catalog artifact (default: dist/artifact) after the gate",
  "  check  runs the whole pipeline in memory and the gate; writes nothing",
  ""
].join("\n");
function parse(argv) {
  const args = { dir: ".", json: false };
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") args.json = true;
    else if (arg === "--out") {
      const value = argv[++i];
      if (value === void 0) return "--out needs a directory";
      args.out = value;
    } else if (arg.startsWith("--out=")) args.out = arg.slice("--out=".length);
    else if (arg.startsWith("-")) return `unknown flag ${arg}`;
    else positional.push(arg);
  }
  [args.verb, args.dir = "."] = positional;
  if (positional.length > 2) return "too many arguments";
  return args;
}
async function runCli(argv, io) {
  const args = parse(argv);
  if (typeof args === "string" || args.verb !== "pack" && args.verb !== "check") {
    io.err(typeof args === "string" ? `${args}
${USAGE}` : USAGE);
    return 2;
  }
  const result = await stellify(
    args.dir,
    args.out === void 0 ? {} : { outDir: resolve(args.out) }
  );
  const written = args.verb === "pack" && result.findings.length === 0 ? await writeArtifact(result) : void 0;
  if (args.json) {
    io.out(
      `${JSON.stringify({ descriptor: result.descriptor, findings: result.findings, outDir: written ?? null }, null, 2)}
`
    );
  } else if (result.findings.length > 0) {
    for (const finding of result.findings) io.err(`${finding.file}: ${finding.reason}
`);
    io.err(
      `${result.findings.length} finding${result.findings.length === 1 ? "" : "s"}; nothing written
`
    );
  } else {
    const { name, version } = result.descriptor.package;
    const count = `${result.files.size} files`;
    io.out(
      written === void 0 ? `${name} ${version} — ${count}, no findings
` : `${name} ${version} — ${count} written to ${written}
`
    );
  }
  return result.findings.length === 0 ? 0 : 1;
}

// src/main.ts
process.exitCode = await runCli(process.argv.slice(2), {
  out: (text) => process.stdout.write(text),
  err: (text) => process.stderr.write(text)
});
