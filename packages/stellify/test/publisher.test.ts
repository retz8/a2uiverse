/** The publisher's home-directory configuration (task-13.4 decisions 1, 2). */
import {existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, describe, expect, test} from 'vitest';
import {
  PUBLISHER_FILE,
  publisherFilePath,
  readPublisherFile,
  writePublisherFile,
} from '../src/publisher.js';

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, {recursive: true, force: true});
});
const scratch = () => {
  const dir = mkdtempSync(join(tmpdir(), 'stellify-home-'));
  dirs.push(dir);
  return dir;
};

const RECORD = {marketplace: 'http://127.0.0.1:10002', publisher: 'acme', token: 'x'.repeat(43)};

describe('the publisher file', () => {
  test('lives in the stellify directory under the XDG configuration directory, by default ~/.config', () => {
    expect(publisherFilePath({HOME: '/home/u'})).toBe(
      join('/home/u', '.config', 'stellify', PUBLISHER_FILE),
    );
    expect(publisherFilePath({HOME: '/home/u', XDG_CONFIG_HOME: '/xdg'})).toBe(
      join('/xdg', 'stellify', PUBLISHER_FILE),
    );
  });

  test('STELLIFY_HOME names the directory instead', () => {
    expect(
      publisherFilePath({HOME: '/home/u', XDG_CONFIG_HOME: '/xdg', STELLIFY_HOME: '/elsewhere'}),
    ).toBe(join('/elsewhere', PUBLISHER_FILE));
  });

  test('written owner-only and read back', async () => {
    const home = scratch();
    const env = {STELLIFY_HOME: join(home, 'nested', 'deeper')};
    await writePublisherFile(env, RECORD);
    const path = publisherFilePath(env);
    expect(statSync(path).mode & 0o777).toBe(0o600);
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual(RECORD);
    expect(await readPublisherFile(env)).toEqual(RECORD);
    expect(existsSync(`${path}.tmp`)).toBe(false);
  });

  test('absent: nothing claimed', async () => {
    expect(await readPublisherFile({STELLIFY_HOME: scratch()})).toBeUndefined();
  });

  test('damaged: refused, naming the path', async () => {
    const home = scratch();
    const env = {STELLIFY_HOME: home};
    writeFileSync(join(home, PUBLISHER_FILE), '{"publisher": 1}');
    await expect(readPublisherFile(env)).rejects.toThrow(join(home, PUBLISHER_FILE));
  });
});
