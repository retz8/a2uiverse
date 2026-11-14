/** The credential on each binding (task-20.5 decision 9). */
import {describe, expect, test} from 'vitest';
import type {AgentInterface} from '@a2a-js/sdk';
import {credentialOn} from './credentialOnBinding.js';

const on = (protocolBinding: string): AgentInterface => ({
  url: 'localhost:1',
  protocolBinding,
  protocolVersion: '1.0',
  tenant: '',
});

describe('credentialOn', () => {
  test.each(['JSONRPC', 'HTTP+JSON'])('%s: the header as its scheme names it', binding => {
    expect(credentialOn(on(binding), {Authorization: 'Bearer t', 'X-Api~Key': 'k'})).toEqual({
      kind: 'rides',
      serviceParameters: {Authorization: 'Bearer t', 'X-Api~Key': 'k'},
    });
  });

  test('gRPC: one plain metadata entry under the header’s name in lowercase', () => {
    expect(credentialOn(on('GRPC'), {Authorization: 'Bearer t'})).toEqual({
      kind: 'rides',
      serviceParameters: {authorization: 'Bearer t'},
    });
    expect(credentialOn(on('GRPC'), {'X-Api_Key.v2': 'k'})).toEqual({
      kind: 'rides',
      serviceParameters: {'x-api_key.v2': 'k'},
    });
  });

  test.each([
    ['X-Api~Key'],
    ['X-Api+Key'],
    ['grpc-key'],
    ['Grpc-Timeout'],
    ['key-bin'],
    ['KEY-BIN'],
  ])('gRPC: %s is not a name gRPC can carry', header => {
    expect(credentialOn(on('grpc'), {[header]: 'k'})).toEqual({kind: 'cannot', header});
  });

  test('no credential rides as none on every binding', () => {
    for (const binding of ['JSONRPC', 'HTTP+JSON', 'GRPC']) {
      expect(credentialOn(on(binding))).toEqual({kind: 'rides', serviceParameters: {}});
    }
  });
});
