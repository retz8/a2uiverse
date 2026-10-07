import {appendFile, mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import type {Message} from '@a2a-js/sdk';
import type {DispatchOutcome, DispatchRecord} from '../agentsPool/types.js';
import type {Embedder} from '../embedder/types.js';
import type {RegistryJournal, RegistryJournalEntry} from '../registry/registry.js';
import type {SignInRecord} from '../vault/vault.js';
import {describe} from './descriptor.js';
import {emptyTouches, mergeTouches, type SurfaceTouches} from './surfaces.js';
import type {JournalEntry, PlanRecord, StepRecord, SynthesisRecord} from './types.js';

export interface OpenTurn {
  turnId: string;
  clientContextId: string;
  message: Message;
  /** The dispatched source, when the turn has exactly one (action turns). */
  source?: string;
}

export interface JournalTurn {
  plan(record: PlanRecord): void;
  synthesis(record: SynthesisRecord): void;
  dispatched(record: DispatchRecord): void;
  surfaces(touches: SurfaceTouches): void;
  deadlines(deadlines: {softMs: number; capMs: number}): void;
  /** The user closed the composition while the turn ran. */
  compositionClosed(): void;
  /** A press: the turn whose composition it acts on. */
  composition(turnId: string): void;
  /** A press refused, and why. */
  refused(reason: string): void;
  /** A step in a fragment's history: where it landed and what it cost. */
  step(record: StepRecord): void;
  /**
   * Appends the entry, once: a second close does nothing. A turn still listening past its final
   * closes when the listening ends, so what arrives after the hard cap is on its line. Never
   * throws: a journal failure must not fail the turn.
   */
  close(outcome: DispatchOutcome): Promise<void>;
}

/** A registry change as its journal line carries it. */
export type RegistryLine = {kind: 'registry'; at: string} & RegistryJournalEntry;

/** A sign-in fact as its journal line carries it (task-12.5 decision 11): never a secret. */
export type SignInLine = {kind: 'signIn'; at: string} & SignInRecord;

/** How many closed turns a composition's ring keeps. */
export const RECENT_TURNS = 5;

/**
 * Append-only JSON lines in the orchestrator's state directory, plus an in-memory ring of the
 * last few entries per context, the same entry the file gets. The Planner's
 * recent-turns reader no longer reads it (task-9.3 decision 2: the ancestry is read from the
 * compositions); it stays for the journal's own callers. Nothing is seeded from the file — a restart
 * starts empty, as the composition state does.
 */
export class IntentJournal implements RegistryJournal {
  readonly #filePath: string;
  readonly #embedder: Embedder | undefined;
  readonly #recent = new Map<string, JournalEntry[]>();

  constructor(filePath: string, embedder?: Embedder) {
    this.#filePath = filePath;
    this.#embedder = embedder;
  }

  open(turn: OpenTurn): JournalTurn {
    const {kind, descriptor, payload} = describe(turn.message, turn.source);
    const metadata = turn.message.metadata ?? {};
    const dataModel = metadata.a2uiClientDataModel;
    const entry: JournalEntry = {
      turnId: turn.turnId,
      clientContextId: turn.clientContextId,
      at: new Date().toISOString(),
      kind,
      descriptor,
      ...(payload !== undefined ? {payload} : {}),
      dispatch: [],
      surfaces: emptyTouches(),
      clientMetadata: {
        keys: Object.keys(metadata),
        dataModelBytes: dataModel === undefined ? 0 : Buffer.byteLength(JSON.stringify(dataModel)),
      },
      outcome: 'failed',
      embedding: null,
    };
    let closed = false;
    return {
      plan: record => {
        entry.plan = record;
      },
      synthesis: record => {
        entry.synthesis = record;
      },
      dispatched: record => {
        entry.dispatch.push(record);
      },
      surfaces: touches => {
        entry.surfaces = mergeTouches(entry.surfaces, touches);
      },
      deadlines: deadlines => {
        entry.deadlines = deadlines;
      },
      compositionClosed: () => {
        entry.closed = true;
      },
      composition: turnId => {
        entry.composition = turnId;
      },
      refused: reason => {
        entry.refused = reason;
      },
      step: record => {
        entry.step = record;
      },
      close: async outcome => {
        if (closed) return;
        closed = true;
        entry.outcome = outcome;
        this.#remember(entry);
        entry.embedding = await this.#embed(entry.descriptor);
        await this.#append(entry);
      },
    };
  }

  /**
   * A registry change (task-11.4 decision 15): one line of kind `registry` beside the turns — the
   * operation, the app, the card URL, the catalogs, the outcome and a refusal's findings. No
   * utterance is behind it, so no descriptor and no embedding. Never throws.
   */
  async registry(entry: RegistryJournalEntry): Promise<void> {
    await this.#append({kind: 'registry', at: new Date().toISOString(), ...entry});
  }

  /**
   * A sign-in fact (task-12.5 decision 11): one line of kind `signIn` beside the turns — started,
   * signed in, failed, expired, refreshed, a refresh failed, revoked, a request for more access
   * (valid or invalid) and its Not now — naming the app, the source, the canvas, why and the scope
   * keys; never a token, a code, a key or the ID token. Never throws.
   */
  async signIn(record: SignInRecord): Promise<void> {
    await this.#append({kind: 'signIn', at: new Date().toISOString(), ...record});
  }

  /** The last closed turns of a composition, oldest first; at most `RECENT_TURNS`. */
  recent(clientContextId: string): readonly JournalEntry[] {
    return this.#recent.get(clientContextId) ?? [];
  }

  #remember(entry: JournalEntry): void {
    const ring = this.#recent.get(entry.clientContextId) ?? [];
    ring.push(entry);
    this.#recent.set(entry.clientContextId, ring.slice(-RECENT_TURNS));
  }

  /** Embeds the descriptor at write time with the Router's model; a failure journals null, never throws. */
  async #embed(descriptor: string): Promise<number[] | null> {
    if (!this.#embedder) return null;
    try {
      const [vector] = await this.#embedder.embed([descriptor]);
      return vector ?? null;
    } catch (err) {
      console.error('intent journal: embedding failed:', err);
      return null;
    }
  }

  async #append(entry: JournalEntry | RegistryLine | SignInLine): Promise<void> {
    try {
      await mkdir(dirname(this.#filePath), {recursive: true});
      await appendFile(this.#filePath, `${JSON.stringify(entry)}\n`);
    } catch (err) {
      console.error(`intent journal: failed to write ${this.#filePath}:`, err);
    }
  }
}
