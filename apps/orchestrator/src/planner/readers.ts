/**
 * The Planner's closed tool set (phase-6 decision 4, task-6.4 decision 5): three readers over the
 * platform's own state, called on demand the way a vendor agent calls its MCP. Each is a bounded
 * deterministic projection — never a partition's contents, never the synthesis document. One
 * interface; the AI SDK adapter below is the only tool-shaped code, so a new projection is a new
 * reader here and the Planner does not change if the platform's state ever moves behind a real
 * MCP server.
 */
import {jsonSchema, tool, type ToolSet} from 'ai';

export interface InstalledApp {
  id: string;
  displayName: string;
  /** The card's own name and description, when the card was reachable at boot. */
  name?: string;
  description?: string;
  skills: {name: string; description: string}[];
  reachable: boolean;
}

export interface CanvasSlot {
  source: string;
  displayName: string;
  /** The orchestrator's view: pending, arrived (painted), failed, collapsed. */
  state: 'pending' | 'arrived' | 'failed' | 'collapsed';
}

export interface CanvasView {
  utterance: string;
  slots: CanvasSlot[];
  /** Present when the plan reserved a merged view; its state and, when it did not stand, why. */
  mergedView?: {state: 'pending' | 'live' | 'collapsed' | 'declined'; reason?: string};
  gaps: string[];
}

export interface PlatformReaders {
  /** Installed apps — from the Registry: id, display name, the card's name, description and skills, reachability. */
  installedApps(): InstalledApp[];
  /**
   * This canvas — the structure of the canvas the question was asked from (task-9.3 decision 2);
   * undefined on a root canvas or when that canvas is gone.
   */
  thisCanvas(askedFrom: string | undefined): CanvasView | undefined;
  /** Recent turns — the canvas the question was asked from and its ancestry, one line each, oldest first. */
  recentTurns(askedFrom: string | undefined): string[];
}

export const READER_NAMES = ['installed_apps', 'this_canvas', 'recent_turns'] as const;
export type ReaderName = (typeof READER_NAMES)[number];

const NO_INPUT = jsonSchema<Record<string, never>>({
  type: 'object',
  properties: {},
  additionalProperties: false,
});

/**
 * The readers as the AI SDK's tools, bound to the canvas the question was asked from; results as
 * JSON, recent turns as lines.
 */
export function readerTools(readers: PlatformReaders, askedFrom: string | undefined): ToolSet {
  return {
    installed_apps: tool({
      description:
        'The apps installed on this platform: each one’s id, display name, its card’s name, description and skills, and whether it was reachable at boot. Call it to answer which apps there are or what an installed app can do. The platform itself is not an app.',
      inputSchema: NO_INPUT,
      execute: async () => readers.installedApps(),
    }),
    this_canvas: tool({
      description:
        'The canvas the user is looking at — the one this question was asked from — as structure: the utterance it came from, which sources hold a slot and each slot’s state, whether a merged view is live, collapsed or declined and why, and any capability gaps. Never an app’s data. Call it to answer what the user is looking at.',
      inputSchema: NO_INPUT,
      execute: async () =>
        readers.thisCanvas(askedFrom) ?? {empty: true, note: 'Nothing is on the canvas yet.'},
    }),
    recent_turns: tool({
      description:
        'The trail the user walked to the canvas they are looking at: that canvas and the ones it was asked from, oldest first, one line each — when, what was asked, which sources answered and how, what became of the merged view, whether it is still loading or was closed. Call it to answer what was asked or what happened before.',
      inputSchema: NO_INPUT,
      execute: async () => readers.recentTurns(askedFrom),
    }),
  };
}
