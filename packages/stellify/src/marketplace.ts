/**
 * The marketplace as Stellify reaches it (SPEC §9.3): the sdk's routes over `fetch`, nothing
 * more. The reads — the index, an artifact's files — and the writes — claim, publish, unpublish —
 * each answered as the marketplace answered, a refusal's findings passed through unchanged. An
 * unreachable marketplace throws, naming its address.
 */
import {
  artifactPath,
  MARKETPLACE_ROUTES,
  validateIndexEntry,
  type ClaimResponse,
  type IndexEntry,
  type PublishOutcome,
  type PublishRequest,
} from '@a2uiverse/sdk';

const trim = (base: string) => base.replace(/\/+$/, '');

async function get(base: string, path: string, fetchImpl: typeof fetch): Promise<Response> {
  try {
    return await fetchImpl(`${trim(base)}/${path}`);
  } catch (err) {
    throw new Error(`cannot reach the marketplace at ${base}: ${(err as Error).message}`);
  }
}

/** Every entry the marketplace lists. */
export async function fetchIndex(
  base: string,
  fetchImpl: typeof fetch = fetch,
): Promise<IndexEntry[]> {
  const response = await get(base, MARKETPLACE_ROUTES.index, fetchImpl);
  if (!response.ok) {
    throw new Error(`the marketplace answered ${response.status} to ${MARKETPLACE_ROUTES.index}`);
  }
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error(`${MARKETPLACE_ROUTES.index} is not a list`);
  return data.map((item, i) => {
    const read = validateIndexEntry(item);
    if (!read.ok) {
      throw new Error(
        `${MARKETPLACE_ROUTES.index}[${i}] is not an entry: ${read.errors.join('; ')}`,
      );
    }
    return read.value;
  });
}

/** One file of a hosted artifact, by its id and path. */
export async function fetchArtifactFile(
  base: string,
  artifactId: string,
  path: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Uint8Array> {
  const route = artifactPath(artifactId, path);
  const response = await get(base, route, fetchImpl);
  if (!response.ok) throw new Error(`the marketplace answered ${response.status} to ${route}`);
  return new Uint8Array(await response.arrayBuffer());
}

/** What a write answered: the status and the body as it came. */
export interface WriteAnswer<T> {
  status: number;
  body: T | {ok: false; findings: string[]} | unknown;
}

async function post<T>(
  base: string,
  path: string,
  body: unknown,
  token: string | undefined,
  fetchImpl: typeof fetch,
): Promise<WriteAnswer<T>> {
  let response: Response;
  try {
    response = await fetchImpl(`${trim(base)}/${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token === undefined ? {} : {authorization: `Bearer ${token}`}),
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(`cannot reach the marketplace at ${base}: ${(err as Error).message}`);
  }
  let parsed: unknown = undefined;
  const text = await response.text();
  if (text !== '') {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }
  return {status: response.status, body: parsed};
}

export const postClaim = (base: string, name: string, fetchImpl: typeof fetch = fetch) =>
  post<ClaimResponse>(base, MARKETPLACE_ROUTES.claim, {publisher: name}, undefined, fetchImpl);

export const postPublish = (
  base: string,
  token: string,
  body: PublishRequest,
  fetchImpl: typeof fetch = fetch,
) => post<PublishOutcome>(base, MARKETPLACE_ROUTES.publish, body, token, fetchImpl);

export const postUnpublish = (
  base: string,
  token: string,
  appId: string,
  fetchImpl: typeof fetch = fetch,
) => post<{ok: true; appId: string}>(base, MARKETPLACE_ROUTES.unpublish, {appId}, token, fetchImpl);

/** The findings a refusal body carries, else one line saying what came instead. */
export function findingsOf(answer: WriteAnswer<unknown>, route: string): string[] {
  const body = answer.body as {findings?: unknown} | null | undefined;
  if (
    typeof body === 'object' &&
    body !== null &&
    Array.isArray(body.findings) &&
    body.findings.every(f => typeof f === 'string')
  ) {
    return body.findings as string[];
  }
  return [`the marketplace answered ${answer.status} to ${route} with no findings`];
}
