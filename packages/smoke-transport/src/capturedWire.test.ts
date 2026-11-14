/**
 * The smoke request's transport over wires captured from a scratch agent on Python's `a2a-sdk`
 * 1.3.0 (task-20.4 decision 15; task-20.5 decision 15): what it answers on A2A 1.0 and through its
 * 0.3 layer, over JSON-RPC and HTTP+JSON, read by the A2A SDK's client and the platform sdk's one
 * reading, and what the A2A SDK wrote to it.
 */
import {describe, expect, test} from 'vitest';
import {readCard, spokenInterfaces} from '@a2uiverse/card';
import {a2uiMessagesIn, readAuthRequired} from '@a2uiverse/sdk';
import {a2aSmokeRunner} from './smokeRunner.js';
import {capturedFetch, capturedWire, type CapturedWire} from './testing/capturedWire.js';

const CATALOG = 'https://example.com/catalogs/fake/v1/catalog.json';
const CREATE = {version: 'v0.9', createSurface: {surfaceId: 's1', catalogId: CATALOG}};
const UPDATE = {
  version: 'v0.9',
  updateComponents: {surfaceId: 's1', components: [{id: 'root', component: 'Text', text: 'hi'}]},
};
const ASKED_WRITE = {securityRequirements: [{schemes: {signIn: {list: ['things.write']}}}]};

/**
 * The smoke runner's answer to the request of `wire`, the agent's answer replayed as captured: no
 * connection is opened, the replay standing in for the agent, and the request goes to the card's
 * first interface, which is the one captured.
 */
async function smoke(wire: CapturedWire): Promise<Record<string, unknown>> {
  const card = readCard(wire.card);
  const seen = await a2aSmokeRunner({
    fetchImpl: capturedFetch(wire),
    openConnection: () => Promise.resolve(true),
  })({card, entitlement: [CATALOG], words: wire.asked, timeoutMs: 5000});
  if (!('taken' in seen)) return seen;
  const {taken, notReached, ...observed} = seen;
  expect(taken).toEqual(spokenInterfaces(card)[0]);
  expect(notReached).toEqual([]);
  return observed;
}

/** The `data:` lines of a captured answer, each as the JSON it carries. */
const eventsOf = (wire: CapturedWire): Array<{result: Record<string, unknown>}> =>
  wire.response.body
    .split('\n')
    .filter(line => line.startsWith('data:'))
    .map(line => JSON.parse(line.slice('data:'.length)));

describe.each(['1.0', '0.3'])("an agent on Python's a2a-sdk 1.3.0, reached at A2A %s", version => {
  const wire = (asked: string) => capturedWire(`python-${version}-${asked}.json`);

  test('the wire is the one captured: the interface the platform takes, and the headers of its A2A version', () => {
    const one = wire('one');
    expect(one.binding).toBe('JSONRPC');
    expect(one.a2aVersion).toBe(version);
    expect(spokenInterfaces(readCard(one.card))[0]!.protocolVersion).toBe(version);
    expect(one.request.headers['a2a-version']).toBe(version);
    // The A2A SDK spells the extensions header for each A2A version (decision 7).
    const header = version === '1.0' ? 'a2a-extensions' : 'x-a2a-extensions';
    const other = version === '1.0' ? 'x-a2a-extensions' : 'a2a-extensions';
    expect(one.request.headers[header]).toContain('https://a2ui.org/a2a-extension/a2ui/v0.9.1');
    expect(one.request.headers[other]).toBeUndefined();
  });

  test.each([
    ['one', 'one message per part, marked in metadata.mimeType'],
    ['list', 'a list in one part, marked in metadata.mimeType'],
    ['media-type', 'one message per part, marked in media_type alone'],
  ])('%s: %s, is read', async asked => {
    const seen = await smoke(wire(asked));
    expect(seen).toEqual({kind: 'ended', state: 'completed', messages: [CREATE, UPDATE]});
  });

  test('a list rides the A2A 1.0 wire bare and the 0.3 wire wrapped by the 0.3 layer, and reaches the reading as a bare list', () => {
    const update = eventsOf(wire('list')).at(-1)!.result;
    const status = (version === '1.0' ? update.statusUpdate : update) as {
      status: {message: {parts: Array<{data: unknown; metadata: Record<string, unknown>}>}};
    };
    const [part] = status.status.message.parts;
    if (version === '1.0') {
      expect(a2uiMessagesIn(part!.data)).toEqual([CREATE, UPDATE]);
      expect(part!.metadata).toEqual({mimeType: 'application/a2ui+json'});
    } else {
      expect(part!.data).toEqual({value: [CREATE, UPDATE]});
      expect(part!.metadata).toEqual({mimeType: 'application/a2ui+json', data_part_compat: true});
    }
  });

  test("a part's media_type rides the A2A 1.0 wire alone", () => {
    const update = eventsOf(wire('media-type')).at(-1)!.result;
    const status = (version === '1.0' ? update.statusUpdate : update) as {
      status: {message: {parts: Array<Record<string, unknown>>}};
    };
    for (const part of status.status.message.parts) {
      expect(part.mediaType).toBe(version === '1.0' ? 'application/a2ui+json' : undefined);
      expect(part.metadata).toBeUndefined();
    }
  });

  test('A2UI in an artifact is not read', async () => {
    const captured = wire('artifact');
    expect(captured.response.body).toContain('createSurface');
    expect(await smoke(captured)).toEqual({kind: 'ended', state: 'completed', messages: []});
  });

  test.each([
    ['auth-1.0', "A2A 1.0's requirement shape"],
    ['auth-0.3', "A2A 0.3's requirement shape"],
  ])('%s: an auth-required request in %s is read to the one shape', async asked => {
    const captured = wire(asked);
    // Its executor returned, and the server closed the stream at the state.
    expect(captured.response.closedByAgent).toBe(true);
    const seen = await smoke(captured);
    expect(seen.kind).toBe('ended');
    if (seen.kind !== 'ended') return;
    expect(seen.state).toBe('auth-required');
    expect(readAuthRequired(seen.data)).toEqual(ASKED_WRITE);
    expect(seen.text).toBe('Please sign in.');
  });

  test('an agent whose executor waits holds its stream open at auth-required: the answer has ended at the state', async () => {
    const captured = wire('auth-held');
    expect(captured.response.closedByAgent).toBe(false);
    const started = Date.now();
    const seen = await smoke(captured);
    expect(Date.now() - started).toBeLessThan(3000);
    expect(seen.kind).toBe('ended');
    if (seen.kind !== 'ended') return;
    expect(seen.state).toBe('auth-required');
    expect(readAuthRequired(seen.data)).toEqual(ASKED_WRITE);
  });

  test('a press as the A2A SDK wrote it and as the agent held it: mediaType on the A2A 1.0 wire alone', () => {
    const captured = wire('echo');
    const sent = (
      captured.request.body.params as {message: {parts: Array<Record<string, unknown>>}}
    ).message.parts[1]!;
    const text = eventsOf(captured).at(-1)!.result;
    const status = (version === '1.0' ? text.statusUpdate : text) as {
      status: {message: {parts: Array<{text: string}>}};
    };
    const held = (JSON.parse(status.status.message.parts[0]!.text) as unknown[])[1];
    const action = {
      version: 'v0.9',
      action: {
        name: 'open',
        surfaceId: 's1',
        sourceComponentId: 'root',
        timestamp: '2026-11-13T00:00:00.000Z',
        context: {},
      },
    };
    const metadata = {mimeType: 'application/a2ui+json'};
    if (version === '1.0') {
      expect(sent).toEqual({data: action, metadata, mediaType: 'application/a2ui+json'});
      expect(held).toEqual({data: action, metadata, mediaType: 'application/a2ui+json'});
    } else {
      expect(sent).toEqual({kind: 'data', data: action, metadata});
      expect(held).toEqual({data: action, metadata});
    }
  });
});

/** The `data:` lines of a captured HTTP+JSON answer, each the stream response it carries. */
const restEventsOf = (wire: CapturedWire): Array<Record<string, unknown>> =>
  wire.response.body
    .split('\n')
    .filter(line => line.startsWith('data:'))
    .map(line => JSON.parse(line.slice('data:'.length)));

/** The parts of the status message the last event of a captured HTTP+JSON answer carries. */
function lastStatusParts(wire: CapturedWire): Array<Record<string, unknown>> {
  const update = restEventsOf(wire).at(-1)!.statusUpdate as {
    status: {message: Record<string, Array<Record<string, unknown>>>};
  };
  const message = update.status.message;
  // A2A 1.0 names a message's parts `parts`; A2A 0.3's proto names them `content`.
  return message.parts ?? message.content ?? [];
}

describe.each(['1.0', '0.3'])(
  "an agent on Python's a2a-sdk 1.3.0, reached over HTTP+JSON at A2A %s (task-20.5 decision 15)",
  version => {
    const wire = (asked: string) => capturedWire(`python-http+json-${version}-${asked}.json`);

    test('the wire is the one captured: HTTP+JSON at the path of its A2A version, and its headers', () => {
      const one = wire('one');
      expect(one.binding).toBe('HTTP+JSON');
      expect(one.a2aVersion).toBe(version);
      expect(spokenInterfaces(readCard(one.card))[0]).toMatchObject({
        protocolBinding: 'HTTP+JSON',
        protocolVersion: version,
      });
      expect(new URL(one.request.url).pathname).toBe(
        version === '1.0' ? '/rest/message:stream' : '/rest/v1/message:stream',
      );
      expect(one.request.headers['a2a-version']).toBe(version);
      const header = version === '1.0' ? 'a2a-extensions' : 'x-a2a-extensions';
      expect(one.request.headers[header]).toContain('https://a2ui.org/a2a-extension/a2ui/v0.9.1');
    });

    test.each([['one'], ['media-type']])('%s: one message per part is read', async asked => {
      const seen = await smoke(wire(asked));
      expect(seen).toEqual({kind: 'ended', state: 'completed', messages: [CREATE, UPDATE]});
    });

    test('A2UI in an artifact is not read', async () => {
      const captured = wire('artifact');
      expect(captured.response.body).toContain('createSurface');
      expect(await smoke(captured)).toEqual({kind: 'ended', state: 'completed', messages: []});
    });

    test.each([['auth-1.0'], ['auth-0.3'], ['auth-held']])(
      '%s: the auth-required request is read to the one shape, the answer ended at the state',
      async asked => {
        const captured = wire(asked);
        expect(captured.response.closedByAgent).toBe(asked !== 'auth-held');
        const started = Date.now();
        const seen = await smoke(captured);
        expect(Date.now() - started).toBeLessThan(3000);
        expect(seen.kind).toBe('ended');
        if (seen.kind !== 'ended') return;
        expect(seen.state).toBe('auth-required');
        expect(readAuthRequired(seen.data)).toEqual(ASKED_WRITE);
        expect(seen.text).toBe('Please sign in.');
      },
    );

    test('a part’s marks ride the A2A 1.0 wire, and are dropped toward A2A 0.3 both ways (task-20.5 decision 13)', () => {
      const captured = wire('echo');
      const sentMessage = captured.request.body.message as Record<
        string,
        Array<Record<string, unknown>>
      >;
      const sent = (sentMessage.parts ?? sentMessage.content)![1]!;
      const held = (
        JSON.parse(lastStatusParts(captured)[0]!.text as string) as Array<Record<string, unknown>>
      )[1]!;
      if (version === '1.0') {
        expect(sent.metadata).toEqual({mimeType: 'application/a2ui+json'});
        expect(sent.mediaType).toBe('application/a2ui+json');
        expect(held.metadata).toEqual({mimeType: 'application/a2ui+json'});
      } else {
        // The A2A SDK writes the 0.3 wire with A2A 0.3.0's codec, whose part holds no metadata.
        expect(sent).toEqual({data: {data: expect.objectContaining({version: 'v0.9'})}});
        expect(sent.metadata).toBeUndefined();
        expect(held.metadata).toBeUndefined();
      }
    });

    test('a list in one part: bare on the A2A 1.0 wire; wrapped on the 0.3 wire, its flag in the metadata the A2A SDK drops, and read still wrapped (task-20.5 decision 13)', async () => {
      const captured = wire('list');
      const [part] = lastStatusParts(captured);
      if (version === '1.0') {
        expect(part!.metadata).toEqual({mimeType: 'application/a2ui+json'});
      } else {
        expect(part).toEqual({
          data: {data: {value: [CREATE, UPDATE]}},
          metadata: {data_part_compat: true, mimeType: 'application/a2ui+json'},
        });
      }
      expect(await smoke(captured)).toEqual({
        kind: 'ended',
        state: 'completed',
        messages: [CREATE, UPDATE],
      });
    });
  },
);
