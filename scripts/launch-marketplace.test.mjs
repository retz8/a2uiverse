import assert from 'node:assert/strict';
import {mkdtempSync, statSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';

import {
  DEV_PUBLISHER,
  establishPublisher,
  noticesLeft,
  previewWords,
  publisherFileOf,
  publisherLine,
  publisherState,
  readPublisherFile,
  writePublisherFile,
} from './launch-marketplace.mjs';

const MARKETPLACE = 'http://localhost:10002';
const PATH = '/scripts/.state/stellify/publisher.json';
const HELD = {marketplace: MARKETPLACE, publisher: DEV_PUBLISHER, token: 'old-token'};

/**
 * A scripted marketplace for `establishPublisher`: the claim and the token check answer as given,
 * every call recorded; the file read and written in memory.
 */
function scripted({file = {none: true}, claim = {ok: true}, probe = {status: 404}} = {}) {
  const calls = [];
  let written = null;
  const api = {
    async claim({marketplace, name}) {
      calls.push(['claim', name]);
      if (claim.ok) return {ok: true, marketplace, publisher: name, token: 'new-token'};
      return {ok: false, status: claim.status, findings: claim.findings ?? ['refused']};
    },
    async unpublish({token, appId}) {
      calls.push(['unpublish', appId, token]);
      return {
        ok: false,
        ...(probe.status === undefined ? {} : {status: probe.status}),
        findings: ['no'],
      };
    },
  };
  return {
    calls,
    written: () => written,
    run: () =>
      establishPublisher({
        marketplace: MARKETPLACE,
        path: PATH,
        api,
        read: async () => file,
        write: async (_path, record) => {
          written = record;
        },
      }),
  };
}

test('the publisher file sits beside the launcher, under its own gitignored .state (task-13.6 decision 4)', () => {
  assert.equal(publisherFileOf('/repo/scripts'), '/repo/scripts/.state/stellify/publisher.json');
});

test('the file against the marketplace resolved: none, held, or a stop with its words', () => {
  assert.deepEqual(publisherState({none: true}, MARKETPLACE, PATH), {state: 'none'});
  assert.deepEqual(publisherState({record: HELD}, `${MARKETPLACE}/`, PATH), {
    state: 'held',
    record: HELD,
  });
  const elsewhere = publisherState(
    {record: {...HELD, marketplace: 'http://localhost:9999'}},
    MARKETPLACE,
    PATH,
  );
  assert.equal(elsewhere.state, 'elsewhere');
  assert.match(elsewhere.words, /for http:\/\/localhost:9999, not http:\/\/localhost:10002/);
  assert.match(elsewhere.words, /move or delete it/);
  const another = publisherState({record: {...HELD, publisher: 'acme'}}, MARKETPLACE, PATH);
  assert.equal(another.state, 'another');
  assert.match(another.words, /holds publisher acme, not a2uiverse-apps/);
  assert.equal(publisherState({damaged: 'x is not JSON'}, MARKETPLACE, PATH).state, 'damaged');
});

test('no file: the name is claimed and the file written (task-13.6 decision 5)', async () => {
  const run = scripted();
  const established = await run.run();
  assert.deepEqual(established, {
    ok: true,
    record: {marketplace: MARKETPLACE, publisher: DEV_PUBLISHER, token: 'new-token'},
    claimed: true,
  });
  assert.deepEqual(run.calls, [['claim', DEV_PUBLISHER]]);
  assert.deepEqual(run.written(), established.record);
});

test('no file and the name taken: the marketplace path stops, naming the state to wipe', async () => {
  const run = scripted({claim: {ok: false, status: 409}});
  const established = await run.run();
  assert.equal(established.ok, false);
  assert.match(established.words, /no longer has/);
  assert.match(established.words, /apps\/marketplace\/\.state/);
  assert.equal(run.written(), null);
});

test('a held token the marketplace knows: kept, the check changing nothing', async () => {
  const run = scripted({file: {record: HELD}, probe: {status: 404}});
  assert.deepEqual(await run.run(), {ok: true, record: HELD, claimed: false});
  assert.deepEqual(run.calls, [['unpublish', 'shell', 'old-token']]);
  assert.equal(run.written(), null);
});

test('a held token the marketplace disowned: the name claimed again, the file rewritten', async () => {
  const run = scripted({file: {record: HELD}, probe: {status: 401}});
  const established = await run.run();
  assert.equal(established.claimed, 'again');
  assert.equal(established.record.token, 'new-token');
  assert.deepEqual(run.calls, [
    ['unpublish', 'shell', 'old-token'],
    ['claim', DEV_PUBLISHER],
  ]);
  assert.equal(run.written().token, 'new-token');
});

test('a disowned token whose name is taken again: the path stops, the file untouched', async () => {
  const run = scripted({
    file: {record: HELD},
    probe: {status: 401},
    claim: {ok: false, status: 409},
  });
  const established = await run.run();
  assert.equal(established.ok, false);
  assert.match(established.words, /no longer has/);
  assert.equal(run.written(), null);
});

test('a file for another marketplace or publisher, or damaged, stops with no contact', async () => {
  for (const file of [
    {record: {...HELD, marketplace: 'http://localhost:9999'}},
    {record: {...HELD, publisher: 'acme'}},
    {damaged: `${PATH} is not JSON`},
  ]) {
    const run = scripted({file});
    const established = await run.run();
    assert.equal(established.ok, false);
    assert.deepEqual(run.calls, []);
    assert.equal(run.written(), null);
  }
});

test('a marketplace that cannot be asked about the token stops the path', async () => {
  const run = scripted({file: {record: HELD}, probe: {status: undefined}});
  const established = await run.run();
  assert.equal(established.ok, false);
  assert.match(established.words, /could not be asked/);
});

test('another refusal of the claim stops the path with the marketplace’s words', async () => {
  const run = scripted({claim: {ok: false, status: 422, findings: ['the name is not allowed']}});
  const established = await run.run();
  assert.equal(established.ok, false);
  assert.match(established.words, /the name is not allowed/);
});

test('the file is written owner-only in Stellify’s shape, and read back', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'a2uiverse-publisher-'));
  const path = join(dir, 'stellify', 'publisher.json');
  assert.deepEqual(await readPublisherFile(path), {none: true});
  await writePublisherFile(path, HELD);
  assert.equal(statSync(path).mode & 0o777, 0o600);
  assert.deepEqual(await readPublisherFile(path), {record: HELD});
  writeFileSync(path, '{"marketplace": "x"}');
  assert.match((await readPublisherFile(path)).damaged, /no publisher/);
  writeFileSync(path, 'not json');
  assert.match((await readPublisherFile(path)).damaged, /is not JSON/);
});

test('the notices kept are the apps this launch did not publish (task-13.6 decision 11)', () => {
  const notices = [
    {appId: 'github', catalogIds: ['x'], seenAt: 't'},
    {appId: 'linear', catalogIds: [], version: '2.0.0', seenAt: 't'},
  ];
  assert.deepEqual(noticesLeft(notices, ['github', 'gmail']), [notices[1]]);
  assert.deepEqual(noticesLeft(notices, []), notices);
});

test('the listing names the publisher file as it stands, and what each preview signs in with (task-13.6 decision 13)', () => {
  assert.match(publisherLine({state: 'none'}, PATH), /not claimed yet: the launch claims it/);
  assert.match(publisherLine({state: 'held', record: HELD}, PATH), /held for this marketplace/);
  assert.match(
    publisherLine({state: 'elsewhere', words: 'it names another'}, PATH),
    /would not publish: it names another/,
  );
  assert.equal(previewWords({previewAs: 'retz8'}), 'previews as retz8');
  assert.equal(previewWords({previewKey: 'k'}), 'previews with its demo key');
  assert.equal(previewWords({}), '');
});
