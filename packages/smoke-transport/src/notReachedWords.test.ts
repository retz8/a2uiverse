/** What a publisher reads of the interfaces a walk did not reach (task-20.5 decision 7). */
import {describe, expect, test} from 'vitest';
import type {AgentInterface} from '@a2a-js/sdk';
import {noneReachedFinding, passedOverNote} from './notReachedWords.js';

const GRPC: AgentInterface = {
  url: 'grpc.shop-b.example:443',
  protocolBinding: 'GRPC',
  protocolVersion: '1.0',
  tenant: '',
};
const JSONRPC: AgentInterface = {
  url: 'https://shop-b.example/',
  protocolBinding: 'JSONRPC',
  protocolVersion: '0.3',
  tenant: '',
};

describe('passedOverNote', () => {
  test('no connection could be opened', () => {
    expect(passedOverNote({interface: GRPC, why: 'connection'}, JSONRPC)).toBe(
      'GRPC at A2A 1.0 (grpc.shop-b.example:443) was not reached: no connection could be opened; the request went to JSONRPC at A2A 0.3',
    );
  });

  test('what answered there does not serve it', () => {
    expect(passedOverNote({interface: GRPC, why: 'unserved'}, JSONRPC)).toBe(
      'GRPC at A2A 1.0 (grpc.shop-b.example:443) was not reached: what answered there does not serve it; the request went to JSONRPC at A2A 0.3',
    );
  });

  test('the credential’s header gRPC cannot carry', () => {
    expect(passedOverNote({interface: GRPC, why: 'credential', header: 'X-Api~Key'}, JSONRPC)).toBe(
      'GRPC at A2A 1.0 (grpc.shop-b.example:443) was passed over: the credential\'s header "X-Api~Key" is not a name gRPC can carry; the request went to JSONRPC at A2A 0.3',
    );
  });

  test('the binding and the A2A version as the card spells them', () => {
    const spelled = {...JSONRPC, protocolBinding: 'jsonrpc', protocolVersion: '0.3.0'};
    expect(passedOverNote({interface: GRPC, why: 'connection'}, spelled)).toMatch(
      /the request went to jsonrpc at A2A 0\.3\.0$/,
    );
  });
});

describe('noneReachedFinding', () => {
  test('each interface tried, with its URL and why', () => {
    expect(
      noneReachedFinding([
        {interface: GRPC, why: 'connection'},
        {interface: JSONRPC, why: 'unserved'},
      ]),
    ).toBe(
      'no interface the card lists was reached: GRPC at A2A 1.0 (grpc.shop-b.example:443): no connection could be opened; JSONRPC at A2A 0.3 (https://shop-b.example/): what answered there does not serve it',
    );
  });
});
