import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {pruneCatalog, type A2uiCatalogSchema} from '@a2uiverse/sdk';
import {LAYOUT_SURFACE_KEEP_SET} from '@a2uiverse/shell-catalog/schema';
import {SHELL_SOURCE_ID} from '../registry/types.js';
import type {ShortlistEntry} from '../router/router.js';
import {LAYOUT_SURFACE_SCHEMA} from './document.js';
import {LAYOUT_EXAMPLES, type LayoutExample} from './examples.js';

/**
 * The Planner's prompt (task-6.4 decision 8), the Synthesizer's shape: the role, the rules doc
 * (`planner.md`), the shell catalog's platform-UI guidance, the Planner's pruned catalog with the
 * output schema, three worked examples — and the turn, the utterance with the shortlist's cards.
 * The files are read once at boot; the pruned catalog shown here is the one the tree is validated
 * against.
 */

/** The tag the model wraps its one document in. */
export const LAYOUT_SURFACE_TAG = 'layout-surface';

export const PLANNER_ROLE =
  'You are the designer and the voice of a canvas shell that composes the answers of independent agents onto one screen. For each utterance you decide who answers — which agents, whether the shell merges their answers, what nothing installed can serve — and you author the screen itself as a component tree in the shell’s own catalog: a slot for each answer, the framing around the slots, and, when the question is about the platform, the answer in the shell’s own words, read from the platform’s card and its readers. You write JSON as text; the shell validates it, paints it at once and fills the slots as the agents answer.';

/** What the Planner is briefed from: its rules doc, the catalog's platform-UI guidance, its pruned catalog. */
export interface PlannerFiles {
  /** `planner.md`: the rules in the words the model reads. */
  rules: string;
  /** The shell catalog's `platform-ui-guidance.md`. */
  guidance: string;
  /** The shell catalog pruned to the layout surface's keep-set. */
  catalog: A2uiCatalogSchema;
}

export function readPlannerFiles(): PlannerFiles {
  const require = createRequire(import.meta.url);
  const read = (path: string) => readFileSync(path, 'utf8');
  const full = JSON.parse(
    read(require.resolve('@a2uiverse/shell-catalog/catalog.json')),
  ) as A2uiCatalogSchema;
  return {
    // From the package root, so the source and the built `dist/` read the same file.
    rules: read(fileURLToPath(new URL('../../src/planner/planner.md', import.meta.url))),
    guidance: read(require.resolve('@a2uiverse/shell-catalog/platform-ui-guidance.md')),
    catalog: pruneCatalog(full, LAYOUT_SURFACE_KEEP_SET),
  };
}

const EXAMPLES_FRAMING =
  'The examples below show the form of a layout surface for the kinds of turn: agents dispatched with a merged view over them — a timeline across their entries, and a merged view over one kind of thing with its join hypothesis — a question about the platform answered from a reader, and a capability gap. Their agents and reader results are fixtures chosen to make the form legible; they are not the agents of the current turn and never a document to reuse.';

function renderExample(example: LayoutExample): string {
  const body = JSON.stringify(
    {
      intent: example.intent,
      agents: example.agents,
      ...(example.readers ? {readers: example.readers} : {}),
      output: example.output,
    },
    null,
    2,
  );
  return `---BEGIN ${example.name}---\n${body}\n---END ${example.name}---`;
}

/** The system prompt: role · rules · UI guidance · catalog and output schema · examples. */
export function plannerSystemPrompt(
  files: PlannerFiles,
  examples: readonly LayoutExample[] = LAYOUT_EXAMPLES,
): string {
  const parts = [
    PLANNER_ROLE,
    `## Rules:\n${files.rules.trim()}`,
    `## UI Description:\n${files.guidance.trim()}`,
    `### Catalog Schema:\n${JSON.stringify(files.catalog, null, 2)}`,
    `### Output Schema:\n${JSON.stringify(LAYOUT_SURFACE_SCHEMA, null, 2)}`,
  ];
  if (examples.length > 0) {
    parts.push(`### Examples:\n${EXAMPLES_FRAMING}\n\n${examples.map(renderExample).join('\n\n')}`);
  }
  return parts.join('\n\n');
}

function renderCard({record, card}: ShortlistEntry): string {
  const skills = (card.skills ?? [])
    .map(skill => {
      const examples = skill.examples?.length ? ` (e.g. ${skill.examples.join('; ')})` : '';
      return `  - ${skill.name}: ${skill.description}${examples}`;
    })
    .join('\n');
  return `- appId: ${record.id}\n  name: ${card.name}\n  description: ${card.description}${skills ? `\n  skills:\n${skills}` : ''}`;
}

const ANSWER_LINE = `Answer with one JSON document inside <${LAYOUT_SURFACE_TAG}> and </${LAYOUT_SURFACE_TAG}>, and nothing outside the block.`;

/**
 * The first user turn: the utterance, the shortlist's agent cards, and — apart, when the Router
 * ranked it — the platform's own card, which is answered by the Planner, never dispatched.
 */
export function buildPlannerTurn({
  utterance,
  shortlist,
}: {
  utterance: string;
  shortlist: readonly ShortlistEntry[];
}): string {
  const agents = shortlist.filter(e => e.record.id !== SHELL_SOURCE_ID);
  const platform = shortlist.find(e => e.record.id === SHELL_SOURCE_ID);
  const parts = [
    `User utterance:\n${utterance}`,
    `Available agents:\n${agents.length > 0 ? agents.map(renderCard).join('\n') : '- none'}`,
  ];
  if (platform) {
    parts.push(
      `The platform's card (the shell — you). Its skills are what you answer yourself, in the tree; never dispatch to it:\n${renderCard(platform)}`,
    );
  }
  parts.push(ANSWER_LINE);
  return parts.join('\n\n');
}

/** The user turn appended on a retry: the findings, and the ask to fix rather than start over. */
export function buildRetryTurn(errors: readonly string[]): string {
  return [
    `Your previous answer was rejected. Fix these errors in it and answer again with the corrected document; do not start over:\n${errors.map(e => `- ${e}`).join('\n')}`,
    ANSWER_LINE,
  ].join('\n\n');
}
