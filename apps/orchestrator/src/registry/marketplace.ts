/**
 * The orchestrator's client to its marketplace (task-13.5 decisions 1, 2, 10, 11; task 14.4): the
 * reads an install by id and the update check make — one app's entry, an artifact's descriptor and
 * files — and the report of an app ahead of the Store; the Store's reads the trusted page draws
 * from — the index, the search, an app's preview — each entry checked against the sdk's schema; and
 * the publisher's calls, relayed with the bearer the caller hands: claim, whose a token is, publish
 * and unpublish. Every request has the one timeout but a publish, which waits on the marketplace's
 * own steps; the route layout and the shapes are the sdk's. Transport stays here, as the sdk has no
 * fetch client.
 */
import {
  ARTIFACT_DESCRIPTOR_FILE,
  artifactPath,
  entryPath,
  MARKETPLACE_ROUTES,
  previewPath,
  searchPath,
  validateIndexEntry,
  validatePreview,
  type IndexEntry,
  type PreviewDocument,
} from '@a2uiverse/sdk';

/**
 * How long a relayed publish may take: the marketplace bounds its own steps — the live card's
 * fetch, the smoke test — by its own timeouts, a live model's answer among them.
 */
export const PUBLISH_TIMEOUT_MS = 180_000;

export interface MarketplaceClientOptions {
  /** The marketplace's address, no trailing slash. */
  url: string;
  timeoutMs: number;
  fetchImpl?: typeof fetch;
}

/** What asking the marketplace for one app's entry came to. */
export type EntryLookup =
  | {kind: 'entry'; entry: IndexEntry}
  /** The marketplace answered 404: the app is not published. */
  | {kind: 'not-published'}
  /** No answer, a timeout, or an answer that is not the route's: the marketplace was not reached. */
  | {kind: 'unreached'; reason: string}
  /** An answer that is not an entry by the sdk's schema. */
  | {kind: 'malformed'; errors: string[]};

/** An index entry or a search result the sdk's schema refused, left out: where, and why. */
export interface DroppedEntry {
  at: string;
  errors: string[];
}

/** What the index came to: every entry that reads, and the ones left out. */
export type IndexLookup =
  | {kind: 'entries'; entries: IndexEntry[]; dropped: DroppedEntry[]}
  | {kind: 'unreached'; reason: string}
  | {kind: 'malformed'; errors: string[]};

/** What a search came to: the results that read, in the marketplace's order, and the ones left out. */
export type SearchLookup =
  | {kind: 'results'; results: {entry: IndexEntry; score: number}[]; dropped: DroppedEntry[]}
  | {kind: 'unreached'; reason: string}
  | {kind: 'malformed'; errors: string[]};

/** What asking for one app's preview came to. */
export type PreviewLookup =
  | {kind: 'preview'; preview: PreviewDocument}
  | {kind: 'not-published'}
  | {kind: 'unreached'; reason: string}
  | {kind: 'malformed'; errors: string[]};

/** One artifact file as fetched: its bytes, a 404, or no answer. */
export type FileLookup =
  {kind: 'bytes'; bytes: Uint8Array} | {kind: 'not-found'} | {kind: 'unreached'; reason: string};

/** Whose a token is: the publisher's name, refused as one no publisher holds, or no answer. */
export type PublisherLookup =
  {kind: 'publisher'; name: string} | {kind: 'refused'} | {kind: 'unreached'; reason: string};

/** What a relayed write came to: the marketplace's status and body as they came, or no answer. */
export type WriteAnswer =
  {kind: 'answered'; status: number; body: unknown} | {kind: 'unreached'; reason: string};

export class MarketplaceClient {
  readonly url: string;
  readonly #timeoutMs: number;
  readonly #fetch: typeof fetch;

  constructor({url, timeoutMs, fetchImpl = fetch}: MarketplaceClientOptions) {
    this.url = url.replace(/\/$/, '');
    this.#timeoutMs = timeoutMs;
    this.#fetch = fetchImpl;
  }

  /** One app's entry, as the update check and an install by id read it. */
  async entry(appId: string): Promise<EntryLookup> {
    let response: Response;
    try {
      response = await this.#get(entryPath(appId));
    } catch (err) {
      return {kind: 'unreached', reason: (err as Error).message};
    }
    if (response.status === 404) return {kind: 'not-published'};
    if (!response.ok) return {kind: 'unreached', reason: `answered HTTP ${response.status}`};
    let json: unknown;
    try {
      json = await response.json();
    } catch (err) {
      return {kind: 'malformed', errors: [`not JSON (${(err as Error).message})`]};
    }
    const entry = validateIndexEntry(json);
    if (!entry.ok) return {kind: 'malformed', errors: entry.errors};
    if (entry.value.appId !== appId) {
      return {kind: 'malformed', errors: [`the entry is ${entry.value.appId}'s`]};
    }
    return {kind: 'entry', entry: entry.value};
  }

  /** An artifact's descriptor file; throws naming the artifact when it cannot be fetched. */
  descriptor(artifactId: string): Promise<Uint8Array> {
    return this.file(artifactId, ARTIFACT_DESCRIPTOR_FILE);
  }

  /** One of an artifact's files; throws naming the artifact and the file when it cannot be fetched. */
  async file(artifactId: string, path: string): Promise<Uint8Array> {
    const what = `the marketplace's artifact ${artifactId} (${path}) could not be fetched`;
    const found = await this.fetchFile(artifactId, path);
    if (found.kind === 'bytes') return found.bytes;
    throw new Error(`${what}: ${found.kind === 'not-found' ? 'HTTP 404' : found.reason}`);
  }

  /** One of an artifact's files, a 404 told apart from no answer: what the preview's relay reads. */
  async fetchFile(artifactId: string, path: string): Promise<FileLookup> {
    let response: Response;
    try {
      response = await this.#get(artifactPath(artifactId, path), '*/*');
    } catch (err) {
      return {kind: 'unreached', reason: (err as Error).message};
    }
    if (response.status === 404) return {kind: 'not-found'};
    if (!response.ok) return {kind: 'unreached', reason: `answered HTTP ${response.status}`};
    return {kind: 'bytes', bytes: new Uint8Array(await response.arrayBuffer())};
  }

  /** The index, each entry checked against the sdk's schema; one that does not read is left out. */
  async index(): Promise<IndexLookup> {
    const read = await this.#json(MARKETPLACE_ROUTES.index);
    if (read.kind === 'not-found') return {kind: 'unreached', reason: 'answered HTTP 404'};
    if (read.kind !== 'json') return read;
    if (!Array.isArray(read.json)) return {kind: 'malformed', errors: ['the index is not a list']};
    const entries: IndexEntry[] = [];
    const dropped: DroppedEntry[] = [];
    for (const [i, item] of read.json.entries()) {
      const entry = validateIndexEntry(item);
      if (entry.ok) entries.push(entry.value);
      else dropped.push({at: `index.json[${i}]`, errors: entry.errors});
    }
    return {kind: 'entries', entries, dropped};
  }

  /** The search over the words, each result's entry checked as the index's are. */
  async search(words: string): Promise<SearchLookup> {
    const read = await this.#json(searchPath(words));
    if (read.kind === 'not-found') return {kind: 'unreached', reason: 'answered HTTP 404'};
    if (read.kind !== 'json') return read;
    const results = (read.json as {results?: unknown} | null)?.results;
    if (!Array.isArray(results)) {
      return {kind: 'malformed', errors: ['the search answered no list of results']};
    }
    const kept: {entry: IndexEntry; score: number}[] = [];
    const dropped: DroppedEntry[] = [];
    for (const [i, item] of results.entries()) {
      const {entry: raw, score} = (item ?? {}) as {entry?: unknown; score?: unknown};
      const entry = validateIndexEntry(raw);
      if (entry.ok && typeof score === 'number') kept.push({entry: entry.value, score});
      else {
        dropped.push({
          at: `search results[${i}]`,
          errors: entry.ok ? ['score: expected a number'] : entry.errors,
        });
      }
    }
    return {kind: 'results', results: kept, dropped};
  }

  /** One app's preview, checked against the sdk's schema and its app id. */
  async preview(appId: string): Promise<PreviewLookup> {
    const read = await this.#json(previewPath(appId));
    if (read.kind === 'not-found') return {kind: 'not-published'};
    if (read.kind !== 'json') return read;
    const preview = validatePreview(read.json);
    if (!preview.ok) return {kind: 'malformed', errors: preview.errors};
    if (preview.value.appId !== appId) {
      return {kind: 'malformed', errors: [`the preview is ${preview.value.appId}'s`]};
    }
    return {kind: 'preview', preview: preview.value};
  }

  /** Whose the token is (task-14.4 decision 9): the name, or refused when no publisher holds it. */
  async publisherOf(token: string): Promise<PublisherLookup> {
    const signal = AbortSignal.timeout(this.#timeoutMs);
    let response: Response;
    try {
      response = await this.#fetch(`${this.url}/${MARKETPLACE_ROUTES.publisher}`, {
        signal,
        headers: {accept: 'application/json', authorization: `Bearer ${token}`},
      });
    } catch (err) {
      return {kind: 'unreached', reason: failure(err, signal, this.#timeoutMs)};
    }
    if (response.status === 401) return {kind: 'refused'};
    if (!response.ok) return {kind: 'unreached', reason: `answered HTTP ${response.status}`};
    const body = (await response.json().catch(() => undefined)) as
      {publisher?: unknown} | undefined;
    if (typeof body?.publisher !== 'string') {
      return {kind: 'unreached', reason: 'answered no publisher'};
    }
    return {kind: 'publisher', name: body.publisher};
  }

  /** A claim of the name, relayed: the marketplace's answer as it came. */
  claim(body: unknown): Promise<WriteAnswer> {
    return this.#post(MARKETPLACE_ROUTES.claim, body, undefined, this.#timeoutMs);
  }

  /** A publish, relayed with the publisher's token: the body as the page sent it, the answer as it came. */
  publish(token: string, body: unknown): Promise<WriteAnswer> {
    return this.#post(MARKETPLACE_ROUTES.publish, body, token, PUBLISH_TIMEOUT_MS);
  }

  /** An unpublish, relayed with the publisher's token. */
  unpublish(token: string, body: unknown): Promise<WriteAnswer> {
    return this.#post(MARKETPLACE_ROUTES.unpublish, body, token, this.#timeoutMs);
  }

  /**
   * The report of an app ahead of the Store (phase-13 decision 14): the app id and nothing else.
   * The marketplace accepts it at once and verifies it itself; a failure here throws for the
   * caller to log.
   */
  async report(appId: string): Promise<void> {
    let response: Response;
    try {
      response = await this.#fetch(`${this.url}/${MARKETPLACE_ROUTES.report}`, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({appId}),
        signal: AbortSignal.timeout(this.#timeoutMs),
      });
    } catch (err) {
      throw new Error(`the marketplace at ${this.url} could not be reached: ${reason(err)}`);
    }
    if (!response.ok) {
      throw new Error(
        `the marketplace at ${this.url} answered HTTP ${response.status} to a report`,
      );
    }
  }

  /** A read answered as JSON, a 404 told apart; no answer or a status the route never gives is unreached. */
  async #json(
    path: string,
  ): Promise<
    | {kind: 'json'; json: unknown}
    | {kind: 'not-found'}
    | {kind: 'unreached'; reason: string}
    | {kind: 'malformed'; errors: string[]}
  > {
    let response: Response;
    try {
      response = await this.#get(path);
    } catch (err) {
      return {kind: 'unreached', reason: (err as Error).message};
    }
    if (response.status === 404) return {kind: 'not-found'};
    if (!response.ok) return {kind: 'unreached', reason: `answered HTTP ${response.status}`};
    try {
      return {kind: 'json', json: await response.json()};
    } catch (err) {
      return {kind: 'malformed', errors: [`not JSON (${(err as Error).message})`]};
    }
  }

  async #post(
    path: string,
    body: unknown,
    token: string | undefined,
    timeoutMs: number,
  ): Promise<WriteAnswer> {
    const signal = AbortSignal.timeout(timeoutMs);
    let response: Response;
    try {
      response = await this.#fetch(`${this.url}/${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          ...(token === undefined ? {} : {authorization: `Bearer ${token}`}),
        },
        body: JSON.stringify(body),
        signal,
      });
    } catch (err) {
      return {kind: 'unreached', reason: failure(err, signal, timeoutMs)};
    }
    const text = await response.text().catch(() => '');
    let parsed: unknown = undefined;
    if (text !== '') {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = text;
      }
    }
    return {kind: 'answered', status: response.status, body: parsed};
  }

  async #get(path: string, accept = 'application/json'): Promise<Response> {
    const signal = AbortSignal.timeout(this.#timeoutMs);
    try {
      return await this.#fetch(`${this.url}/${path}`, {signal, headers: {accept}});
    } catch (err) {
      if (signal.aborted) {
        throw new Error(`did not answer within ${this.#timeoutMs / 1000} s`);
      }
      throw new Error(reason(err));
    }
  }
}

/** A fetch failure in one line, a timeout said as one. */
function failure(err: unknown, signal: AbortSignal, timeoutMs: number): string {
  return signal.aborted ? `did not answer within ${timeoutMs / 1000} s` : reason(err);
}

/** A fetch failure's cause in one line: the system error under it when there is one. */
function reason(err: unknown): string {
  const cause = (err as {cause?: {code?: string; message?: string}}).cause;
  return cause?.code ?? cause?.message ?? (err as Error).message;
}
