import {appendFile, mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import type {Message} from '@a2a-js/sdk';
import type {DispatchOutcome, DispatchRecord} from '../agentsPool/types.js';
import {describe} from './descriptor.js';
import {emptyTouches, mergeTouches, type SurfaceTouches} from './surfaces.js';
import type {JournalEntry} from './types.js';

export interface OpenTurn {
  turnId: string;
  clientContextId: string;
  message: Message;
  appId: string;
}

export interface JournalTurn {
  dispatched(record: DispatchRecord): void;
  surfaces(touches: SurfaceTouches): void;
  /** Appends the entry. Never throws: a journal failure must not fail the turn. */
  close(outcome: DispatchOutcome): Promise<void>;
}

/** Append-only JSON lines in the orchestrator's state directory. No reads in M0. */
export class IntentJournal {
  readonly #filePath: string;

  constructor(filePath: string) {
    this.#filePath = filePath;
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
      dispatched: record => {
        entry.dispatch.push(record);
      },
      surfaces: touches => {
        entry.surfaces = mergeTouches(entry.surfaces, touches);
      },
      close: async outcome => {
        entry.outcome = outcome;
        await this.#append(entry);
      },
    };
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
