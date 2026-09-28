/** `stellify pack [dir] [--out <dir>]` and `stellify check [dir]`, `--json` for a machine-readable report. */
import {resolve} from 'node:path';
import {stellify, writeArtifact} from './index.js';

export interface CliIo {
  out(text: string): void;
  err(text: string): void;
}

const USAGE = [
  'usage: stellify <pack|check> [packageDir] [--out <dir>] [--json]',
  '  pack   writes the catalog artifact (default: dist/artifact) after the gate',
  '  check  runs the whole pipeline in memory and the gate; writes nothing',
  '',
].join('\n');

interface Args {
  verb?: string;
  dir: string;
  out?: string;
  json: boolean;
}

function parse(argv: string[]): Args | string {
  const args: Args = {dir: '.', json: false};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--json') args.json = true;
    else if (arg === '--out') {
      const value = argv[++i];
      if (value === undefined) return '--out needs a directory';
      args.out = value;
    } else if (arg.startsWith('--out=')) args.out = arg.slice('--out='.length);
    else if (arg.startsWith('-')) return `unknown flag ${arg}`;
    else positional.push(arg);
  }
  [args.verb, args.dir = '.'] = positional;
  if (positional.length > 2) return 'too many arguments';
  return args;
}

export async function runCli(argv: string[], io: CliIo): Promise<number> {
  const args = parse(argv);
  if (typeof args === 'string' || (args.verb !== 'pack' && args.verb !== 'check')) {
    io.err(typeof args === 'string' ? `${args}\n${USAGE}` : USAGE);
    return 2;
  }
  // `--out` is relative to the working directory, as a flag is; the config's outDir to the package.
  const result = await stellify(
    args.dir,
    args.out === undefined ? {} : {outDir: resolve(args.out)},
  );
  const written =
    args.verb === 'pack' && result.findings.length === 0 ? await writeArtifact(result) : undefined;
  if (args.json) {
    io.out(
      `${JSON.stringify({descriptor: result.descriptor, findings: result.findings, outDir: written ?? null}, null, 2)}\n`,
    );
  } else if (result.findings.length > 0) {
    for (const finding of result.findings) io.err(`${finding.file}: ${finding.reason}\n`);
    io.err(
      `${result.findings.length} finding${result.findings.length === 1 ? '' : 's'}; nothing written\n`,
    );
  } else {
    const {name, version} = result.descriptor!.package;
    const count = `${result.files.size} files`;
    io.out(
      written === undefined
        ? `${name} ${version} — ${count}, no findings\n`
        : `${name} ${version} — ${count} written to ${written}\n`,
    );
  }
  return result.findings.length === 0 ? 0 : 1;
}
