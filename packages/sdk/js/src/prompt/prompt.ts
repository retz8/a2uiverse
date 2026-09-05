/**
 * The synthesis prompt builder (task-5.4 decisions 1–4): the counterpart of the agent kit's
 * prompt assembly, for the Synthesizer. Five parts in the vendors' order — a role, the
 * composition doc in a2uiverse words, the catalog's UI guidance, the catalog schema verbatim
 * with the contract's output schema, worked examples — and a turn builder whose one "previous
 * document" slot serves both the retry and a re-synthesis. The builder never knows the shell
 * catalog: the schema and the guidance are inputs.
 *
 * The model answers inside one tag of its own — not `<a2ui-json>`, whose client-side extractor
 * must never take this content — and {@link extractSynthesisBlock} reads that boundary, so a
 * streaming reader can later read the same one.
 */
import type {Ref} from '../synthesis.js';
import {SYNTHESIZE_DATA_MODEL_SCHEMA} from '../synthesis.js';
import {COMPOSITION_DOC} from './composition.doc.generated.js';
import {SYNTHESIS_EXAMPLES, type SynthesisExample} from './examples.js';

/** The tag the model wraps its one document in. */
export const SYNTHESIS_TAG = 'synthesize-data-model';

/** The role the system prompt opens with, when the caller gives none. */
export const DEFAULT_SYNTHESIS_ROLE =
  'You are the synthesizer of a canvas shell that composes the answers of independent agents onto one screen. When several agents have answered the same question, you author the merged view over their answers: a component tree in the shell’s own catalog, wired to the agents’ data through a derived data model whose every leaf is a formula over references into their data — never a copied value. You write JSON as text; the shell validates it, evaluates the wiring, and paints the tree.';

export {COMPOSITION_DOC};

export interface SynthesisSource {
  /** Namespaced surface id — what refs name. */
  surface: string;
  appId: string;
  displayName: string;
  /** The partition's live data model. */
  data: unknown;
}

/**
 * The runtime's account of why a re-synthesis is happening (decision 6): the refs that went
 * stale, grouped by the surface whose generation moved, and the refs that stopped resolving.
 */
export interface ChangeAccount {
  stale: Record<string, Ref[]>;
  absent: Ref[];
}

export interface SynthesisSystemInputs {
  /** Overrides {@link DEFAULT_SYNTHESIS_ROLE}. */
  role?: string;
  /** The catalog's `catalog.json`, verbatim. */
  catalogSchema: string;
  /** The catalog's guidance doc: how to build a merged view out of it. */
  uiGuidance: string;
  /** Overrides {@link SYNTHESIS_EXAMPLES}. */
  examples?: readonly SynthesisExample[];
}

export interface SynthesisTurnInputs {
  utterance: string;
  /** The Planner's request on the synthesis slot: its brief to the merge. */
  request: string;
  sources: readonly SynthesisSource[];
  /** The model's previous document — the failed one on a retry, the live one on a re-synthesis. */
  previous?: unknown;
  /** The validator's findings on `previous`, one per line with its path: this turn is a retry. */
  errors?: readonly string[];
  /** What broke in `previous`: this turn is a re-synthesis. */
  changes?: ChangeAccount;
}

const EXAMPLES_FRAMING =
  'The examples below show the form of a synthesize data model over sources of the shapes named in each. Their sources and values are fixtures chosen to make the form legible; they are not the sources of the current turn and never a document to reuse. Every ref you write points into the data you are shown in this turn.';

function renderExample(example: SynthesisExample): string {
  const sources = example.sources.map(s => ({
    surface: s.surface,
    from: `${s.displayName} (${s.appId})`,
    data: s.data,
  }));
  const body = JSON.stringify(
    {intent: example.intent, request: example.request, sources, output: example.output},
    null,
    2,
  );
  return `---BEGIN ${example.name}---\n${body}\n---END ${example.name}---`;
}

/** The system prompt: role · composition doc · UI guidance · schemas · examples. */
export function buildSynthesisSystemPrompt(inputs: SynthesisSystemInputs): string {
  const examples = inputs.examples ?? SYNTHESIS_EXAMPLES;
  const parts = [
    inputs.role ?? DEFAULT_SYNTHESIS_ROLE,
    `## Composition:\n${COMPOSITION_DOC.trim()}`,
    `## UI Description:\n${inputs.uiGuidance.trim()}`,
    `### Catalog Schema:\n${inputs.catalogSchema.trim()}`,
    `### Output Schema:\n${JSON.stringify(SYNTHESIZE_DATA_MODEL_SCHEMA, null, 2)}`,
  ];
  if (examples.length > 0) {
    parts.push(`### Examples:\n${EXAMPLES_FRAMING}\n\n${examples.map(renderExample).join('\n\n')}`);
  }
  return parts.join('\n\n');
}

function indent(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map(line => pad + line)
    .join('\n');
}

function renderSources(sources: readonly SynthesisSource[]): string {
  return sources
    .map(
      s =>
        `- surface: ${s.surface}\n  from: ${s.displayName} (${s.appId})\n  data:\n${indent(JSON.stringify(s.data, null, 2), 4)}`,
    )
    .join('\n');
}

function renderChanges(changes: ChangeAccount): string {
  const lines: string[] = [];
  for (const [surface, refs] of Object.entries(changes.stale)) {
    lines.push(`- ${surface} changed under these refs; each may now point at a different thing:`);
    for (const ref of refs) lines.push(`  - ${ref.pointer}`);
  }
  if (changes.absent.length > 0) {
    lines.push('- these refs no longer resolve:');
    for (const ref of changes.absent) lines.push(`  - ${ref.surface}${ref.pointer}`);
  }
  return lines.length > 0 ? lines.join('\n') : '- nothing named; the sources were repainted';
}

/** The user-turn content: the question, the brief, the sources, and what this turn is. */
export function buildSynthesisTurn(inputs: SynthesisTurnInputs): string {
  const parts = [
    `User utterance:\n${inputs.utterance}`,
    `Request for the merged view:\n${inputs.request}`,
    `Sources:\n${renderSources(inputs.sources)}`,
  ];
  const previous =
    inputs.previous === undefined
      ? undefined
      : typeof inputs.previous === 'string'
        ? inputs.previous
        : JSON.stringify(inputs.previous, null, 2);
  if (inputs.errors && inputs.errors.length > 0) {
    parts.push(
      `Your previous document was rejected. Fix these errors in it and answer with the corrected document; do not start over:\n${inputs.errors.map(e => `- ${e}`).join('\n')}`,
    );
    if (previous !== undefined) parts.push(`Your previous document:\n${previous}`);
  } else if (inputs.changes) {
    parts.push(
      `The user is looking at your previous view, and the sources changed under it. Keep the view: re-point the refs that broke, keep the tree and the shape of the model unless the data no longer supports them, and say what changed in the note. What broke:\n${renderChanges(inputs.changes)}`,
    );
    if (previous !== undefined) parts.push(`Your previous document:\n${previous}`);
  } else if (previous !== undefined) {
    parts.push(`Your previous document:\n${previous}`);
  }
  parts.push(
    `Answer with one JSON document inside <${SYNTHESIS_TAG}> and </${SYNTHESIS_TAG}>, and nothing outside the block.`,
  );
  return parts.join('\n\n');
}

export type SynthesisBlock = {ok: true; json: string} | {ok: false; error: string};

/**
 * The one tagged block of the model's answer, as the text between the tags. Text outside the
 * block is tolerated (models preface); no block, an unclosed block, or several blocks is an
 * error the caller hands back to the model.
 */
export function extractSynthesisBlock(text: string): SynthesisBlock {
  const open = `<${SYNTHESIS_TAG}>`;
  const close = `</${SYNTHESIS_TAG}>`;
  const start = text.indexOf(open);
  if (start < 0) return {ok: false, error: `no <${SYNTHESIS_TAG}> block in the answer`};
  const end = text.indexOf(close, start + open.length);
  if (end < 0) return {ok: false, error: `the <${SYNTHESIS_TAG}> block is not closed`};
  if (text.indexOf(open, end + close.length) >= 0) {
    return {ok: false, error: `more than one <${SYNTHESIS_TAG}> block; answer with exactly one`};
  }
  const json = text.slice(start + open.length, end).trim();
  if (json === '') return {ok: false, error: `the <${SYNTHESIS_TAG}> block is empty`};
  return {ok: true, json};
}
