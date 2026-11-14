/** Where an interface is, and when TLS is used (task-20.5 decision 10). */
import {describe, expect, test} from 'vitest';
import type {AgentInterface} from '@a2a-js/sdk';
import {addressOf} from './address.js';

const at = (protocolBinding: string, url: string): AgentInterface => ({
  url,
  protocolBinding,
  protocolVersion: '1.0',
  tenant: '',
});

describe('addressOf, gRPC', () => {
  test.each([
    [
      'a bare host:port off the local machine, with TLS',
      'grpc.shop-b.example:443',
      'grpc.shop-b.example',
      443,
      true,
      'grpc.shop-b.example:443',
    ],
    [
      'a bare host:port on localhost, without TLS',
      'localhost:50051',
      'localhost',
      50051,
      false,
      'localhost:50051',
    ],
    [
      'a bare host:port on 127.0.0.1, without TLS',
      '127.0.0.1:50051',
      '127.0.0.1',
      50051,
      false,
      '127.0.0.1:50051',
    ],
    ['a bare host:port on ::1, without TLS', '[::1]:50051', '::1', 50051, false, '[::1]:50051'],
    [
      'a bare host, on 443 with TLS',
      'grpc.shop-b.example',
      'grpc.shop-b.example',
      443,
      true,
      'grpc.shop-b.example:443',
    ],
    [
      'https://, with TLS, its path left out',
      'https://georoute-agent.example.com/a2a/grpc',
      'georoute-agent.example.com',
      443,
      true,
      'georoute-agent.example.com:443',
    ],
    [
      'http://, without TLS',
      'http://agent.example:8080/a2a',
      'agent.example',
      8080,
      false,
      'agent.example:8080',
    ],
    [
      'http:// on localhost, without TLS',
      'http://localhost:50051',
      'localhost',
      50051,
      false,
      'localhost:50051',
    ],
    [
      'https:// on localhost, with TLS',
      'https://localhost:50051',
      'localhost',
      50051,
      true,
      'localhost:50051',
    ],
  ])('%s', (_name, url, host, port, tls, dialUrl) => {
    expect(addressOf(at('GRPC', url))).toEqual({host, port, tls, dialUrl});
  });

  test('a binding is matched whatever its case', () => {
    expect(addressOf(at('grpc', 'localhost:50051'))?.dialUrl).toBe('localhost:50051');
  });

  test.each([
    ['grpcs://agent.example:443'],
    ['dns:///agent.example:443'],
    ['agent.example:443/a2a'],
    [''],
  ])('%j is no address', url => {
    expect(addressOf(at('GRPC', url))).toBeUndefined();
  });
});

describe('addressOf, JSON-RPC and HTTP+JSON', () => {
  test.each([
    ['JSONRPC', 'https://shop-b.example/', 'shop-b.example', 443, true],
    ['JSONRPC', 'http://127.0.0.1:12001/a2a', '127.0.0.1', 12001, false],
    ['HTTP+JSON', 'http://localhost/rest', 'localhost', 80, false],
    ['HTTP+JSON', 'https://[::1]:8443/rest', '::1', 8443, true],
  ])('%s at %s: its URL handed on as it is', (binding, url, host, port, tls) => {
    expect(addressOf(at(binding, url))).toEqual({host, port, tls, dialUrl: url});
  });

  test.each([['agent.example:443'], ['ftp://agent.example/']])('%j is no address', url => {
    expect(addressOf(at('JSONRPC', url))).toBeUndefined();
  });
});
