import {appendFile, mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import type {Message} from '@a2a-js/sdk';
import type {DispatchOutcome, DispatchRecord} from '../agentsPool/types.js';
import type {Embedder} from '../embedder/types.js';
import type {Plan} from '../planner/planSchema.js';
import {describe} from './descriptor.js';
import {emptyTouches, mergeTouches, type SurfaceTouches} from './surfaces.js';
import type {JournalEntry, SynthesisRecord} from './types.js';

export interface OpenTurn {
  turnId: string;
  clientContextId: string;
  message: Message;
  /** The dispatched app, when the turn has exactly one (action turns). */
  appId?: string;
}

export interface JournalTurn {
  plan(plan: Plan): void;
  synthesis(record: SynthesisRecord): void;
  dispatched(record: DispatchRecord): void;
  surfaces(touches: SurfaceTouches): void;
  /** Appends the entry. Never throws: a journal failure must not fail the turn. */
  close(outcome: DispatchOutcome): Promise<void>;
}

/** Append-only JSON lines in the orchestrator's state directory. No reads in M0. */
export class IntentJournal {
  readonly #filePath: string;
  readonly #embedder: Embedder | undefined;

  constructor(filePath: string, embedder?: Embedder) {
    this.#filePath = filePath;
    this.#embedder = embedder;
  }

  open(turn: OpenTurn): JournalTurn {
    const {kind, descriptor, payload} = describe(turn.message, turn.appId);
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
    return {
      plan: plan => {
        entry.plan = plan;
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
      close: async outcome => {
        entry.outcome = outcome;
        entry.embedding = await this.#embed(entry.descriptor);
        await this.#append(entry);
      },
    };
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

  async #append(entry: JournalEntry): Promise<void> {
    try {
      await mkdir(dirname(this.#filePath), {recursive: true});
      await appendFile(this.#filePath, `${JSON.stringify(entry)}\n`);
    } catch (err) {
      console.error(`intent journal: failed to write ${this.#filePath}:`, err);
    }
  }
}
