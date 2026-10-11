/**
 * The publisher the orchestrator holds for the trusted page's Publish (SPEC §10; phase-14 decision
 * 5; task 14.4): one publisher's name and token, and the marketplace that issued them, in an
 * owner-only file of the state directory written as the vault's is — Stellify's publisher file in
 * shape. The token goes to that marketplace alone (decision 6); a file naming another marketplace
 * is a publisher held for another Store, its token never sent (decision 12).
 *
 * Every publisher call is relayed to the marketplace with the held token as the bearer: the claim,
 * which keeps the token and shows it once (decisions 7, 8); sign-in by name and token, checked
 * through the marketplace's `publisher` route before anything is kept (decision 10); publish and
 * unpublish, the page's body and the marketplace's answer as they are (decision 15). A claim or a
 * sign-in waits for sign-out while any publisher is held, and sign-out — forgetting the file, no
 * more — is the only way the token goes (decision 11). Each act is one journal line, never the
 * token (decision 17).
 */
import {chmod, mkdir, readFile, rename, rm, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {checkPublisherToken} from '@a2uiverse/sdk';
import type {MarketplaceClient, WriteAnswer} from '../registry/marketplace.js';
import type {WriteCaller} from '../writeGuard.js';

export const PUBLISHER_FILE = join('publisher', 'publisher.json');

/** What the file holds: Stellify's publisher file's fields. */
export interface PublisherRecord {
  /** The marketplace that issued the token. */
  marketplace: string;
  publisher: string;
  token: string;
}

/** One publisher act as the journal records it (task-14.4 decision 17): never the token. */
export interface PublisherJournalEntry {
  act: 'claim' | 'signIn' | 'signOut' | 'publish' | 'unpublish';
  publisher?: string;
  appId?: string;
  /** A publish that took: the card's version, now published. */
  version?: string;
  outcome: 'done' | 'refused' | 'unreached';
  /** A refusal's findings, the Store's own for a publish or an unpublish. */
  findings?: string[];
  /** A claim whose token could not be kept here, shown once all the same (task-14.4 decision 8). */
  kept?: false;
  by: WriteCaller;
}

/** Who is signed in, as opening Publish reads it (task-14.4 decisions 12, 13). */
export type PublisherStatus =
  | {state: 'signed-out'}
  | {
      state: 'signed-in';
      publisher: string;
      /** Whether the marketplace still knows the token, asked at each read. */
      store: 'accepted' | 'not-accepted' | 'unreached';
    }
  | {state: 'another-store'; publisher: string};

/** Why a publisher call was refused before or after the marketplace: the page words each. */
export type PublisherRefusalReason =
  'held' | 'signed-out' | 'another-store' | 'not-accepted' | 'unreached';

/** What a publisher operation answers the route: its status and body. */
export interface PublisherAnswer {
  status: number;
  body: unknown;
}

const sameAddress = (a: string, b: string) => a.replace(/\/$/, '') === b.replace(/\/$/, '');

/** The owner-only file: read once at boot, written whole, through a temp file and a rename. */
export class PublisherStore {
  readonly #path: string;
  #record: PublisherRecord | undefined;

  constructor(stateDir: string) {
    this.#path = join(stateDir, PUBLISHER_FILE);
  }

  get path(): string {
    return this.#path;
  }

  get record(): PublisherRecord | undefined {
    return this.#record;
  }

  /** No file is no publisher; a file that is not a publisher file stops the boot, naming it. */
  async load(): Promise<void> {
    let text: string;
    try {
      text = await readFile(this.#path, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw err;
    }
    const raw = JSON.parse(text) as Partial<PublisherRecord> | null;
    for (const field of ['marketplace', 'publisher', 'token'] as const) {
      if (typeof raw?.[field] !== 'string' || raw[field] === '') {
        throw new Error(`the publisher file at ${this.#path} is not a publisher file: no ${field}`);
      }
    }
    const {marketplace, publisher, token} = raw as PublisherRecord;
    this.#record = {marketplace, publisher, token};
  }

  async keep(record: PublisherRecord): Promise<void> {
    await mkdir(dirname(this.#path), {recursive: true, mode: 0o700});
    const tmp = `${this.#path}.${process.pid}.tmp`;
    await writeFile(tmp, `${JSON.stringify(record, null, 1)}\n`, {mode: 0o600});
    await chmod(tmp, 0o600);
    await rename(tmp, this.#path);
    this.#record = record;
  }

  async forget(): Promise<void> {
    await rm(this.#path, {force: true});
    this.#record = undefined;
  }
}

export interface PublisherDeps {
  store: PublisherStore;
  marketplace: MarketplaceClient;
  journal: (entry: PublisherJournalEntry) => void;
}

export class Publisher {
  readonly #deps: PublisherDeps;
  /** One act at a time: a claim and a sign-in racing each other cannot both keep a file. */
  #serial: Promise<unknown> = Promise.resolve();

  constructor(deps: PublisherDeps) {
    this.#deps = deps;
  }

  /** Who is signed in; the held token asked about at the marketplace that issued it, never elsewhere. */
  async status(): Promise<PublisherStatus> {
    const held = this.#deps.store.record;
    if (!held) return {state: 'signed-out'};
    if (!this.#here(held)) return {state: 'another-store', publisher: held.publisher};
    const asked = await this.#deps.marketplace.publisherOf(held.token);
    const store =
      asked.kind === 'unreached'
        ? 'unreached'
        : asked.kind === 'publisher' && asked.name === held.publisher
          ? 'accepted'
          : 'not-accepted';
    return {state: 'signed-in', publisher: held.publisher, store};
  }

  /**
   * The claim, relayed: the token kept and shown once in the answer — shown even when it could not
   * be kept, the name being claimed already (task-14.4 decisions 7, 8).
   */
  claim(body: unknown, by: WriteCaller): Promise<PublisherAnswer> {
    return this.#one(async () => {
      const name = nameOf(body);
      const held = this.#refuseHeld();
      if (held) {
        this.#journal({act: 'claim', ...name, outcome: 'refused', findings: held.findings, by});
        return {status: 409, body: held};
      }
      const answer = await this.#deps.marketplace.claim(body);
      if (answer.kind === 'unreached') {
        const refusal = this.#unreached(answer.reason);
        this.#journal({
          act: 'claim',
          ...name,
          outcome: 'unreached',
          findings: refusal.findings,
          by,
        });
        return {status: 503, body: refusal};
      }
      const claimed = answer.body as {publisher?: unknown; token?: unknown} | undefined;
      if (
        answer.status !== 201 ||
        typeof claimed?.publisher !== 'string' ||
        typeof claimed.token !== 'string'
      ) {
        this.#journal({
          act: 'claim',
          ...name,
          outcome: 'refused',
          findings: findingsOf(answer),
          by,
        });
        return {status: answer.status === 201 ? 502 : answer.status, body: answer.body};
      }
      const record = {
        marketplace: this.#deps.marketplace.url,
        publisher: claimed.publisher,
        token: claimed.token,
      };
      try {
        await this.#deps.store.keep(record);
      } catch (err) {
        const findings = [
          `the token could not be kept on this computer (${(err as Error).message}): save it, then sign in with it`,
        ];
        this.#journal({
          act: 'claim',
          publisher: record.publisher,
          outcome: 'done',
          kept: false,
          findings,
          by,
        });
        return {
          status: 201,
          body: {publisher: record.publisher, token: record.token, kept: false, findings},
        };
      }
      this.#journal({act: 'claim', publisher: record.publisher, outcome: 'done', by});
      return {status: 201, body: {publisher: record.publisher, token: record.token, kept: true}};
    });
  }

  /**
   * Sign-in by name and token (task-14.4 decisions 4, 10): kept only once the marketplace says the
   * token is that name's.
   */
  signIn(body: unknown, by: WriteCaller): Promise<PublisherAnswer> {
    return this.#one(async () => {
      const b = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
      if (typeof b.publisher !== 'string' || typeof b.token !== 'string') {
        return {
          status: 400,
          body: {ok: false, findings: ['a sign-in names the publisher and its token']},
        };
      }
      const {publisher, token} = b as {publisher: string; token: string};
      const held = this.#refuseHeld();
      if (held) {
        this.#journal({act: 'signIn', publisher, outcome: 'refused', findings: held.findings, by});
        return {status: 409, body: held};
      }
      const wrong = {
        ok: false,
        reason: 'not-accepted' satisfies PublisherRefusalReason,
        findings: [`that token is not ${publisher}'s`],
      };
      if (checkPublisherToken(token).length > 0) {
        this.#journal({act: 'signIn', publisher, outcome: 'refused', findings: wrong.findings, by});
        return {status: 401, body: wrong};
      }
      const asked = await this.#deps.marketplace.publisherOf(token);
      if (asked.kind === 'unreached') {
        const refusal = this.#unreached(asked.reason);
        this.#journal({
          act: 'signIn',
          publisher,
          outcome: 'unreached',
          findings: refusal.findings,
          by,
        });
        return {status: 503, body: refusal};
      }
      if (asked.kind === 'refused' || asked.name !== publisher) {
        this.#journal({act: 'signIn', publisher, outcome: 'refused', findings: wrong.findings, by});
        return {status: 401, body: wrong};
      }
      try {
        await this.#deps.store.keep({marketplace: this.#deps.marketplace.url, publisher, token});
      } catch (err) {
        const findings = [`the publisher could not be kept: ${(err as Error).message}`];
        this.#journal({act: 'signIn', publisher, outcome: 'refused', findings, by});
        return {status: 500, body: {ok: false, findings}};
      }
      this.#journal({act: 'signIn', publisher, outcome: 'done', by});
      return {status: 200, body: {ok: true, publisher}};
    });
  }

  /** Sign-out: the file forgotten, the token still the marketplace's (task-14.4 decision 11). */
  signOut(by: WriteCaller): Promise<PublisherAnswer> {
    return this.#one(async () => {
      const held = this.#deps.store.record;
      if (!held) {
        return {status: 404, body: {ok: false, findings: ['no publisher is signed in here']}};
      }
      try {
        await this.#deps.store.forget();
      } catch (err) {
        const findings = [`the publisher could not be forgotten: ${(err as Error).message}`];
        this.#journal({
          act: 'signOut',
          publisher: held.publisher,
          outcome: 'refused',
          findings,
          by,
        });
        return {status: 500, body: {ok: false, findings}};
      }
      this.#journal({act: 'signOut', publisher: held.publisher, outcome: 'done', by});
      return {status: 200, body: {ok: true, publisher: held.publisher}};
    });
  }

  /** A publish, relayed untouched with the held token (task-14.4 decision 15). */
  publish(body: unknown, by: WriteCaller): Promise<PublisherAnswer> {
    return this.#relay('publish', body, by, token => this.#deps.marketplace.publish(token, body));
  }

  /** An unpublish, relayed the same way. */
  unpublish(body: unknown, by: WriteCaller): Promise<PublisherAnswer> {
    return this.#relay('unpublish', body, by, token =>
      this.#deps.marketplace.unpublish(token, body),
    );
  }

  async #relay(
    act: 'publish' | 'unpublish',
    body: unknown,
    by: WriteCaller,
    send: (token: string) => Promise<WriteAnswer>,
  ): Promise<PublisherAnswer> {
    const appId = appIdOf(body);
    const held = this.#deps.store.record;
    if (!held || !this.#here(held)) {
      const refusal = held
        ? {
            ok: false,
            reason: 'another-store' satisfies PublisherRefusalReason,
            findings: [
              `${held.publisher} is signed in for another Store: sign out, then sign in here`,
            ],
          }
        : {
            ok: false,
            reason: 'signed-out' satisfies PublisherRefusalReason,
            findings: [`sign in to ${act}`],
          };
      this.#journal({act, ...appId, outcome: 'refused', findings: refusal.findings, by});
      return {status: 409, body: refusal};
    }
    const publisher = held.publisher;
    const answer = await send(held.token);
    if (answer.kind === 'unreached') {
      const refusal = this.#unreached(answer.reason);
      this.#journal({
        act,
        publisher,
        ...appId,
        outcome: 'unreached',
        findings: refusal.findings,
        by,
      });
      return {status: 503, body: refusal};
    }
    if (answer.status === 401) {
      const refusal = {
        ok: false,
        reason: 'not-accepted' satisfies PublisherRefusalReason,
        findings: [`the Store no longer accepts ${publisher}'s token: sign out and sign in again`],
      };
      this.#journal({act, publisher, ...appId, outcome: 'refused', findings: refusal.findings, by});
      return {status: 401, body: refusal};
    }
    if (answer.status >= 200 && answer.status < 300) {
      const version = (answer.body as {version?: unknown} | undefined)?.version;
      this.#journal({
        act,
        publisher,
        ...appId,
        ...(act === 'publish' && typeof version === 'string' ? {version} : {}),
        outcome: 'done',
        by,
      });
    } else {
      this.#journal({
        act,
        publisher,
        ...appId,
        outcome: 'refused',
        findings: findingsOf(answer),
        by,
      });
    }
    return {status: answer.status, body: answer.body};
  }

  #here(record: PublisherRecord): boolean {
    return sameAddress(record.marketplace, this.#deps.marketplace.url);
  }

  #refuseHeld(): {ok: false; reason: PublisherRefusalReason; findings: string[]} | undefined {
    const held = this.#deps.store.record;
    if (!held) return undefined;
    return {
      ok: false,
      reason: 'held',
      findings: [
        this.#here(held)
          ? `${held.publisher} is signed in here: sign out first`
          : `${held.publisher} is signed in here for another Store: sign out first`,
      ],
    };
  }

  #unreached(reason: string): {ok: false; reason: PublisherRefusalReason; findings: string[]} {
    return {
      ok: false,
      reason: 'unreached',
      findings: [
        `the marketplace at ${this.#deps.marketplace.url} could not be reached: ${reason}`,
      ],
    };
  }

  #journal(entry: PublisherJournalEntry): void {
    this.#deps.journal(entry);
  }

  #one<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.#serial.then(operation, operation);
    this.#serial = run.catch(() => undefined);
    return run;
  }
}

function nameOf(body: unknown): {publisher?: string} {
  const name = (body as {publisher?: unknown} | null | undefined)?.publisher;
  return typeof name === 'string' ? {publisher: name} : {};
}

function appIdOf(body: unknown): {appId?: string} {
  const appId = (body as {appId?: unknown} | null | undefined)?.appId;
  return typeof appId === 'string' ? {appId} : {};
}

/** A refusal's findings as the marketplace gave them, else one line saying what came instead. */
function findingsOf(answer: {status: number; body: unknown}): string[] {
  const findings = (answer.body as {findings?: unknown} | null | undefined)?.findings;
  if (Array.isArray(findings) && findings.every(f => typeof f === 'string')) {
    return findings as string[];
  }
  return [`the marketplace answered HTTP ${answer.status}`];
}
