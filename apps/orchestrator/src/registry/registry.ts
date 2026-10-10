import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import type {AgentCard} from '@a2a-js/sdk';
import {
  aheadOfStore,
  ARTIFACT_DESCRIPTOR_FILE,
  BASIC_CATALOG_ID,
  basicCatalogOptions,
  type CardWithExtensions,
  type Drift,
  validateArtifactDescriptor,
  catalogOptions,
  mergeCatalogOptions,
  type A2uiCatalogSchema,
  type CatalogOptions,
  checkAdditiveEvolution,
  checkAppId,
  checkCoverage,
  coverageErrors,
  entitlementOf,
  readSupportedCatalogIds,
  type ArtifactDescriptor,
  gateArtifact,
  type GatedArtifact,
  unnamedRows,
} from '@a2uiverse/sdk';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import {corpusDoc, type Embedder} from '@a2uiverse/embedder';
import type {MarketplaceClient} from './marketplace.js';
import {readTree, RegistryStore, type ArtifactFiles} from './store.js';
import {
  SHELL_SOURCE_ID,
  type AppRecord,
  type CatalogRow,
  type InstalledRecord,
  type InstallSource,
} from './types.js';

/** How the registry fetches a card from its full URL; injected so tests need no network. */
export type ResolveCard = (cardUrl: string) => Promise<AgentCard>;

/** An agent the Router can rank: record + this run's card + corpus vector. */
export interface RoutableApp {
  record: AppRecord;
  card: AgentCard;
  vector: number[];
}

/** The platform's display name, as its record and its attribution carry it. */
export const PLATFORM_DISPLAY_NAME = 'A2UIVerse';

/** The catalogs the client provides: table rows with no artifact, never persisted (task-11.4 decision 7). */
export const CLIENT_CATALOG_IDS: readonly string[] = [BASIC_CATALOG_ID, SHELL_CATALOG_ID];

/** The note install gives an app whose card declares no catalogs (task-11.2 decision 8). */
export const BASIC_ONLY_NOTE = 'the card declares no catalogs: it paints in the basic catalog only';

/**
 * One registry change as the journal records it (task-11.4 decision 15), with where it came by
 * (task-13.5 decision 6): the path of an install, the record's source for an uninstall.
 */
export interface RegistryJournalEntry {
  operation: 'install' | 'install-over' | 'uninstall';
  appId: string;
  cardUrl?: string;
  catalogs: {catalogId: string; artifact: string}[];
  outcome: 'installed' | 'uninstalled' | 'refused';
  findings?: string[];
  source: InstallSource;
  /** The other installed apps whose row this install moved (task-13.5 decision 6). */
  followed?: string[];
  /** The update check installed a newer build over the app by itself (task-13.5 decision 9). */
  automatic?: true;
}

/** A held row moved to a new hash by an install, and the other apps that followed it. */
export interface RowMove {
  catalogId: string;
  from: string;
  to: string;
  followed: string[];
}

export interface RegistryJournal {
  registry(entry: RegistryJournalEntry): Promise<void>;
}

export interface InstallRequest {
  appId: string;
  /** The card's full URL: fetched now, stored, fetched again at every startup. */
  cardUrl: string;
  /** One artifact's files per catalog handed, each with its descriptor. */
  catalogs: readonly ArtifactFiles[];
  /** Where the install came by (task-13.5 decision 3); a local pack unless said otherwise. */
  source?: InstallSource;
  /** The card already fetched from `cardUrl` by the marketplace path, so it is fetched once. */
  card?: AgentCard;
  /** An install the update check runs by itself (task-13.5 decision 9), journaled as such. */
  automatic?: boolean;
}

export type InstallResult =
  | {ok: true; appId: string; replaced: boolean; summary: string; notes: string[]}
  | {ok: false; findings: string[]};

export type UninstallResult = {ok: true; appId: string} | {ok: false; findings: string[]};

export interface RegistryDeps {
  stateDir: string;
  resolveCard: ResolveCard;
  embedder: Embedder;
  journal?: RegistryJournal;
  /** The orchestrator's own card, indexed under `shell` beside the installed apps. */
  platformCard?: AgentCard;
  /** The marketplace an install by id resolves through (task-13.5 decision 2). */
  marketplace?: MarketplaceClient;
}

/**
 * The installed apps and the catalog table (SPEC §10, task 11.4): the orchestrator's persisted
 * state, written only by install, uninstall and install-over, one operation at a time, each live at
 * once. Booted from alone; a fresh state directory is an empty registry, the platform's card the
 * only routable one.
 *
 * Two cards per app: the one stored at install, verbatim, which changes only through install-over,
 * and this run's, fetched at startup — the dispatch URL, the skills the Router indexes, the name the
 * Planner reads. An app whose card could not be fetched at startup stays installed and unroutable
 * for the run, named by its stored card.
 *
 * The platform's card is indexed under the reserved `shell` id with the same corpus document and
 * vector a vendor gets, so the Router ranks the platform like any app; the platform is not an
 * installed app: `list()` leaves it out, and nothing dispatches to it.
 */
export class Registry {
  readonly #deps: RegistryDeps;
  readonly #store: RegistryStore;
  #records = new Map<string, InstalledRecord>();
  readonly #descriptors = new Map<string, ArtifactDescriptor>();
  /** The options each artifact's schema declares, by artifact id: what the credential bar reads. */
  readonly #options = new Map<string, CatalogOptions>();
  /** This run's cards: null when the startup fetch failed; absent before it ran. */
  readonly #cards = new Map<string, AgentCard | null>();
  readonly #vectors = new Map<string, number[]>();
  readonly #platform: {record: AppRecord; card: AgentCard} | undefined;
  #queue: Promise<unknown> = Promise.resolve();
  readonly #uninstalled: ((appId: string) => Promise<void> | void)[] = [];

  constructor(deps: RegistryDeps) {
    this.#deps = deps;
    this.#store = new RegistryStore(deps.stateDir);
    const {platformCard} = deps;
    this.#platform = platformCard
      ? {
          record: {
            id: SHELL_SOURCE_ID,
            displayName: PLATFORM_DISPLAY_NAME,
            agentUrl: platformCard.url,
            catalogs: [],
            entitlement: [SHELL_CATALOG_ID],
          },
          card: platformCard,
        }
      : undefined;
  }

  /** Called after an app is uninstalled: the vault lets its accounts go (phase-12 decision 12). */
  onUninstalled(listener: (appId: string) => Promise<void> | void): void {
    this.#uninstalled.push(listener);
  }

  /** Where the artifacts' files are, each under its id — what the read routes serve. */
  get artifactsDir(): string {
    return this.#store.artifactsDir;
  }

  /** Reads the persisted registry, every artifact hashed again; throws on damage (task-11.4 decision 9). */
  async load(): Promise<void> {
    const {records, descriptors} = await this.#store.load();
    this.#records = new Map(records.map(record => [record.id, record]));
    this.#descriptors.clear();
    this.#options.clear();
    for (const [id, descriptor] of descriptors) {
      this.#descriptors.set(id, descriptor);
      const schema = await readFile(join(this.#store.artifactsDir, id, descriptor.schema));
      this.#options.set(id, optionsOf(schema));
    }
  }

  /**
   * The options a painter's catalog declares, per component: what the credential bar matches a
   * painted value against (task-12.7 decision 1) — the basic catalog's, or the catalog handed at
   * the app's install under that id. With no catalog id — a surface whose create the hub never
   * saw — every catalog of the app's, a component named alike in two taking both's options.
   */
  credentialOptions(app: AppRecord, catalogId: string | undefined): CatalogOptions {
    const handed = this.#records.get(app.id)?.catalogs ?? {};
    const of = (artifact: string | undefined) =>
      (artifact !== undefined ? this.#options.get(artifact) : undefined) ?? new Map();
    if (catalogId === BASIC_CATALOG_ID) return basicCatalogOptions();
    if (catalogId !== undefined) return of(handed[catalogId]);
    return mergeCatalogOptions([basicCatalogOptions(), ...Object.values(handed).map(of)]);
  }

  /**
   * The startup fetch (task-11.4 decision 8): every installed app's card from its stored URL, and
   * the corpus vectors of those fetched and of the platform. A failed fetch leaves the app
   * unroutable this run; it never throws.
   */
  async refreshCards(): Promise<void> {
    const records = [...this.#records.values()];
    const cards = await Promise.all(
      records.map(record => this.#fetchCard(record.cardUrl).catch(() => null)),
    );
    this.#cards.clear();
    this.#vectors.clear();
    const carded: {id: string; card: AgentCard}[] = [];
    records.forEach((record, i) => {
      this.#cards.set(record.id, cards[i]);
      if (cards[i]) carded.push({id: record.id, card: cards[i]});
    });
    if (this.#platform) {
      this.#cards.set(SHELL_SOURCE_ID, this.#platform.card);
      carded.push({id: SHELL_SOURCE_ID, card: this.#platform.card});
    }
    if (carded.length === 0) return;
    const vectors = await this.#deps.embedder.embed(carded.map(({card}) => corpusDoc(card)));
    carded.forEach(({id}, i) => this.#vectors.set(id, vectors[i]));
  }

  get(appId: string): AppRecord {
    const record = this.find(appId);
    if (!record) throw new Error(`Unknown app: ${appId}`);
    return record;
  }

  /** The app as this run reads it; undefined when it is not installed. */
  find(appId: string): AppRecord | undefined {
    if (appId === SHELL_SOURCE_ID) return this.#platform?.record;
    const record = this.#records.get(appId);
    return record ? this.#view(record) : undefined;
  }

  /** An app's display name, its id once it is no longer installed. */
  displayName(appId: string): string {
    return this.find(appId)?.displayName ?? appId;
  }

  /** The installed apps — the platform is not one. */
  list(): AppRecord[] {
    return [...this.#records.values()].map(record => this.#view(record));
  }

  /** The persisted records, as the read routes serve them. */
  installed(): InstalledRecord[] {
    return [...this.#records.values()];
  }

  /** This run's card: null when unreachable at startup, undefined before the fetch or unknown. */
  card(appId: string): AgentCard | null | undefined {
    return this.#cards.get(appId);
  }

  /** The card stored at install. */
  storedCard(appId: string): AgentCard | undefined {
    return this.#records.get(appId)?.card;
  }

  /** Apps the Router may rank — those with this run's card and a corpus vector — and the platform among them. */
  routable(): RoutableApp[] {
    const apps: RoutableApp[] = [];
    const records = [...this.list(), ...(this.#platform ? [this.#platform.record] : [])];
    for (const record of records) {
      const card = this.#cards.get(record.id);
      const vector = this.#vectors.get(record.id);
      if (card && vector) apps.push({record, card, vector});
    }
    return apps;
  }

  /** The catalog table: the client's catalogs, then each installed artifact once. */
  table(): CatalogRow[] {
    const rows: CatalogRow[] = CLIENT_CATALOG_IDS.map(catalogId => ({
      catalogId,
      provided: 'client',
    }));
    const held = new Map<string, string>();
    for (const record of this.#records.values()) {
      for (const [catalogId, artifact] of Object.entries(record.catalogs)) {
        held.set(catalogId, artifact);
      }
    }
    for (const [catalogId, artifact] of [...held].sort(([a], [b]) => (a < b ? -1 : 1))) {
      const entry = this.#descriptors.get(artifact)?.entry ?? 'index.js';
      rows.push({catalogId, artifact, entry});
    }
    return rows;
  }

  /** Install, or install-over when the id is held (task-11.4 decisions 2 to 6). */
  install(request: InstallRequest): Promise<InstallResult> {
    return this.#serial(() => this.#install(request));
  }

  /**
   * Install by app id alone, resolved through the marketplace (task-13.5 decisions 2, 4): the entry
   * read, the live card fetched from the URL it names, the Store-behind refusal when the card is
   * ahead of the entry, the artifacts' files the registry lacks fetched, then the same core as a
   * local install. `automatic` is the update check's own install of a newer build (decision 9).
   */
  installFromMarketplace(
    appId: string,
    options: {automatic?: boolean} = {},
  ): Promise<InstallResult> {
    return this.#serial(() => this.#installFromMarketplace(appId, options));
  }

  async #installFromMarketplace(
    appId: string,
    {automatic = false}: {automatic?: boolean},
  ): Promise<InstallResult> {
    const marketplace = this.#deps.marketplace;
    const operation = this.#records.has(appId) ? 'install-over' : 'install';
    const refuse = async (findings: string[], cardUrl?: string): Promise<InstallResult> => {
      await this.#journal({
        operation,
        appId,
        ...(cardUrl !== undefined ? {cardUrl} : {}),
        catalogs: [],
        outcome: 'refused',
        findings,
        source: 'marketplace',
        ...(automatic ? {automatic: true} : {}),
      });
      return {ok: false, findings};
    };
    const idFindings = checkAppId(appId);
    if (idFindings.length > 0) return refuse(idFindings);
    if (!marketplace) return refuse(['no marketplace is configured']);
    const looked = await marketplace.entry(appId);
    if (looked.kind === 'unreached') {
      return refuse([
        `the marketplace at ${marketplace.url} could not be reached: ${looked.reason}`,
      ]);
    }
    if (looked.kind === 'not-published') {
      return refuse([
        `app ${JSON.stringify(appId)} is not published on the marketplace at ${marketplace.url}`,
      ]);
    }
    if (looked.kind === 'malformed') {
      return refuse([
        `the marketplace's entry for ${JSON.stringify(appId)} is malformed: ${looked.errors.join('; ')}`,
      ]);
    }
    const {entry} = looked;
    let card: AgentCard;
    try {
      card = await this.#fetchCard(entry.cardUrl);
    } catch (err) {
      return refuse(
        [`the card at ${entry.cardUrl} could not be fetched: ${(err as Error).message}`],
        entry.cardUrl,
      );
    }
    const drift = aheadOfStore(entry, card as CardWithExtensions & {version: string});
    if (!drift.ok)
      return refuse(
        drift.errors.map(e => `the card's ${e}`),
        entry.cardUrl,
      );
    if (drift.value) {
      // Drift seen from a live card is what the marketplace wants to hear about (decision 10).
      void marketplace.report(appId).catch((err: unknown) => {
        console.error(`registry: the report of ${appId} failed:`, (err as Error).message);
      });
      return refuse([storeBehind(appId, drift.value)], entry.cardUrl);
    }
    const catalogs: ArtifactFiles[] = [];
    try {
      for (const artifactId of Object.values(entry.catalogs)) {
        catalogs.push(await this.#resolveArtifact(marketplace, artifactId));
      }
    } catch (err) {
      return refuse([(err as Error).message], entry.cardUrl);
    }
    return this.#install({
      appId,
      cardUrl: entry.cardUrl,
      catalogs,
      source: 'marketplace',
      card,
      automatic,
    });
  }

  /**
   * An artifact's files from the marketplace, only those the registry lacks (phase-13 decision 9):
   * a held artifact id is read from disk whole; otherwise its descriptor is fetched and each file
   * whose hash a held artifact already has is copied from it, the rest fetched.
   */
  async #resolveArtifact(
    marketplace: MarketplaceClient,
    artifactId: string,
  ): Promise<ArtifactFiles> {
    if (this.#descriptors.has(artifactId)) {
      return readTree(join(this.#store.artifactsDir, artifactId));
    }
    const descriptorBytes = await marketplace.descriptor(artifactId);
    let parsed: unknown;
    try {
      parsed = JSON.parse(new TextDecoder().decode(descriptorBytes));
    } catch (err) {
      throw new Error(
        `the marketplace's artifact ${artifactId} has no readable descriptor: not JSON (${(err as Error).message})`,
      );
    }
    const descriptor = validateArtifactDescriptor(parsed);
    if (!descriptor.ok) {
      throw new Error(
        `the marketplace's artifact ${artifactId} has no readable descriptor: ${descriptor.errors.join('; ')}`,
      );
    }
    const held = this.#heldFiles();
    const files = new Map<string, Uint8Array>([[ARTIFACT_DESCRIPTOR_FILE, descriptorBytes]]);
    for (const [path, hash] of Object.entries(descriptor.value.files).sort(([a], [b]) =>
      a < b ? -1 : 1,
    )) {
      const have = held.get(hash);
      files.set(
        path,
        have
          ? new Uint8Array(
              await readFile(join(this.#store.artifactsDir, have.artifactId, have.path)),
            )
          : await marketplace.file(artifactId, path),
      );
    }
    return files;
  }

  /** Every file the held artifacts list, by its hash: what an install by id need not fetch. */
  #heldFiles(): Map<string, {artifactId: string; path: string}> {
    const held = new Map<string, {artifactId: string; path: string}>();
    for (const [artifactId, descriptor] of this.#descriptors) {
      for (const [path, hash] of Object.entries(descriptor.files)) {
        if (!held.has(hash)) held.set(hash, {artifactId, path});
      }
    }
    return held;
  }

  /** Uninstall: the record goes, and each artifact no installed card names any more (decision 6). */
  uninstall(appId: string): Promise<UninstallResult> {
    return this.#serial(() => this.#uninstall(appId));
  }

  #serial<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.#queue.then(operation, operation);
    this.#queue = run.catch(() => {});
    return run;
  }

  async #install({
    appId,
    cardUrl,
    catalogs,
    source = 'local',
    card: fetched,
    automatic = false,
  }: InstallRequest): Promise<InstallResult> {
    const previous = this.#records.get(appId);
    const operation = previous ? 'install-over' : 'install';
    const findings = [...checkAppId(appId)];
    const journalExtra = automatic ? {automatic: true as const} : {};

    let card: AgentCard | undefined = fetched;
    if (!card) {
      try {
        card = await this.#fetchCard(cardUrl);
      } catch (err) {
        findings.push(`the card at ${cardUrl} could not be fetched: ${(err as Error).message}`);
      }
    }

    const gated: GatedArtifact[] = [];
    const handed: string[] = [];
    for (const [index, files] of catalogs.entries()) {
      const result = await gateArtifact(files, index);
      findings.push(...result.findings);
      if (result.catalogId !== undefined) handed.push(result.catalogId);
      if (result.artifact) gated.push(result.artifact);
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

    let declared: string[] = [];
    if (card) {
      const read = readSupportedCatalogIds(card);
      if (read.ok) {
        declared = read.value;
        findings.push(...coverageErrors(checkCoverage(declared, [...counted.keys()])));
      } else {
        findings.push(...read.errors.map(e => `the card's ${e}`));
      }
    }

    // A held id at a new hash moves the row and every other app naming it follows (task-13.5
    // decision 5); the move is checked as an additive evolution of the build they render in.
    const moves: RowMove[] = [];
    for (const artifact of gated) {
      const catalogId = artifact.descriptor.catalogId;
      const followers = [...this.#records.values()].filter(
        record =>
          record.id !== appId &&
          record.catalogs[catalogId] !== undefined &&
          record.catalogs[catalogId] !== artifact.id,
      );
      if (followers.length === 0) continue;
      const from = followers[0].catalogs[catalogId];
      const followed = followers.map(record => record.id).sort();
      const held = await this.#schemaOf(from);
      const next = parseSchema(artifact.files.get(artifact.descriptor.schema));
      const problems = held && next ? checkAdditiveEvolution(held, next) : [];
      if (problems.length > 0) {
        findings.push(
          `catalog ${JSON.stringify(catalogId)} at its new build is not an additive evolution of the build ${followed.join(', ')} render${followed.length === 1 ? 's' : ''} in: ${problems.join('; ')}`,
        );
      } else {
        moves.push({catalogId, from, to: artifact.id, followed});
      }
    }
    const followed = [...new Set(moves.flatMap(move => move.followed))].sort();

    const journaled = gated.map(a => ({catalogId: a.descriptor.catalogId, artifact: a.id}));
    if (findings.length > 0 || !card) {
      await this.#journal({
        operation,
        appId,
        cardUrl,
        catalogs: journaled,
        outcome: 'refused',
        findings,
        source,
        ...journalExtra,
      });
      return {ok: false, findings};
    }

    const [vector] = await this.#deps.embedder.embed([corpusDoc(card)]);
    for (const artifact of gated) await this.#store.writeArtifact(artifact.id, artifact.files);
    const record: InstalledRecord = {
      id: appId,
      cardUrl,
      card,
      catalogs: Object.fromEntries(journaled.map(({catalogId, artifact}) => [catalogId, artifact])),
      entitlement: entitlementOf([...counted.keys()]),
      installedAt: new Date().toISOString(),
      source,
    };
    const next = new Map(this.#records);
    next.set(appId, record);
    for (const move of moves) {
      for (const id of move.followed) {
        const follower = next.get(id)!;
        next.set(id, {...follower, catalogs: {...follower.catalogs, [move.catalogId]: move.to}});
      }
    }
    for (const artifact of gated) {
      this.#descriptors.set(artifact.id, artifact.descriptor);
      const schema = artifact.files.get(artifact.descriptor.schema);
      if (schema) this.#options.set(artifact.id, optionsOf(schema));
    }
    await this.#commit(next);
    this.#cards.set(appId, card);
    this.#vectors.set(appId, vector);
    await this.#journal({
      operation,
      appId,
      cardUrl,
      catalogs: journaled,
      outcome: 'installed',
      source,
      ...(followed.length > 0 ? {followed} : {}),
      ...journalExtra,
    });
    return {
      ok: true,
      appId,
      replaced: operation === 'install-over',
      summary: installSummary(previous, record, moves),
      notes: declared.length === 0 ? [BASIC_ONLY_NOTE] : [],
    };
  }

  async #uninstall(appId: string): Promise<UninstallResult> {
    const record = this.#records.get(appId);
    if (!record) {
      const findings = [`app ${JSON.stringify(appId)} is not installed`];
      await this.#journal({
        operation: 'uninstall',
        appId,
        catalogs: [],
        outcome: 'refused',
        findings,
        source: 'local',
      });
      return {ok: false, findings};
    }
    const next = new Map(this.#records);
    next.delete(appId);
    await this.#commit(next);
    this.#cards.delete(appId);
    this.#vectors.delete(appId);
    const catalogs = Object.entries(record.catalogs).map(([catalogId, artifact]) => ({
      catalogId,
      artifact,
    }));
    await this.#journal({
      operation: 'uninstall',
      appId,
      catalogs,
      outcome: 'uninstalled',
      source: record.source,
    });
    for (const listener of this.#uninstalled) {
      try {
        await listener(appId);
      } catch (err) {
        console.error(`registry: an uninstall listener failed for ${appId}:`, err);
      }
    }
    return {ok: true, appId};
  }

  /**
   * Persists the records, then lets go of every artifact none of them names any more — through the
   * sdk's unnamed-rows function, the registry's half of the retirement rule (task-13.5 decision 5):
   * an uninstalled app's artifacts, and the old build of a moved row.
   */
  async #commit(next: Map<string, InstalledRecord>): Promise<void> {
    const before: Record<string, string> = {};
    for (const record of this.#records.values()) Object.assign(before, record.catalogs);
    const records = [...next.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
    await this.#store.writeRecords(records);
    this.#records = new Map(records.map(record => [record.id, record]));
    const {artifactIds: gone} = unnamedRows(
      before,
      records.map(record => record.catalogs),
    );
    for (const id of gone) {
      this.#descriptors.delete(id);
      this.#options.delete(id);
    }
    // The disk mirrors the descriptors held: every named artifact, and nothing else.
    await this.#store.removeArtifactsExcept(new Set(this.#descriptors.keys()));
  }

  /** A held artifact's catalog schema, read from disk; undefined when it does not parse. */
  async #schemaOf(artifactId: string): Promise<A2uiCatalogSchema | undefined> {
    const descriptor = this.#descriptors.get(artifactId);
    if (!descriptor) return undefined;
    try {
      return parseSchema(
        new Uint8Array(
          await readFile(join(this.#store.artifactsDir, artifactId, descriptor.schema)),
        ),
      );
    } catch {
      return undefined;
    }
  }

  async #fetchCard(cardUrl: string): Promise<AgentCard> {
    const card = await this.#deps.resolveCard(cardUrl);
    if (typeof card !== 'object' || card === null) throw new Error('not an agent card');
    if (typeof card.url !== 'string' || typeof card.name !== 'string') {
      throw new Error('not an agent card: no url or name');
    }
    return card;
  }

  async #journal(entry: RegistryJournalEntry): Promise<void> {
    await this.#deps.journal?.registry(entry);
  }

  #view(record: InstalledRecord): AppRecord {
    const card = this.#cards.get(record.id) ?? record.card;
    return {
      id: record.id,
      displayName: card.name || record.id,
      agentUrl: card.url,
      catalogs: Object.keys(record.catalogs),
      entitlement: [...record.entitlement],
    };
  }
}

/**
 * The refusal of an install by id when the live card is ahead of the Store (phase-13 decision 14,
 * task-13.5 decision 4): the Store cannot hand what the card now declares; never that the app is
 * broken.
 */
export function storeBehind(appId: string, drift: Drift): string {
  const parts: string[] = [];
  if (drift.catalogIds.length > 0) {
    parts.push(`catalog${drift.catalogIds.length > 1 ? 's' : ''} ${drift.catalogIds.join(', ')}`);
  }
  if (drift.version !== undefined) parts.push(`version ${drift.version}`);
  return `the Store is behind ${appId}: its card now declares ${parts.join(' and ')} that the Store does not have yet; the publisher is told at their next contact with the Store, and the install can be tried again once they have published`;
}

/** An artifact id as a line names it: its digest's first characters. */
const shortId = (id: string) => `${id.slice(0, 'sha256-'.length + 8)}…`;

/**
 * What an install did, in one line for whoever reads the command's or the launcher's output
 * (task-11.8 decision 22): installed, updated or reinstalled; the card's version, old → new when it
 * moved; each catalog's artifact, old → new when it moved, an id gone or new named in full; a row
 * moved under other installed apps names them as having followed (task-13.5 decision 6).
 */
export function installSummary(
  previous: InstalledRecord | undefined,
  next: InstalledRecord,
  moves: readonly RowMove[] = [],
): string {
  const version = (record: InstalledRecord) => record.card.version ?? '?';
  const before = previous?.catalogs ?? {};
  const parts: string[] = [];
  parts.push(
    previous && version(previous) !== version(next)
      ? `card ${version(previous)} → ${version(next)}`
      : `card ${version(next)}`,
  );
  if (previous) {
    for (const [catalogId, artifact] of Object.entries(before)) {
      if (!(catalogId in next.catalogs))
        parts.push(`catalog ${catalogId} ${shortId(artifact)} gone`);
    }
  }
  for (const [catalogId, artifact] of Object.entries(next.catalogs)) {
    const old = before[catalogId];
    const move = moves.find(m => m.catalogId === catalogId);
    if (move) {
      parts.push(
        `catalog ${shortId(move.from)} → ${shortId(move.to)} · ${move.followed.join(', ')} followed`,
      );
    } else if (!previous || old === artifact) parts.push(`catalog ${shortId(artifact)}`);
    else if (old === undefined) parts.push(`catalog ${catalogId} ${shortId(artifact)} new`);
    else parts.push(`catalog ${shortId(old)} → ${shortId(artifact)}`);
  }
  const changed =
    previous !== undefined &&
    (JSON.stringify(previous.card) !== JSON.stringify(next.card) ||
      JSON.stringify(Object.entries(before).sort()) !==
        JSON.stringify(Object.entries(next.catalogs).sort()));
  const verb = !previous ? 'installed' : changed ? 'updated' : 'reinstalled';
  return [
    `${verb} ${next.id}`,
    ...(previous && !changed ? ['nothing changed'] : []),
    ...parts,
  ].join(' · ');
}

/** A gated schema's declared options; a schema that does not parse declares none. */
function optionsOf(bytes: Uint8Array): CatalogOptions {
  const schema = parseSchema(bytes);
  return schema ? catalogOptions(schema) : new Map();
}

/** A schema file's content as a catalog schema; undefined when it is missing or does not parse. */
function parseSchema(bytes: Uint8Array | undefined): A2uiCatalogSchema | undefined {
  if (!bytes) return undefined;
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as A2uiCatalogSchema;
  } catch {
    return undefined;
  }
}
