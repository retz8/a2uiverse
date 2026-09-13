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
  /** This canvas — the current composition's structure for the conversation; undefined when there is none. */
  thisCanvas(conversationId: string): CanvasView | undefined;
  /** Recent turns — the last few turns of the conversation, one line each, oldest first. */
  recentTurns(conversationId: string): string[];
}

export const READER_NAMES = ['installed_apps', 'this_canvas', 'recent_turns'] as const;
export type ReaderName = (typeof READER_NAMES)[number];

const NO_INPUT = jsonSchema<Record<string, never>>({
  type: 'object',
  properties: {},
  additionalProperties: false,
});

/** The readers as the AI SDK's tools, bound to one conversation; results as JSON, recent turns as lines. */
export function readerTools(readers: PlatformReaders, conversationId: string): ToolSet {
  return {
    installed_apps: tool({
      description:
        'The apps installed on this platform: each one’s id, display name, its card’s name, description and skills, and whether it was reachable at boot. Call it to answer which apps there are or what an installed app can do. The platform itself is not an app.',
      inputSchema: NO_INPUT,
      execute: async () => readers.installedApps(),
    }),
    this_canvas: tool({
      description:
        'What is on the canvas right now, as structure: the utterance it came from, which sources hold a slot and each slot’s state, whether a merged view is live, collapsed or declined and why, and any capability gaps. Never an app’s data. Call it to answer what the user is looking at.',
      inputSchema: NO_INPUT,
      execute: async () =>
        readers.thisCanvas(conversationId) ?? {empty: true, note: 'Nothing is on the canvas yet.'},
    }),
    recent_turns: tool({
      description:
        'The last few turns of this conversation, oldest first, one line each: when, what was asked, which sources answered and how, the outcome. Call it to answer what was asked or what happened before.',
      inputSchema: NO_INPUT,
      execute: async () => readers.recentTurns(conversationId),
    }),
  };
}
