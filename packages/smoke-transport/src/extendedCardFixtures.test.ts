/**
 * The extended cards captured from real servers (task-20.8 decisions 10, 16): each read by the
 * card's one reading as the platform takes it, and what the task spec left to check by running —
 * the JSON form of a gRPC answer read as the JSON-RPC answer is, and the two servers' answers over
 * A2A 0.3 on HTTP+JSON.
 */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';
import {AgentCard} from '@a2a-js/sdk';
import {cardReadError, readCard} from '@a2uiverse/card';

const fixture = (name: string): object =>
  JSON.parse(readFileSync(join(import.meta.dirname, '..', 'test', 'fixtures', name), 'utf8'));

const SERVERS = ['javascript', 'python'] as const;
const PATHS = ['jsonrpc-1.0', 'jsonrpc-0.3', 'http-json-1.0', 'http-json-0.3', 'grpc-1.0'];

describe('an extended card from each server on each path', () => {
  for (const server of SERVERS) {
    for (const path of PATHS) {
      if (server === 'javascript' && path === 'http-json-0.3') continue;
      test(`${server}, ${path}: read as served, Alice's skill on it`, () => {
        const card = readCard(fixture(`extended-${server}-${path}.json`));
        expect(card.skills.map(({id}) => id)).toContain('lanterns');
        expect(card.capabilities?.extendedAgentCard).toBe(true);
      });
    }
    test(`${server}, gRPC at A2A 0.3: the A2A SDK's reading, in A2A 1.0's JSON`, () => {
      const card = readCard(fixture(`extended-${server}-grpc-0.3-read.json`));
      expect(card.skills.map(({id}) => id)).toContain('lanterns');
    });
    test(`${server}: the JSON form of the gRPC answer reads as the JSON-RPC answer does`, () => {
      const grpc = readCard(fixture(`extended-${server}-grpc-1.0.json`));
      const jsonRpc = readCard(fixture(`extended-${server}-jsonrpc-1.0.json`));
      expect(AgentCard.toJSON(grpc)).toEqual(AgentCard.toJSON(jsonRpc));
    });
  }
});

describe('over A2A 0.3 on HTTP+JSON the two servers disagree (finding 21)', () => {
  test("@a2a-js/sdk writes the JSON form of A2A 0.3's protobuf, which the reading does not take", () => {
    const served = fixture('extended-javascript-http-json-0.3.json') as {
      securitySchemes: Record<string, unknown>;
    };
    expect(Object.keys(served.securitySchemes.key as object)).toEqual(['apiKeySecurityScheme']);
    expect(cardReadError(served)).toBe('Unsupported v0.3 security scheme type: undefined');
  });

  test("a2a-sdk writes A2A 0.3's JSON-schema form, which it does", () => {
    const served = fixture('extended-python-http-json-0.3.json');
    const card = readCard(served);
    expect(card.securitySchemes.key?.scheme?.$case).toBe('apiKeySecurityScheme');
    expect(card.skills.map(({id}) => id)).toContain('lanterns');
  });
});

describe('a2a-sdk 0.3.26 (finding 22)', () => {
  test('serves the extended card on JSON-RPC and the public card on gRPC', () => {
    expect(
      readCard(fixture('extended-python-0.3.26-jsonrpc-0.3.json')).skills.map(s => s.id),
    ).toEqual(['shop', 'lanterns']);
    expect(
      readCard(fixture('extended-python-0.3.26-grpc-0.3-read.json')).skills.map(s => s.id),
    ).toEqual(['shop']);
  });
});
