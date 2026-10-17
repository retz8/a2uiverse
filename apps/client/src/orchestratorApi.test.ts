import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
  checkUpdates,
  readAccounts,
  readInstalled,
  readPublisher,
  readStoreIndex,
  READ_TIMEOUT_MS,
} from './orchestratorApi';

const BASE = 'https://orchestrator.test';

/** A fetch that never answers until its signal aborts — a request the tunnel leaves hanging. */
const silent = (_url: unknown, init?: RequestInit) =>
  new Promise<Response>((_, reject) => {
    init?.signal?.addEventListener('abort', () =>
      reject(new DOMException('aborted', 'AbortError')),
    );
  });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json'}});

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the page’s reads are bounded (task-14.11 decision 26)', () => {
  it('asks once more when the first ask gets no answer in time, and takes the second answer', async () => {
    const states = [{appId: 'gmail', installedVersion: '0.1.0', state: 'up-to-date'}];
    const fetch = vi
      .fn()
      .mockImplementationOnce(silent)
      .mockImplementationOnce(async () => json(states));
    vi.stubGlobal('fetch', fetch);
    const read = checkUpdates(BASE);
    await vi.advanceTimersByTimeAsync(READ_TIMEOUT_MS);
    expect(await read).toEqual(states);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('counts two silences as the orchestrator unreached', async () => {
    const fetch = vi.fn(silent);
    vi.stubGlobal('fetch', fetch);
    const installed = readInstalled(BASE);
    const accounts = readAccounts(BASE);
    const publisher = readPublisher(BASE);
    const index = readStoreIndex(BASE);
    await vi.advanceTimersByTimeAsync(2 * READ_TIMEOUT_MS);
    expect(await installed).toBeNull();
    expect(await accounts).toBeNull();
    expect(await publisher).toBeNull();
    expect(await index).toEqual({ok: false, reason: 'unreached'});
    expect(fetch).toHaveBeenCalledTimes(8);
  });

  it('never asks again once an answer arrived, even one that refuses', async () => {
    const fetch = vi.fn(async () => json({ok: false, reason: 'not-published'}, 404));
    vi.stubGlobal('fetch', fetch);
    expect(await readStoreIndex(BASE)).toEqual({ok: false, reason: 'not-published'});
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
