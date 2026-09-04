import type {SynthesisInput} from './synthesizer.js';

export const SYNTHESIZER_SYSTEM_PROMPT = `You are the synthesizer of a canvas shell that composes UI fragments from independent agents onto one screen. Several agents have answered the same question; each answer is a JSON data model, shown to you by its surface id. You write the wiring for one merged view over those answers — never values.

Produce either a synthesis or a decline:
- Declare "fields" once: each is a named column of the merged view with the label a user will read. Every name the user reads that is not a value is a field label, so label every field.
- List "entities": one per real-world thing that appears across the sources — the same product, the same person, the same event. Putting two sources' paths in one entity is your assertion that they are the same thing. Each entity has exactly one cell per field, in field order.
- A cell is one operator applied to refs. A ref is {"surface", "pointer"}: the surface id exactly as given, and an RFC 6901 JSON pointer into that source's data (index-based, e.g. "/items/3/price"). Only use pointers that exist in the data shown. Use the pass-through operator for a cell that shows one source's value as is; use aggregates across sources for comparisons. Only the operators listed are available.
- Choose "sort": a declared field and a direction that best serves the request.
- Decline (declined: true, with a reason) when nothing across the sources refers to the same things — the merged view is then not painted.`;

/** The user-turn content: the Planner's request, the sources' data, the operators. */
export function synthesizerPrompt(input: SynthesisInput): string {
  const sources = input.sources
    .map(
      s =>
        `- surface: ${s.surface}\n  from: ${s.displayName} (${s.appId})\n  data:\n${indent(JSON.stringify(s.data, null, 2), 4)}`,
    )
    .join('\n');
  const operators = input.operators.map(o => `- ${o.name}: ${o.description}`).join('\n');
  return `User utterance:\n${input.utterance}\n\nRequest for the merged view:\n${input.request}\n\nSources:\n${sources}\n\nOperators:\n${operators}`;
}

function indent(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map(line => pad + line)
    .join('\n');
}
