import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {pruneCatalog, type A2uiCatalogSchema, type Ref} from '@a2uiverse/sdk';
import {SYNTHESIS_SURFACE_KEEP_SET} from '@a2uiverse/shell-catalog/schema';
import {SYNTHESIZE_DATA_MODEL_SCHEMA} from './document.js';
import {SYNTHESIS_EXAMPLES, type SynthesisExample} from './examples.js';

/**
 * The Synthesizer's prompt (task-5.4 decisions 1–4, task-6.3 decision 8): five parts in the
 * vendors' order — the role, the rules doc (`synthesis.md`), the shell catalog's synthesis
 * guidance, the Synthesizer's pruned catalog with the output schema, worked examples — and a turn
 * builder whose one "previous document" slot serves both the retry and a re-synthesis. The files
 * are read once at boot; the pruned catalog shown here is the one the output is validated against.
 */

/** The tag the model wraps its one document in. */
export const SYNTHESIS_TAG = 'synthesize-data-model';

export const SYNTHESIZER_ROLE =
  'You are the synthesizer of a canvas shell that composes the answers of independent agents onto one screen. When several agents have answered the same question, you author the merged view over their answers: a component tree in the shell’s own catalog, wired to the agents’ data through a derived data model whose every leaf is a formula over references into their data — never a copied value. You write JSON as text; the shell validates it, evaluates the wiring, and paints the tree.';

export interface SynthesisSource {
  /** Namespaced surface id — what refs name. */
  surface: string;
  appId: string;
  displayName: string;
  /** The partition's live data model. */
  data: unknown;
}

/** A dispatched source that brings no data to this synthesis (task-8.3 decision 13). */
export interface MissingSource {
  appId: string;
  displayName: string;
  /** Still in flight, failed, or answered after the merge was made and not included yet. */
  state: 'loading' | 'failed' | 'arrived';
}

/** A source folded into the live view at the reader's press (task-8.4 decision 12). */
export interface JoinedSource {
  appId: string;
  displayName: string;
}

/** A fact of a match claim that stopped holding while both its refs resolve (task-7.6 decision 13). */
export interface UnheldRelation {
  /** Where it sits in the derived model: `/rows/0/match/same branch`. */
  path: string;
  op: string;
  args: Ref[];
}

/**
 * The runtime's account of why a re-synthesis is happening (task-5.4 decision 6, task-7.6
 * decision 15): the refs that stopped resolving, the entries that appeared in a watched array —
 * each a ref selecting the element by its key — and the facts that no longer hold. The first two
 * fire a re-synthesis; the third rides along.
 */
export interface ChangeAccount {
  absent: Ref[];
  appeared: Ref[];
  unheld: UnheldRelation[];
  /** Surfaces the previous document reads nothing from, holding other data than when it was accepted. */
  repainted: string[];
}

/** What the Synthesizer is briefed from: its rules doc, the catalog's guidance, its pruned catalog. */
export interface SynthesizerFiles {
  /** `synthesis.md`: the composition rules in the words the model reads. */
  rules: string;
  /** The shell catalog's `synthesis-guidance.md`. */
  guidance: string;
  /** The shell catalog pruned to the synthesis surface's keep-set. */
  catalog: A2uiCatalogSchema;
}

export function readSynthesizerFiles(): SynthesizerFiles {
  const require = createRequire(import.meta.url);
  const read = (path: string) => readFileSync(path, 'utf8');
  const full = JSON.parse(
    read(require.resolve('@a2uiverse/shell-catalog/catalog.json')),
  ) as A2uiCatalogSchema;
  return {
    // From the package root, so the source and the built `dist/` read the same file.
    rules: read(fileURLToPath(new URL('../../src/synthesizer/synthesis.md', import.meta.url))),
    guidance: read(require.resolve('@a2uiverse/shell-catalog/synthesis-guidance.md')),
    catalog: pruneCatalog(full, SYNTHESIS_SURFACE_KEEP_SET),
  };
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

/** The system prompt: role · rules · UI guidance · catalog and output schema · examples. */
export function synthesizerSystemPrompt(
  files: SynthesizerFiles,
  examples: readonly SynthesisExample[] = SYNTHESIS_EXAMPLES,
): string {
  const parts = [
    SYNTHESIZER_ROLE,
    `## Composition:\n${files.rules.trim()}`,
    `## UI Description:\n${files.guidance.trim()}`,
    `### Catalog Schema:\n${JSON.stringify(files.catalog, null, 2)}`,
    `### Output Schema:\n${JSON.stringify(SYNTHESIZE_DATA_MODEL_SCHEMA, null, 2)}`,
  ];
  if (examples.length > 0) {
    parts.push(`### Examples:\n${EXAMPLES_FRAMING}\n\n${examples.map(renderExample).join('\n\n')}`);
  }
  return parts.join('\n\n');
}

export interface SynthesisTurnInputs {
  utterance: string;
  /** The Planner's request on the synthesis slot: its brief to the merge. */
  request: string;
  /** The column headers the reserved slot showed the user from plan time. */
  columns?: readonly string[];
  /** Per column, the source it belongs to, or null. */
  columnSources?: readonly (string | null)[];
  sources: readonly SynthesisSource[];
  /** The dispatched sources with no data in this synthesis. */
  missing?: readonly MissingSource[];
  /** The model's previous document — the failed one on a retry, the live one on a re-synthesis. */
  previous?: unknown;
  /** The validator's findings on `previous`, one per line with its path: this turn is a retry. */
  errors?: readonly string[];
  /** What changed under `previous`: this turn is a re-synthesis. */
  changes?: ChangeAccount;
  /** The sources the reader asked to fold into `previous`: this turn is a re-synthesis. */
  joined?: readonly JoinedSource[];
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
  const {absent, appeared, unheld, repainted} = changes;
  if (absent.length + appeared.length + unheld.length + repainted.length === 0) {
    return '- nothing named; the sources were repainted';
  }
  const lines: string[] = [];
  const section = (heading: string, items: readonly string[]) => {
    if (items.length === 0) return;
    lines.push(heading);
    for (const item of items) lines.push(`  - ${item}`);
  };
  section(
    '- these refs no longer resolve:',
    absent.map(ref => `${ref.surface}${ref.pointer}`),
  );
  section(
    '- these entries appeared:',
    appeared.map(ref => `${ref.surface}${ref.pointer}`),
  );
  section('- these sources painted again, and your view reads nothing from them:', repainted);
  section(
    '- these facts no longer hold:',
    unheld.map(
      ({path, op, args}) =>
        `${path}: ${op} over ${args.map(ref => `${ref.surface}${ref.pointer}`).join(' and ')}`,
    ),
  );
  return lines.join('\n');
}

/** The planned headers, each with the source it belongs to when the plan marked them. */
function renderColumns(
  columns: readonly string[],
  marks: readonly (string | null)[] | undefined,
): string {
  if (!marks) return `Columns shown to the user while the view is made:\n${columns.join(' · ')}`;
  const lines = columns.map((header, i) => `- ${header} — ${marks[i] ?? 'no single source'}`);
  return `Columns shown to the user while the view is made, each with the source it belongs to — write them as the Table's columnSources:\n${lines.join('\n')}`;
}

function renderMissing(missing: readonly MissingSource[]): string {
  const said = {
    loading: 'has not answered yet',
    failed: 'failed',
    arrived: 'answered after this view was made, and is not in it yet',
  } as const;
  const lines = missing.map(s => `- ${s.displayName} (${s.appId}): ${said[s.state]}`);
  return `Sources with no data in this view — keep every column marked to one, the empty cell in each of its rows:\n${lines.join('\n')}`;
}

/** The user-turn content: the question, the brief, the sources, and what this turn is. */
export function buildSynthesisTurn(inputs: SynthesisTurnInputs): string {
  const parts = [
    `User utterance:\n${inputs.utterance}`,
    `Request for the merged view:\n${inputs.request}`,
    ...(inputs.columns && inputs.columns.length > 0
      ? [renderColumns(inputs.columns, inputs.columnSources)]
      : []),
    `Sources:\n${renderSources(inputs.sources)}`,
    ...(inputs.missing && inputs.missing.length > 0 ? [renderMissing(inputs.missing)] : []),
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
  } else if (inputs.joined && inputs.joined.length > 0) {
    const joined = inputs.joined.map(s => `  - ${s.displayName} (${s.appId})`).join('\n');
    const changed = inputs.changes ? `\n${renderChanges(inputs.changes)}` : '';
    parts.push(
      `The user is looking at your previous view and asked to include sources that answered after it was made${inputs.changes ? ', and the sources changed under it' : ''}. Keep the view: fold in each source that joined — attach its entries to the rows they belong to, into a row’s list, or as new rows when it is the home source, and fill the columns marked to it — or leave out what belongs nowhere; re-point the refs that broke; attach each entry that appeared, or leave it out; re-point, re-evidence or detach each fact that no longer holds; keep the tree and the shape of the model unless the data no longer supports them; and say what changed in the note. What changed:\n- these sources joined the view, their data among the sources above:\n${joined}${changed}`,
    );
    if (previous !== undefined) parts.push(`Your previous document:\n${previous}`);
  } else if (inputs.changes) {
    parts.push(
      `The user is looking at your previous view, and the sources changed under it. Keep the view: re-point the refs that broke; attach each entry that appeared — to a row, into a row’s list, or as a new row when it is the home source’s — or leave it out; attach what a source that painted again now carries, where it belongs to a row, or leave it out; re-point, re-evidence or detach each fact that no longer holds; keep the tree and the shape of the model unless the data no longer supports them; and say what changed in the note. What changed:\n${renderChanges(inputs.changes)}`,
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
