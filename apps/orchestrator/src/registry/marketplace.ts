/**
 * The orchestrator's client to its marketplace (task-13.5 decisions 1, 2, 10, 11): the reads an
 * install by id and the update check make — one app's entry, an artifact's descriptor and files —
 * and the report of an app ahead of the Store. Every request has the one timeout; the route
 * layout and the entry's shape are the sdk's. Transport stays here, as the sdk has no fetch client.
 */
import {
  ARTIFACT_DESCRIPTOR_FILE,
  artifactPath,
  entryPath,
  MARKETPLACE_ROUTES,
  validateIndexEntry,
  type IndexEntry,
} from '@a2uiverse/sdk';

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
    let response: Response;
    try {
      response = await this.#get(artifactPath(artifactId, path), '*/*');
    } catch (err) {
      throw new Error(`${what}: ${(err as Error).message}`);
    }
    if (!response.ok) throw new Error(`${what}: HTTP ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
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

/** A fetch failure's cause in one line: the system error under it when there is one. */
function reason(err: unknown): string {
  const cause = (err as {cause?: {code?: string; message?: string}}).cause;
  return cause?.code ?? cause?.message ?? (err as Error).message;
}
