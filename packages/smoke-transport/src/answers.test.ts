/** What an interface's answer says before the request is taken in (task-20.5 decisions 3, 8). */
import {describe, expect, test} from 'vitest';
import {fromJsonRpcErrorResponse, VersionNotSupportedError} from '@a2a-js/sdk/errors';
import {GRPC_STATUS_CODE, fromGrpcError} from '@a2a-js/sdk/errors/grpc';
import {answeringFetch, NotServedError, readAnswerError, UnauthorizedError} from './answers.js';

const answer = (status: number, body: string, type = 'application/json') =>
  answeringFetch(() =>
    Promise.resolve(new Response(body, {status, headers: {'content-type': type}})),
  );

describe('answeringFetch', () => {
  test('HTTP 401 is a refusal for sign-in', async () => {
    await expect(answer(401, '{}')('http://x/')).rejects.toBeInstanceOf(UnauthorizedError);
  });

  test.each([[404], [405]])('HTTP %i carrying no A2A error: not there', async status => {
    await expect(
      answer(status, '<html>no</html>', 'text/html')('http://x/'),
    ).rejects.toBeInstanceOf(NotServedError);
    await expect(answer(status, '')('http://x/')).rejects.toBeInstanceOf(NotServedError);
  });

  test.each([
    ['a JSON-RPC error', {jsonrpc: '2.0', id: 1, error: {code: -32001, message: 'Task not found'}}],
    [
      'an A2A 1.0 HTTP+JSON error',
      {error: {code: 404, status: 'NOT_FOUND', message: 'Task not found'}},
    ],
    ['an A2A 0.3 HTTP+JSON error', {code: -32001, message: 'Task not found'}],
  ])('HTTP 404 carrying %s is the answer, its body intact', async (_name, body) => {
    const response = await answer(404, JSON.stringify(body))('http://x/');
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual(body);
  });

  test.each([[403], [500], [502], [503]])('HTTP %i is the answer', async status => {
    expect((await answer(status, '')('http://x/')).status).toBe(status);
  });
});

describe('readAnswerError', () => {
  const grpcError = (code: number) =>
    fromGrpcError({code, details: 'x', metadata: undefined} as never);

  test('a version not supported is not there, on every binding', () => {
    expect(readAnswerError(new VersionNotSupportedError({message: 'no 0.3'}))).toBeInstanceOf(
      NotServedError,
    );
  });

  test.each([
    [-32601, true],
    [-32600, false],
    [-32602, false],
    [-32001, false],
  ])('the JSON-RPC error %i is not there: %s', (code, notThere) => {
    const err = fromJsonRpcErrorResponse({jsonrpc: '2.0', id: 1, error: {code, message: 'x'}});
    expect(readAnswerError(err) instanceof NotServedError).toBe(notThere);
  });

  test('gRPC UNIMPLEMENTED is not there, UNAUTHENTICATED a refusal for sign-in', () => {
    expect(readAnswerError(grpcError(GRPC_STATUS_CODE.UNIMPLEMENTED))).toBeInstanceOf(
      NotServedError,
    );
    expect(readAnswerError(grpcError(GRPC_STATUS_CODE.UNAUTHENTICATED))).toBeInstanceOf(
      UnauthorizedError,
    );
  });

  test.each([
    ['PERMISSION_DENIED', GRPC_STATUS_CODE.PERMISSION_DENIED],
    ['UNAVAILABLE', GRPC_STATUS_CODE.UNAVAILABLE],
  ])('gRPC %s is an ordinary failure', (_name, code) => {
    const err = grpcError(code);
    expect(readAnswerError(err)).toBe(err);
  });
});
