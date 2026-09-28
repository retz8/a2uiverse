import {existsSync, readFileSync} from 'node:fs';
import {join, relative} from 'node:path';
import {describe, expect, test} from 'vitest';
import {runCli} from '../src/cli.js';
import {copyFixture, edit} from './fixture.js';

async function run(args: string[]) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(args, {out: s => out.push(s), err: s => err.push(s)});
  return {code, out: out.join(''), err: err.join('')};
}

describe('stellify check', () => {
  test('green, writes nothing', async () => {
    const dir = copyFixture();
    const {code, out} = await run(['check', dir]);
    expect(code).toBe(0);
    expect(out).toMatch(/star-catalog 1\.2\.3 — 6 files, no findings/);
    expect(existsSync(join(dir, 'dist'))).toBe(false);
  });

  test('findings, one per line with file and reason, exit 1', async () => {
    const dir = copyFixture();
    edit(dir, 'lib/index.js', s => s.replace("export {CATALOG} from './catalog.js';", ''));
    const {code, err} = await run(['check', dir]);
    expect(code).toBe(1);
    expect(err).toMatch(/^lib\/index\.js: .*exports no CATALOG/m);
  });

  test('--json', async () => {
    const dir = copyFixture();
    const {code, out} = await run(['check', '--json', dir]);
    expect(code).toBe(0);
    const report = JSON.parse(out);
    expect(report.findings).toEqual([]);
    expect(report.descriptor.catalogId).toBe('https://example.com/star/catalog.json');
  });
});

describe('stellify pack', () => {
  test('writes the artifact and says where', async () => {
    const dir = copyFixture();
    const {code, out} = await run(['pack', dir]);
    expect(code).toBe(0);
    expect(out).toContain(join(dir, 'dist/artifact'));
    expect(existsSync(join(dir, 'dist/artifact/artifact.json'))).toBe(true);
  });

  test('--out overrides the config, relative to the working directory', async () => {
    const dir = copyFixture();
    const out = join(dir, '..', 'packed');
    const {code} = await run(['pack', dir, '--out', relative(process.cwd(), out)]);
    expect(code).toBe(0);
    expect(JSON.parse(readFileSync(join(out, 'artifact.json'), 'utf8')).entry).toBe('index.js');
  });

  test('refuses and leaves no artifact', async () => {
    const dir = copyFixture();
    edit(dir, 'lib/index.js', s => s.replace("export {CATALOG} from './catalog.js';", ''));
    const {code} = await run(['pack', dir]);
    expect(code).toBe(1);
    expect(existsSync(join(dir, 'dist/artifact'))).toBe(false);
  });

  test('an unknown verb', async () => {
    const {code, err} = await run(['publish']);
    expect(code).toBe(2);
    expect(err).toMatch(/pack|check/);
  });
});
