/** The command line over the marketplace verbs (task-13.4 decisions 3, 6, 7, 9, 10). */
import {existsSync, mkdtempSync, readFileSync, rmSync, statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {afterEach, beforeAll, describe, expect, test} from 'vitest';
import {runCli} from '../src/cli.js';
import {stellify, writeArtifact} from '../src/index.js';
import {PUBLISHER_FILE, writePublisherFile} from '../src/publisher.js';
import {STAR_CATALOG_ID, startFakeAgent, type FakeAgent} from './fakeAgent.js';
import {entryFor, startFakeMarketplace, type FakeMarketplace} from './fakeMarketplace.js';
import {copyFixture} from './fixture.js';

let packed: string;
beforeAll(async () => {
  const result = await stellify(copyFixture());
  packed = await writeArtifact(result);
});

const dirs: string[] = [];
let agent: FakeAgent | undefined;
let marketplace: FakeMarketplace | undefined;
afterEach(async () => {
  await agent?.close();
  await marketplace?.close();
  agent = marketplace = undefined;
  for (const dir of dirs.splice(0)) rmSync(dir, {recursive: true, force: true});
});

const scratch = (prefix = 'stellify-cli-') => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  dirs.push(dir);
  return dir;
};

interface Run {
  env?: Record<string, string | undefined>;
  cwd?: string;
}

async function run(args: string[], {env = {}, cwd}: Run = {}) {
  const out: string[] = [];
  const err: string[] = [];
  const code = await runCli(args, {
    out: s => out.push(s),
    err: s => err.push(s),
    env: {STELLIFY_HOME: scratch('stellify-home-'), ...env},
    cwd: cwd ?? scratch('stellify-cwd-'),
  });
  return {code, out: out.join(''), err: err.join('')};
}

/** A home with a claimed publisher, against `marketplace`. */
async function claimed(url: string, publisher = 'acme', token?: string) {
  const home = scratch('stellify-home-');
  await writePublisherFile(
    {STELLIFY_HOME: home},
    {marketplace: url, publisher, token: token ?? marketplace!.token},
  );
  return home;
}

describe('stellify claim', () => {
  test('a free name: the file written owner-only; the name, the address and the path printed, never the token', async () => {
    marketplace = await startFakeMarketplace();
    const home = scratch('stellify-home-');
    const {code, out, err} = await run(['claim', 'acme', '--marketplace', marketplace.url], {
      env: {STELLIFY_HOME: home},
    });
    expect(err).toBe('');
    expect(code).toBe(0);
    const path = join(home, PUBLISHER_FILE);
    expect(out).toBe(`claimed acme at ${marketplace.url} · token kept in ${path}\n`);
    expect(out).not.toContain(marketplace.token);
    expect(statSync(path).mode & 0o777).toBe(0o600);
    expect(JSON.parse(readFileSync(path, 'utf8'))).toEqual({
      marketplace: marketplace.url,
      publisher: 'acme',
      token: marketplace.token,
    });
  });

  test('the address is required', async () => {
    const {code, err} = await run(['claim', 'acme']);
    expect(code).toBe(2);
    expect(err).toMatch(/--marketplace/);
  });

  test('a publisher already claimed refuses without --replace, and is replaced with it', async () => {
    marketplace = await startFakeMarketplace();
    const home = await claimed('http://127.0.0.1:1', 'old-name', 'x'.repeat(43));
    const refused = await run(['claim', 'acme', '--marketplace', marketplace.url], {
      env: {STELLIFY_HOME: home},
    });
    expect(refused.code).toBe(1);
    expect(refused.err).toBe(
      `a publisher is already claimed on this machine: old-name at http://127.0.0.1:1, in ${join(home, PUBLISHER_FILE)}\npass --replace to claim another name; the kept token is then forgotten, and a lost token is a lost name\n`,
    );
    expect(marketplace.requests).toEqual([]);
    const replaced = await run(['claim', 'acme', '--marketplace', marketplace.url, '--replace'], {
      env: {STELLIFY_HOME: home},
    });
    expect(replaced.code).toBe(0);
    expect(JSON.parse(readFileSync(join(home, PUBLISHER_FILE), 'utf8')).publisher).toBe('acme');
  });

  test('a taken name: the findings one per line, exit 1, the file untouched', async () => {
    marketplace = await startFakeMarketplace({
      claim: () => ({status: 409, body: {ok: false, findings: ['publisher name "acme" is taken']}}),
    });
    const home = scratch('stellify-home-');
    const {code, err} = await run(['claim', 'acme', '--marketplace', marketplace.url], {
      env: {STELLIFY_HOME: home},
    });
    expect(code).toBe(1);
    expect(err).toBe('publisher name "acme" is taken\n');
    expect(existsSync(join(home, PUBLISHER_FILE))).toBe(false);
  });

  test('--json prints the name, the address and the path', async () => {
    marketplace = await startFakeMarketplace();
    const home = scratch('stellify-home-');
    const {code, out} = await run(['claim', 'acme', '--marketplace', marketplace.url, '--json'], {
      env: {STELLIFY_HOME: home},
    });
    expect(code).toBe(0);
    expect(JSON.parse(out)).toEqual({
      publisher: 'acme',
      marketplace: marketplace.url,
      path: join(home, PUBLISHER_FILE),
    });
  });
});

describe('before any request', () => {
  test('publish, unpublish and list refuse when no publisher is claimed, naming the path', async () => {
    for (const args of [
      ['publish', 'star', 'http://127.0.0.1:1/card.json'],
      ['unpublish', 'star'],
      ['list'],
    ]) {
      const home = scratch('stellify-home-');
      const {code, err} = await run(args, {env: {STELLIFY_HOME: home}});
      expect(code).toBe(1);
      expect(err).toBe(
        `no publisher claimed on this machine: run \`stellify claim <name> --marketplace <url>\` first (looked in ${join(home, PUBLISHER_FILE)})\n`,
      );
    }
  });

  test('a damaged publisher file', async () => {
    const home = scratch('stellify-home-');
    const {writeFileSync} = await import('node:fs');
    writeFileSync(join(home, PUBLISHER_FILE), 'nope');
    const {code, err} = await run(['list'], {env: {STELLIFY_HOME: home}});
    expect(code).toBe(1);
    expect(err).toContain(join(home, PUBLISHER_FILE));
  });
});

describe('stellify publish', () => {
  test('the directories read, the marketplace’s summary and notes printed', async () => {
    marketplace = await startFakeMarketplace();
    const home = await claimed(marketplace.url);
    const {code, out, err} = await run(
      ['publish', 'star', 'http://127.0.0.1:1/card.json', packed],
      {env: {STELLIFY_HOME: home}},
    );
    expect(err).toBe('');
    expect(code).toBe(0);
    expect(out).toBe(
      'published star · card 0.1.0 · catalog sha256-xxxxxxxx…\nnote: app id "star" is now acme’s\n',
    );
    const body = marketplace.requests.at(-1)?.body as {catalogs: {files: Record<string, string>}[]};
    expect(Object.keys(body.catalogs[0]!.files).sort()).toEqual([
      'artifact.json',
      'catalog.json',
      'index.js',
      'lib/fonts/star.woff2',
      'lib/theme.css',
      'node_modules/star-dialog/lib/dialog.css',
      'node_modules/star-dialog/lib/tokens.css',
    ]);
  });

  test('a relative directory is the caller’s', async () => {
    marketplace = await startFakeMarketplace();
    const home = await claimed(marketplace.url);
    const {code} = await run(['publish', 'star', 'http://127.0.0.1:1/card.json', 'artifact'], {
      env: {STELLIFY_HOME: home},
      cwd: join(packed, '..'),
    });
    expect(code).toBe(0);
  });

  test('a directory that cannot be read refuses before any request', async () => {
    marketplace = await startFakeMarketplace();
    const home = await claimed(marketplace.url);
    const {code, err} = await run(
      ['publish', 'star', 'http://127.0.0.1:1/card.json', '/nowhere/at/all'],
      {env: {STELLIFY_HOME: home}},
    );
    expect(code).toBe(1);
    expect(err).toMatch(/^cannot read the artifact directory \/nowhere\/at\/all: /);
    expect(marketplace.requests).toEqual([]);
  });

  test('--preview sends the file beside the artifacts; a malformed one refuses before any request', async () => {
    marketplace = await startFakeMarketplace();
    const home = await claimed(marketplace.url);
    const cwd = scratch('stellify-cwd-');
    const {writeFileSync} = await import('node:fs');
    const document = {
      appId: 'star',
      version: '0.1.0',
      words: 'Hello!',
      messages: [{version: 'v0.9', createSurface: {surfaceId: 's1', catalogId: STAR_CATALOG_ID}}],
      capturedBy: 'publisher',
      capturedAt: '2026-10-10T00:00:00.000Z',
    };
    writeFileSync(join(cwd, 'preview.json'), JSON.stringify(document));
    const {code} = await run(
      ['publish', 'star', 'http://127.0.0.1:1/card.json', packed, '--preview', 'preview.json'],
      {env: {STELLIFY_HOME: home}, cwd},
    );
    expect(code).toBe(0);
    expect((marketplace.requests.at(-1)?.body as {preview: unknown}).preview).toEqual(document);

    writeFileSync(join(cwd, 'bad.json'), '{"appId": "star"}');
    const bad = await run(
      ['publish', 'star', 'http://127.0.0.1:1/card.json', packed, '--preview', 'bad.json'],
      {env: {STELLIFY_HOME: home}, cwd},
    );
    expect(bad.code).toBe(1);
    expect(bad.err).toMatch(/^refused star:\n {2}the preview is not a preview document: /);
    expect(marketplace.requests.filter(r => r.path === 'publish')).toHaveLength(1);
  });

  test('a refusal: "refused <app-id>:" and every finding indented', async () => {
    marketplace = await startFakeMarketplace({
      publish: () => ({status: 422, body: {ok: false, findings: ['one', 'two']}}),
    });
    const home = await claimed(marketplace.url);
    const {code, err} = await run(['publish', 'star', 'http://127.0.0.1:1/card.json'], {
      env: {STELLIFY_HOME: home},
    });
    expect(code).toBe(1);
    expect(err).toBe('refused star:\n  one\n  two\n');
  });

  test('a 401 says the token on this machine is not one the marketplace knows', async () => {
    marketplace = await startFakeMarketplace();
    const home = await claimed(marketplace.url, 'acme', 'y'.repeat(43));
    const {code, err} = await run(['publish', 'star', 'http://127.0.0.1:1/card.json'], {
      env: {STELLIFY_HOME: home},
    });
    expect(code).toBe(1);
    expect(err).toBe(
      `refused star:\n  the token kept on this machine is not one the marketplace at ${marketplace.url} knows: the name may have been claimed on another marketplace, or the marketplace reset; claim again with --replace\n`,
    );
  });

  test('--json prints the marketplace’s response body as it came', async () => {
    marketplace = await startFakeMarketplace();
    const home = await claimed(marketplace.url);
    const {code, out} = await run(
      ['publish', 'star', 'http://127.0.0.1:1/card.json', packed, '--json'],
      {env: {STELLIFY_HOME: home}},
    );
    expect(code).toBe(0);
    expect(JSON.parse(out)).toEqual({
      ok: true,
      appId: 'star',
      version: '0.1.0',
      summary: 'published star · card 0.1.0 · catalog sha256-xxxxxxxx…',
      notes: ['app id "star" is now acme’s'],
    });
  });
});

describe('stellify unpublish', () => {
  test('prints "unpublished <app-id>"', async () => {
    marketplace = await startFakeMarketplace();
    const home = await claimed(marketplace.url);
    const {code, out} = await run(['unpublish', 'star'], {env: {STELLIFY_HOME: home}});
    expect(code).toBe(0);
    expect(out).toBe('unpublished star\n');
  });

  test('a refusal', async () => {
    marketplace = await startFakeMarketplace({
      unpublish: () => ({
        status: 404,
        body: {ok: false, findings: ['app "star" is not published']},
      }),
    });
    const home = await claimed(marketplace.url);
    const {code, err} = await run(['unpublish', 'star'], {env: {STELLIFY_HOME: home}});
    expect(code).toBe(1);
    expect(err).toBe('refused star:\n  app "star" is not published\n');
  });
});

describe('the notices', () => {
  test('printed to stderr before the verb’s own output, for the publisher’s flagged apps alone', async () => {
    marketplace = await startFakeMarketplace({
      entries: [
        entryFor('moon', {
          publisher: 'acme',
          aheadOfStore: {
            catalogIds: ['https://example.com/moon/catalog.json'],
            version: '0.2.0',
            seenAt: '2026-10-10T01:00:00.000Z',
          },
        }),
        entryFor('other', {
          publisher: 'someone-else',
          aheadOfStore: {catalogIds: ['x'], seenAt: '2026-10-10T01:00:00.000Z'},
        }),
      ],
    });
    const home = await claimed(marketplace.url);
    const {code, out, err} = await run(['unpublish', 'moon'], {env: {STELLIFY_HOME: home}});
    expect(code).toBe(0);
    expect(err).toBe(
      'notice: moon is ahead of the Store: its card declares catalog https://example.com/moon/catalog.json the Store has no artifact for, and version 0.2.0 the Store does not know; publish it\n',
    );
    expect(out).toBe('unpublished moon\n');
    expect(marketplace.requests.map(r => r.path)).toEqual(['index.json', 'unpublish']);
  });
});

describe('stellify list', () => {
  test('one line per app of the publisher’s, the flag inline', async () => {
    marketplace = await startFakeMarketplace({
      entries: [
        entryFor('star', {
          publisher: 'acme',
          version: '0.2.0',
          versions: ['0.1.0', '0.2.0'],
          catalogs: {[STAR_CATALOG_ID]: `sha256-${'a'.repeat(43)}`},
          retired: ['https://example.com/old/catalog.json'],
        }),
        entryFor('moon', {
          publisher: 'acme',
          aheadOfStore: {
            catalogIds: ['https://example.com/moon/catalog.json'],
            seenAt: '2026-10-10T01:00:00.000Z',
          },
        }),
        entryFor('other', {publisher: 'someone-else'}),
      ],
    });
    const home = await claimed(marketplace.url);
    const {code, out, err} = await run(['list'], {env: {STELLIFY_HOME: home}});
    expect(code).toBe(0);
    expect(err).toBe('');
    expect(out).toBe(
      [
        `star  0.2.0  ${STAR_CATALOG_ID} at sha256-aaaaaaaa…  retired: https://example.com/old/catalog.json`,
        'moon  0.1.0  basic catalog  ahead of the Store: catalog https://example.com/moon/catalog.json the Store has no artifact for',
        '',
      ].join('\n'),
    );
  });

  test('nothing published', async () => {
    marketplace = await startFakeMarketplace();
    const home = await claimed(marketplace.url);
    const {code, out} = await run(['list'], {env: {STELLIFY_HOME: home}});
    expect(code).toBe(0);
    expect(out).toBe('nothing published by acme\n');
  });

  test('--json prints the apps', async () => {
    marketplace = await startFakeMarketplace({entries: [entryFor('star', {publisher: 'acme'})]});
    const home = await claimed(marketplace.url);
    const {code, out} = await run(['list', '--json'], {env: {STELLIFY_HOME: home}});
    expect(code).toBe(0);
    expect(JSON.parse(out).map((a: {appId: string}) => a.appId)).toEqual(['star']);
  });
});

describe('stellify preview', () => {
  test('writes preview.json in the working directory and says so; a card that needs no sign-in', async () => {
    agent = await startFakeAgent({version: '0.4.0'});
    const cwd = scratch('stellify-cwd-');
    const {code, out, err} = await run(['preview', 'star', agent.cardUrl, packed], {cwd});
    expect(err).toBe('');
    expect(code).toBe(0);
    const path = join(cwd, 'preview.json');
    expect(out).toBe(
      `preview of star at 0.4.0 — 1 surface painted, written to ${path}; the card requires no sign-in, so the marketplace captures this app’s preview itself at publish\n`,
    );
    const document = JSON.parse(readFileSync(path, 'utf8'));
    expect(document.capturedBy).toBe('publisher');
    expect(document.version).toBe('0.4.0');
    expect(document.messages).toHaveLength(2);
  });

  test('--out, relative to the working directory', async () => {
    agent = await startFakeAgent();
    const cwd = scratch('stellify-cwd-');
    const {code, out} = await run(
      ['preview', 'star', agent.cardUrl, packed, '--out', 'deeper/p.json'],
      {cwd},
    );
    expect(code).toBe(0);
    expect(out).toContain(join(cwd, 'deeper', 'p.json'));
    expect(existsSync(join(cwd, 'deeper', 'p.json'))).toBe(true);
  });

  test('STELLIFY_CREDENTIAL rides for a card that requires sign-in; the summary line', async () => {
    agent = await startFakeAgent({signIn: 'bearer'});
    const cwd = scratch('stellify-cwd-');
    const {code, out} = await run(['preview', 'star', agent.cardUrl, packed], {
      cwd,
      env: {STELLIFY_CREDENTIAL: 'tok'},
    });
    expect(code).toBe(0);
    expect(out).toBe(
      `preview of star at 0.1.0 — 1 surface painted, written to ${join(cwd, 'preview.json')}\n`,
    );
    expect(agent.requests[0]?.headers.authorization).toBe('Bearer tok');
  });

  test('findings one per line, exit 1, nothing written', async () => {
    agent = await startFakeAgent({signIn: 'oauth'});
    const cwd = scratch('stellify-cwd-');
    const {code, err} = await run(['preview', 'star', agent.cardUrl, packed], {cwd});
    expect(code).toBe(1);
    expect(err).toBe(
      'the card requires sign-in: set STELLIFY_CREDENTIAL to a credential of your own for this agent\n1 finding; nothing written\n',
    );
    expect(existsSync(join(cwd, 'preview.json'))).toBe(false);
  });

  test('a note is printed to stderr', async () => {
    agent = await startFakeAgent();
    const {code, err} = await run(['preview', 'star', agent.cardUrl, packed], {
      env: {STELLIFY_CREDENTIAL: 'tok'},
    });
    expect(code).toBe(0);
    expect(err).toBe(
      'note: the card requires no sign-in: the credential is not sent, and the marketplace captures this app’s preview itself at publish\n',
    );
  });

  test('with a publisher claimed, the marketplace is reached for the notices; unreachable, a note', async () => {
    agent = await startFakeAgent();
    const home = await claimed('http://127.0.0.1:1', 'acme', 'x'.repeat(43));
    const {code, err} = await run(['preview', 'star', agent.cardUrl, packed], {
      env: {STELLIFY_HOME: home},
    });
    expect(code).toBe(0);
    expect(err).toMatch(/^note: cannot reach the marketplace at http:\/\/127\.0\.0\.1:1: /);
  });

  test('--json prints the document', async () => {
    agent = await startFakeAgent();
    const {code, out} = await run(['preview', 'star', agent.cardUrl, packed, '--json']);
    expect(code).toBe(0);
    expect(JSON.parse(out).appId).toBe('star');
  });

  test('the timeouts come from the marketplace’s variables', async () => {
    const {hangingScript} = await import('./fakeAgent.js');
    agent = await startFakeAgent({script: hangingScript});
    const {code, err} = await run(['preview', 'star', agent.cardUrl, packed], {
      env: {A2UIVERSE_SMOKE_TIMEOUT_SECONDS: '0.3'},
    });
    expect(code).toBe(1);
    expect(err).toContain('the agent did not answer within 0.3 s');
    const bad = await run(['preview', 'star', agent.cardUrl, packed], {
      env: {A2UIVERSE_CARD_TIMEOUT_SECONDS: 'soon'},
    });
    expect(bad.code).toBe(2);
    expect(bad.err).toMatch(/A2UIVERSE_CARD_TIMEOUT_SECONDS/);
  });
});

describe('usage', () => {
  test('an unknown verb, a flag the verb does not take, too many arguments', async () => {
    expect((await run(['nope'])).code).toBe(2);
    expect((await run(['unpublish', 'star', '--replace'])).code).toBe(2);
    expect((await run(['unpublish', 'star', 'extra'])).code).toBe(2);
    expect((await run(['list', 'extra'])).code).toBe(2);
  });
});
