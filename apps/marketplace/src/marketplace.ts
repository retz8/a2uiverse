/**
 * The marketplace (SPEC §9.3; phase-13 decisions 2, 3, 5, 7, 8, 9, 11, 12, 13, 14, 15, 18; task
 * 13.3): the publishers and the claim, publish in order with its gate and the smoke test, the
 * index with its embeddings and the search, the live-card refresh and the report, unpublish — over
 * the sdk's contracts, the served subtree on disk the truth, the vectors in memory.
 */
import {timingSafeEqual} from 'node:crypto';
import type {AgentCard} from '@a2a-js/sdk';
import {corpusDoc, rank, type Embedder} from '@a2uiverse/embedder';
import {
  aheadOfStore,
  BASIC_CATALOG_ID,
  BASIC_CATALOG_SCHEMA,
  checkAdditiveEvolution,
  checkAppId,
  checkCoverage,
  checkPaint,
  checkPublisherName,
  checkPublisherToken,
  checkSignInAnswer,
  coverageErrors,
  entitlementOf,
  gateArtifact,
  hashPublisherToken,
  mintPublisherToken,
  PUBLIC_CATALOG_IDS,
  readSupportedCatalogIds,
  retiredLines,
  smokeWords,
  type A2uiCatalogSchema,
  type A2uiMessage,
  type ArtifactDescriptor,
  type GatedArtifact,
  type IndexEntry,
  type PreviewDocument,
  type PublishBody,
  type PublishOutcome,
  type PublishedCard,
  type SearchResponse,
} from '@a2uiverse/sdk';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import type {FetchCard} from './cardFetch.js';
import {FAILED_STATES, type SmokeObservation, type SmokeRunner} from './smoke.js';
import {MarketplaceStore, type PublisherRecord} from './store.js';

export interface MarketplaceDeps {
  stateDir: string;
  embedder: Embedder;
  /** The live card, under the card timeout. */
  fetchCard: FetchCard;
  /** The smoke request's transport. */
  smoke: SmokeRunner;
  smokeTimeoutMs: number;
  now?: () => Date;
}

export type ClaimResult =
  | {ok: true; publisher: string; token: string}
  | {ok: false; kind: 'invalid' | 'taken'; findings: string[]};

/** What publish answers: the sdk's outcome, or a refusal — another's names, or findings. */
export type PublishAnswer =
  PublishOutcome | {ok: false; kind: 'forbidden' | 'refused'; findings: string[]};

export type UnpublishAnswer =
  {ok: true; appId: string} | {ok: false; kind: 'forbidden' | 'not-published'; findings: string[]};

/** Catalog ids no artifact may be handed for: the client provides them. */
const CLIENT_CATALOG_IDS: readonly string[] = [...PUBLIC_CATALOG_IDS, SHELL_CATALOG_ID];

const NEVER_FINISHED = 'the agent never finished: the stream ended without a final event';

export class Marketplace {
  readonly #deps: MarketplaceDeps;
  readonly #store: MarketplaceStore;
  #publishers = new Map<string, PublisherRecord>();
  #entries = new Map<string, IndexEntry>();
  #previews = new Map<string, PreviewDocument>();
  #descriptors = new Map<string, ArtifactDescriptor>();
  #vectors = new Map<string, number[]>();
  #queue: Promise<unknown> = Promise.resolve();
  #reports = new Map<string, Promise<void>>();

  constructor(deps: MarketplaceDeps) {
    this.#deps = deps;
    this.#store = new MarketplaceStore(deps.stateDir);
  }

  /** The served subtree, for the static routes. */
  get publicDir(): string {
    return this.#store.publicDir;
  }

  /**
   * The boot (task-13.3 decisions 9, 15): everything on disk read and verified — a damaged file
   * throws — `index.json` regenerated, every entry's card embedded. The card refresh is apart.
   */
  async load(): Promise<void> {
    const loaded = await this.#store.load();
    this.#publishers = new Map(loaded.publishers.map(p => [p.name, p]));
    this.#entries = new Map(loaded.entries.map(e => [e.appId, e]));
    this.#previews = loaded.previews;
    this.#descriptors = loaded.descriptors;
    await this.#store.writeIndex(this.entries());
    const entries = this.entries();
    if (entries.length === 0) return;
    const vectors = await this.#deps.embedder.embed(entries.map(e => corpusDoc(e.card)));
    entries.forEach((e, i) => this.#vectors.set(e.appId, vectors[i]));
  }

  /** Every published app's live card refetched and its flag set or cleared (decision 14). */
  async refreshCards(): Promise<void> {
    await Promise.all(this.entries().map(e => this.report(e.appId)));
  }

  entries(): IndexEntry[] {
    return [...this.#entries.values()].sort((a, b) => (a.appId < b.appId ? -1 : 1));
  }

  entry(appId: string): IndexEntry | undefined {
    return this.#entries.get(appId);
  }

  preview(appId: string): PreviewDocument | undefined {
    return this.#previews.get(appId);
  }

  /** The claim (phase-13 decision 3): a free name is minted its token once; a taken name is refused. */
  claim(name: string): Promise<ClaimResult> {
    return this.#serial(async () => {
      const findings = checkPublisherName(name);
      if (findings.length > 0) return {ok: false, kind: 'invalid', findings};
      if (this.#publishers.has(name)) {
        return {
          ok: false,
          kind: 'taken',
          findings: [`publisher name ${JSON.stringify(name)} is taken`],
        };
      }
      const token = mintPublisherToken();
      const record: PublisherRecord = {
        name,
        tokenHash: await hashPublisherToken(token),
        claimedAt: this.#now(),
        apps: [],
        catalogs: [],
      };
      await this.#writePublishers(new Map(this.#publishers).set(name, record));
      return {ok: true, publisher: name, token};
    });
  }

  /** The publisher a bearer token belongs to; undefined when no publisher holds its hash. */
  async publisherOf(token: string): Promise<PublisherRecord | undefined> {
    if (checkPublisherToken(token).length > 0) return undefined;
    const given = Buffer.from(await hashPublisherToken(token));
    for (const publisher of this.#publishers.values()) {
      const held = Buffer.from(publisher.tokenHash);
      if (given.length === held.length && timingSafeEqual(given, held)) return publisher;
    }
    return undefined;
  }

  /** Publish, in order (task-13.3 decision 16), by the named publisher. */
  publish(publisher: string, body: PublishBody): Promise<PublishAnswer> {
    return this.#serial(() => this.#publish(publisher, body));
  }

  /** Unpublish, the owner's (phase-13 decision 15): the app goes, the names stay. */
  unpublish(publisher: string, appId: string): Promise<UnpublishAnswer> {
    return this.#serial(async () => {
      const entry = this.#entries.get(appId);
      if (!entry) {
        return {
          ok: false,
          kind: 'not-published',
          findings: [`app ${JSON.stringify(appId)} is not published`],
        };
      }
      if (entry.publisher !== publisher) {
        return {
          ok: false,
          kind: 'forbidden',
          findings: [
            `app id ${JSON.stringify(appId)} belongs to publisher ${JSON.stringify(entry.publisher)}`,
          ],
        };
      }
      await this.#store.removeApp(appId);
      this.#entries.delete(appId);
      this.#previews.delete(appId);
      this.#vectors.delete(appId);
      await this.#store.writeIndex(this.entries());
      await this.#dropUnnamed();
      return {ok: true, appId};
    });
  }

  /** Search (phase-13 decision 11): words in, every entry out with its score, in rank order. */
  async search(words: string): Promise<SearchResponse> {
    const [query] = await this.#deps.embedder.embed([words]);
    const candidates = this.entries().flatMap(entry => {
      const vector = this.#vectors.get(entry.appId);
      return vector ? [{entry, vector}] : [];
    });
    return {results: rank(query, candidates).map(({entry, score}) => ({entry, score}))};
  }

  /**
   * A report (phase-13 decision 14; task-13.3 decisions 10, 20): a nudge the marketplace verifies
   * itself — the live card refetched, the flag set on drift, cleared when covered, left as it was
   * when the card is unreachable or malformed. One refetch in flight per app id.
   */
  report(appId: string): Promise<void> {
    let pending = this.#reports.get(appId);
    if (!pending) {
      pending = this.#verify(appId).finally(() => this.#reports.delete(appId));
      this.#reports.set(appId, pending);
    }
    return pending;
  }

  async #verify(appId: string): Promise<void> {
    const entry = this.#entries.get(appId);
    if (!entry) return;
    let card: AgentCard;
    try {
      card = await this.#deps.fetchCard(entry.cardUrl);
    } catch {
      return;
    }
    if (typeof card.version !== 'string') return;
    const drift = aheadOfStore(entry, card);
    if (!drift.ok) return;
    await this.#serial(async () => {
      const current = this.#entries.get(appId);
      if (!current) return;
      const was = current.aheadOfStore;
      const now = drift.value;
      if (
        (was === undefined) === (now === undefined) &&
        (was === undefined ||
          (was.version === now?.version &&
            was.catalogIds.length === now?.catalogIds.length &&
            was.catalogIds.every((id, i) => now?.catalogIds[i] === id)))
      ) {
        return;
      }
      const {aheadOfStore: _dropped, ...rest} = current;
      const next: IndexEntry = now ? {...rest, aheadOfStore: {...now, seenAt: this.#now()}} : rest;
      await this.#store.writeEntry(next);
      this.#entries.set(appId, next);
      await this.#store.writeIndex(this.entries());
    });
  }

  async #publish(name: string, body: PublishBody): Promise<PublishAnswer> {
    const publisher = this.#publishers.get(name);
    if (!publisher) throw new Error(`unknown publisher ${JSON.stringify(name)}`);
    const {appId, cardUrl, catalogs, preview} = body;
    const previous = this.#entries.get(appId);
    const findings = [...checkAppId(appId)];
    const forbidden = (finding: string): PublishAnswer => ({
      ok: false,
      kind: 'forbidden',
      findings: [finding],
    });

    // The app id is owner-only (phase-13 decision 2): another's answers alone, before the fetch.
    const appOwner = this.#ownerOfApp(appId);
    if (appOwner !== undefined && appOwner !== name) {
      return forbidden(
        `app id ${JSON.stringify(appId)} belongs to publisher ${JSON.stringify(appOwner)}`,
      );
    }

    let card: AgentCard | undefined;
    try {
      card = await this.#deps.fetchCard(cardUrl);
    } catch (err) {
      findings.push(`the card at ${cardUrl} could not be fetched: ${(err as Error).message}`);
    }
    if (card) {
      if (typeof card.version !== 'string' || card.version === '') {
        findings.push("the card has no version: the card's `version` is the app's version");
      }
      if (typeof card.description !== 'string') findings.push('the card has no description');
    }

    let declared: string[] = [];
    let declarationRead = false;
    if (card) {
      const read = readSupportedCatalogIds(card);
      if (read.ok) {
        declared = read.value;
        declarationRead = true;
      } else {
        findings.push(...read.errors.map(e => `the card's ${e}`));
      }
    }
    // A catalog id is owner-only (phase-13 decision 5): another's on the card answers alone,
    // whether or not an artifact was handed for it.
    for (const id of declared) {
      const owner = this.#ownerOfCatalog(id);
      if (owner !== undefined && owner !== name) {
        return forbidden(
          `catalog ${JSON.stringify(id)} belongs to publisher ${JSON.stringify(owner)}`,
        );
      }
    }

    // From here every finding is collected, as install collects them.
    const gated: {index: number; artifact: GatedArtifact}[] = [];
    const handed: string[] = [];
    for (const [index, files] of catalogs.entries()) {
      const result = await gateArtifact(files, index);
      findings.push(...result.findings);
      if (result.catalogId !== undefined) handed.push(result.catalogId);
      if (result.artifact) gated.push({index, artifact: result.artifact});
    }
    for (const id of new Set(handed)) {
      const owner = this.#ownerOfCatalog(id);
      if (owner !== undefined && owner !== name) {
        return forbidden(
          `catalog ${JSON.stringify(id)} belongs to publisher ${JSON.stringify(owner)}`,
        );
      }
    }
    const counted = new Map<string, number>();
    for (const id of handed) counted.set(id, (counted.get(id) ?? 0) + 1);
    for (const [id, count] of counted) {
      if (count > 1) findings.push(`two artifacts were handed for catalog ${JSON.stringify(id)}`);
      if (CLIENT_CATALOG_IDS.includes(id)) {
        findings.push(
          `catalog ${JSON.stringify(id)} is provided by the client: no artifact may be handed for it`,
        );
      }
    }

    // Coverage, a held row the publisher owns counting as covered (phase-13 decision 5).
    const held = this.#heldRows();
    const ownedHeld = publisher.catalogs.filter(id => held.has(id));
    if (declarationRead) {
      findings.push(
        ...coverageErrors(
          checkCoverage(declared, [...counted.keys()], [...PUBLIC_CATALOG_IDS, ...ownedHeld]),
        ),
      );
    }

    // A build moving a held row must be an additive evolution of the held schema (decision 7).
    for (const {index, artifact} of gated) {
      const id = artifact.descriptor.catalogId;
      const heldId = held.get(id);
      if (heldId === undefined || heldId === artifact.id) continue;
      const heldSchema = await this.#schemaOfHeld(heldId);
      const next = parseJson(artifact.files.get(artifact.descriptor.schema));
      if (heldSchema && next) {
        findings.push(
          ...checkAdditiveEvolution(heldSchema, next as A2uiCatalogSchema).map(
            e => `catalog artifact ${index + 1} (${id}): ${e}`,
          ),
        );
      }
    }

    // The card-version rule (task-13.3 decision 5).
    if (card && previous && typeof card.version === 'string') {
      if (card.version === previous.card.version) {
        if (!sameCard(card, previous.card)) {
          findings.push(
            `the card changed, but version ${JSON.stringify(card.version)} is already published: a changed card carries a version this app id has never published`,
          );
        }
      } else if (previous.versions.includes(card.version)) {
        findings.push(
          `version ${JSON.stringify(card.version)} was published before and moved past: the published versions are ${previous.versions.join(', ')}`,
        );
      }
    }

    // The preview rule (task-13.3 decisions 7, 8).
    const signIn = card !== undefined && requiresSignIn(card);
    if (card && signIn && !preview) {
      findings.push(
        'the card requires sign-in: publish needs the preview `stellify preview` captures with your own credential',
      );
    }
    if (card && !signIn && preview) {
      findings.push(
        "a preview is only taken for an app whose card requires sign-in: the marketplace captured this app's paint itself",
      );
    }
    if (card && signIn && preview) {
      if (preview.appId !== appId) {
        findings.push(
          `the preview is for app ${JSON.stringify(preview.appId)}, not ${JSON.stringify(appId)}`,
        );
      }
      if (preview.version !== card.version) {
        findings.push(
          `the preview was captured at version ${JSON.stringify(preview.version)}, the card is at ${JSON.stringify(card.version)}`,
        );
      }
      if (preview.capturedBy !== 'publisher') {
        findings.push('a handed preview is captured by the publisher');
      }
    }
    if (findings.length > 0 || !card) return {ok: false, kind: 'refused', findings};

    // The smoke test (phase-13 decisions 12, 13; task-13.3 decisions 6, 17).
    const entitlement = entitlementOf(declared);
    const schemas = await this.#schemasFor(declared, gated, held);
    const check = {entitlement, schemaFor: (id: string) => schemas.get(id)};
    const words = smokeWords(card);
    const seen = await this.#deps.smoke({
      card,
      entitlement,
      words,
      timeoutMs: this.#deps.smokeTimeoutMs,
    });
    let stored: PreviewDocument | undefined;
    if (signIn && preview) {
      findings.push(...judgeSignIn(seen, card));
      findings.push(...checkPaint(preview.messages, check));
      stored = preview;
    } else {
      const judged = judgePaint(seen);
      if ('findings' in judged) {
        findings.push(...judged.findings);
      } else {
        findings.push(...checkPaint(judged.messages, check));
        stored = {
          appId,
          version: card.version,
          words,
          messages: judged.messages,
          capturedBy: 'marketplace',
          capturedAt: this.#now(),
        };
      }
    }
    if (findings.length > 0 || !stored) return {ok: false, kind: 'refused', findings};

    // The commit.
    const notes: string[] = [];
    const [vector] = await this.#deps.embedder.embed([corpusDoc(card)]);
    for (const {artifact} of gated) await this.#store.writeArtifact(artifact.id, artifact.files);
    const next = new Map(this.#publishers);
    const owned: PublisherRecord = {
      ...publisher,
      apps: [...publisher.apps],
      catalogs: [...publisher.catalogs],
    };
    if (!owned.apps.includes(appId)) {
      owned.apps.push(appId);
      notes.push(`app id ${JSON.stringify(appId)} is now ${name}'s`);
    }
    for (const {artifact} of gated) {
      const id = artifact.descriptor.catalogId;
      if (!owned.catalogs.includes(id)) {
        owned.catalogs.push(id);
        notes.push(`catalog ${JSON.stringify(id)} is now ${name}'s`);
      }
    }
    next.set(name, owned);

    const rows: Record<string, string> = {};
    for (const id of declared) {
      if (PUBLIC_CATALOG_IDS.includes(id)) continue;
      const own = gated.find(g => g.artifact.descriptor.catalogId === id);
      if (own) {
        rows[id] = own.artifact.id;
      } else {
        rows[id] = held.get(id)!;
        notes.push(`catalog ${JSON.stringify(id)}: the held build counts as covered`);
      }
    }
    // A build moving a held row moves it for every app of the publisher naming the id (decision 5).
    const entries = new Map(this.#entries);
    const changed = new Set<string>();
    for (const {artifact} of gated) {
      const id = artifact.descriptor.catalogId;
      const from = held.get(id);
      if (from === undefined || from === artifact.id) continue;
      const followers: string[] = [];
      for (const entry of entries.values()) {
        if (entry.appId === appId || entry.catalogs[id] !== from) continue;
        entries.set(entry.appId, {...entry, catalogs: {...entry.catalogs, [id]: artifact.id}});
        changed.add(entry.appId);
        followers.push(entry.appId);
      }
      notes.push(
        `catalog ${JSON.stringify(id)} moved to a new build${followers.length > 0 ? `, followed by: ${followers.join(', ')}` : ''}`,
      );
    }
    const ids = Object.keys(rows);
    const retiredNow = previous ? retiredLines(Object.keys(previous.catalogs), ids) : [];
    for (const id of retiredNow) notes.push(`catalog ${JSON.stringify(id)} retired for ${appId}`);
    const retired = [...new Set([...(previous?.retired ?? []), ...retiredNow])].filter(
      id => !ids.includes(id),
    );
    const cardChanged = previous !== undefined && card.version !== previous.card.version;
    const entry: IndexEntry = {
      appId,
      publisher: name,
      cardUrl,
      card: card as unknown as PublishedCard,
      catalogs: rows,
      versions: previous
        ? cardChanged
          ? [...previous.versions, card.version]
          : previous.versions
        : [card.version],
      publishedAt: this.#now(),
      retired,
    };
    entries.set(appId, entry);

    await this.#store.writeEntry(entry);
    for (const id of changed) await this.#store.writeEntry(entries.get(id)!);
    await this.#store.writePreview(stored);
    await this.#writePublishers(next);
    this.#entries = entries;
    this.#previews.set(appId, stored);
    this.#vectors.set(appId, vector);
    for (const {artifact} of gated) this.#descriptors.set(artifact.id, artifact.descriptor);
    await this.#store.writeIndex(this.entries());
    await this.#dropUnnamed();
    return {
      ok: true,
      appId,
      version: card.version,
      summary: publishSummary(previous, entry),
      notes,
    };
  }

  #serial<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.#queue.then(operation, operation);
    this.#queue = run.catch(() => {});
    return run;
  }

  #now(): string {
    return (this.#deps.now?.() ?? new Date()).toISOString();
  }

  async #writePublishers(next: Map<string, PublisherRecord>): Promise<void> {
    await this.#store.writePublishers([...next.values()]);
    this.#publishers = next;
  }

  #ownerOfApp(appId: string): string | undefined {
    for (const p of this.#publishers.values()) if (p.apps.includes(appId)) return p.name;
    return undefined;
  }

  #ownerOfCatalog(catalogId: string): string | undefined {
    for (const p of this.#publishers.values()) if (p.catalogs.includes(catalogId)) return p.name;
    return undefined;
  }

  /** The rows: every catalog id some entry names, at its one artifact. */
  #heldRows(): Map<string, string> {
    const rows = new Map<string, string>();
    for (const entry of this.#entries.values()) {
      for (const [id, artifact] of Object.entries(entry.catalogs)) rows.set(id, artifact);
    }
    return rows;
  }

  /** Lets go of every row nothing names (phase-13 decisions 8, 15). */
  async #dropUnnamed(): Promise<void> {
    const named = new Set<string>();
    for (const entry of this.#entries.values()) {
      for (const artifact of Object.values(entry.catalogs)) named.add(artifact);
    }
    await this.#store.removeArtifactsExcept(named);
    for (const id of [...this.#descriptors.keys()])
      if (!named.has(id)) this.#descriptors.delete(id);
  }

  async #schemaOfHeld(artifactId: string): Promise<A2uiCatalogSchema | undefined> {
    const descriptor = this.#descriptors.get(artifactId);
    if (!descriptor) return undefined;
    const bytes = await this.#store.readArtifactFile(artifactId, descriptor.schema);
    return parseJson(bytes) as A2uiCatalogSchema | undefined;
  }

  /** Each entitled catalog's schema: the basic catalog's, a handed artifact's, else the held row's. */
  async #schemasFor(
    declared: readonly string[],
    gated: readonly {artifact: GatedArtifact}[],
    held: ReadonlyMap<string, string>,
  ): Promise<Map<string, A2uiCatalogSchema>> {
    const schemas = new Map<string, A2uiCatalogSchema>();
    schemas.set(BASIC_CATALOG_ID, BASIC_CATALOG_SCHEMA as A2uiCatalogSchema);
    for (const id of declared) {
      if (schemas.has(id)) continue;
      const own = gated.find(g => g.artifact.descriptor.catalogId === id);
      const schema = own
        ? (parseJson(own.artifact.files.get(own.artifact.descriptor.schema)) as A2uiCatalogSchema)
        : held.has(id)
          ? await this.#schemaOfHeld(held.get(id)!)
          : undefined;
      if (schema) schemas.set(id, schema);
    }
    return schemas;
  }
}

/** Whether the card requires sign-in (SPEC §8): an OR of ANDs, an empty requirement meaning none. */
export function requiresSignIn(card: {security?: unknown}): boolean {
  const security = card.security;
  return (
    Array.isArray(security) &&
    security.length > 0 &&
    security.every(
      alternative =>
        typeof alternative === 'object' &&
        alternative !== null &&
        Object.keys(alternative as object).length > 0,
    )
  );
}

/** The judgement over a sign-in agent's answer to the request sent with no credential. */
function judgeSignIn(seen: SmokeObservation, card: AgentCard): string[] {
  switch (seen.kind) {
    case 'unauthorized':
      return checkSignInAnswer({httpStatus: 401}, card);
    case 'ended':
      return checkSignInAnswer({taskState: seen.state, data: seen.data}, card);
    case 'unfinished':
      return [NEVER_FINISHED];
    case 'error':
      return [`the smoke request failed: ${seen.message}`];
  }
}

/** The judgement over an open agent's answer: its paint, or why there is none. */
function judgePaint(seen: SmokeObservation): {findings: string[]} | {messages: A2uiMessage[]} {
  switch (seen.kind) {
    case 'unauthorized':
      return {findings: ['the agent answered 401, but its card requires no sign-in']};
    case 'error':
      return {findings: [`the smoke request failed: ${seen.message}`]};
    case 'unfinished':
      return {findings: [NEVER_FINISHED]};
    case 'ended':
      if (FAILED_STATES.has(seen.state)) {
        return {
          findings: [
            `the agent ended the task as ${seen.state}${seen.text ? `: ${seen.text}` : ''}`,
          ],
        };
      }
      return {messages: seen.messages};
  }
}

function parseJson(bytes: Uint8Array | undefined): unknown {
  if (!bytes) return undefined;
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return undefined;
  }
}

/** Two cards the same: equal as JSON, key order ignored. */
function sameCard(a: unknown, b: unknown): boolean {
  return canonical(a) === canonical(b);
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    return `{${Object.keys(value)
      .sort()
      .map(k => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

/** An artifact id as a line names it: its digest's first characters. */
const shortId = (id: string) => `${id.slice(0, 'sha256-'.length + 8)}…`;

/**
 * What a publish did, in one line: published or republished; the card's version, old → new when
 * it moved; each catalog's artifact, old → new when it moved, an id gone or new named in full.
 */
export function publishSummary(previous: IndexEntry | undefined, next: IndexEntry): string {
  const version =
    previous && previous.card.version !== next.card.version
      ? `${previous.card.version} → ${next.card.version}`
      : next.card.version;
  const parts = [`${previous ? 'republished' : 'published'} ${next.appId}`, `card ${version}`];
  const before = previous?.catalogs ?? {};
  const ids = [...new Set([...Object.keys(before), ...Object.keys(next.catalogs)])];
  if (ids.length === 0) parts.push('basic catalog');
  for (const id of ids) {
    const was = before[id];
    const now = next.catalogs[id];
    if (was !== undefined && now !== undefined) {
      parts.push(
        was === now ? `catalog ${shortId(now)}` : `catalog ${shortId(was)} → ${shortId(now)}`,
      );
    } else if (now !== undefined) {
      parts.push(previous ? `catalog ${id} new at ${shortId(now)}` : `catalog ${shortId(now)}`);
    } else {
      parts.push(`catalog ${id} gone`);
    }
  }
  return parts.join(' · ');
}
