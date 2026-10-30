/**
 * Gemini's explicit cache for a seam's fixed prompt (task-17.6 decisions 3, 4 and 12): the request's
 * system instruction and tools held in a cache Gemini keeps, each request naming the cache in their
 * place. It wraps the provider's fetch, so the cache holds exactly the JSON the provider would have
 * sent. The first request that carries a fixed prompt goes whole and creates its cache beside it,
 * never waiting for it; each use pushes the cache's expiry an hour out, unawaited too. An expired
 * cache, or any cache call that fails, sends that request whole, and a new cache is created.
 */
import {createHash} from 'node:crypto';
import {logLine} from '../log.js';
import type {Seam} from './getModel.js';

type Fetch = typeof globalThis.fetch;

/** How long a cache lives from its creation or its last use: an hour (task-17.6 decision 4). */
export const GEMINI_CACHE_TTL_SECONDS = 3600;

/** A cache this close to its expiry is not named, so a request never races it out (ours). */
const EXPIRY_MARGIN_MS = 60_000;

/** The fields a cache holds and a request naming it leaves out (Gemini's `cachedContents`). */
const FIXED = ['systemInstruction', 'tools', 'toolConfig'] as const;

/** A model call: the API root, then the model, then the method. */
const GENERATE = /^(.*)\/models\/([^/:]+):(generateContent|streamGenerateContent)\b/;

/** A request naming a cache that is refused is a client error: the cache gone, or the request at odds with it. */
const REFUSED = new Set([400, 403, 404]);

interface Held {
  name: string;
  expiresAt: number;
}

export interface GeminiCacheOptions {
  seam: Seam;
  /** The fetch underneath; the global one when omitted. */
  fetch?: Fetch;
  now?: () => number;
}

/** The provider's fetch, with the seam's fixed prompt held in Gemini's explicit cache. */
export function geminiCacheFetch(options: GeminiCacheOptions): Fetch {
  const send = options.fetch ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  const held = new Map<string, Held>();
  const creating = new Set<string>();

  const cacheCall = async (url: string, method: string, headers: Headers, body: unknown) => {
    const response = await send(url, {method, headers, body: JSON.stringify(body)});
    if (!response.ok) {
      const said = (await response.text()).slice(0, 200).replace(/\s+/g, ' ');
      throw new Error(`${response.status} ${said}`);
    }
    return (await response.json()) as {name?: string; expireTime?: string};
  };
  const expiry = (expireTime: string | undefined) => {
    const at = expireTime !== undefined ? Date.parse(expireTime) : NaN;
    return Number.isFinite(at) ? at : now() + GEMINI_CACHE_TTL_SECONDS * 1000;
  };

  const create = (key: string, root: string, model: string, headers: Headers, fixed: object) => {
    creating.add(key);
    void cacheCall(`${root}/cachedContents`, 'POST', headers, {
      model: `models/${model}`,
      ...fixed,
      ttl: `${GEMINI_CACHE_TTL_SECONDS}s`,
    })
      .then(made => {
        if (made.name === undefined) throw new Error('no cache name returned');
        held.set(key, {name: made.name, expiresAt: expiry(made.expireTime)});
      })
      .catch((err: unknown) => logLine(`${options.seam} cache not created: ${message(err)}`))
      .finally(() => creating.delete(key));
  };

  const renew = (key: string, root: string, headers: Headers, cache: Held) => {
    void cacheCall(`${root}/${cache.name}?updateMask=ttl`, 'PATCH', headers, {
      ttl: `${GEMINI_CACHE_TTL_SECONDS}s`,
    })
      .then(renewed => {
        if (held.get(key) === cache) cache.expiresAt = expiry(renewed.expireTime);
      })
      .catch((err: unknown) => {
        if (held.get(key) === cache) held.delete(key);
        logLine(`${options.seam} cache ${cache.name} not renewed: ${message(err)}`);
      });
  };

  return async (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const call = GENERATE.exec(url);
    if (call === null || init?.method !== 'POST' || typeof init.body !== 'string') {
      return send(input, init);
    }
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(init.body) as Record<string, unknown>;
    } catch {
      return send(input, init);
    }
    if (body.systemInstruction === undefined || body.cachedContent !== undefined) {
      return send(input, init);
    }
    const [, root, model] = call as unknown as [string, string, string];
    const fixed = Object.fromEntries(FIXED.flatMap(f => (f in body ? [[f, body[f]]] : [])));
    const key = createHash('sha256').update(JSON.stringify({model, fixed})).digest('hex');
    const headers = new Headers(init.headers);
    headers.set('content-type', 'application/json');

    const cache = held.get(key);
    if (cache !== undefined && cache.expiresAt - EXPIRY_MARGIN_MS > now()) {
      const rest = Object.fromEntries(
        Object.entries(body).filter(([field]) => !(FIXED as readonly string[]).includes(field)),
      );
      const response = await send(input, {
        ...init,
        body: JSON.stringify({...rest, cachedContent: cache.name}),
      });
      if (response.ok) {
        renew(key, root, headers, cache);
        return response;
      }
      if (!REFUSED.has(response.status)) return response;
      held.delete(key);
      logLine(`${options.seam} cache ${cache.name} refused (${response.status}): sent whole`);
    } else if (cache !== undefined) {
      held.delete(key);
    }

    const response = await send(input, init);
    if (!creating.has(key) && !held.has(key)) create(key, root, model, headers, fixed);
    return response;
  };
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
