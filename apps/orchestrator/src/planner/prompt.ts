import type {ShortlistEntry} from '../router/router.js';

export const PLANNER_SYSTEM_PROMPT = `You are the layout planner of a canvas shell that composes UI fragments from independent agents onto one screen. Given the user's utterance and the available agents, plan the screen.

The screen is a stack of groups, and each group is a run of slots. "direction" says how the groups stack: "column" stacks the groups top to bottom, and the slots inside each group then sit left to right; "row" places the groups left to right, and the slots inside each group then stack top to bottom.

A slot is one of two things:
- An agent's slot: a region one agent fills with its own answer. Each agent answers once, so it has one slot at most. Its "request" is the message that agent receives and the only thing it sees — say what to show and any size or shape guidance in plain language (for example "keep it to a compact card"); do not mention slots, archetypes, or other agents.
- The merged view, appId "shell": a region the shell fills with one sortable list drawn from the answers of the other slots on the screen — one row per thing that several agents answered about, with their values side by side. It shows nothing unless the slots it draws on are on the screen with it. Its "request" is your guidance to the merge — what to compare and what matters. A screen has at most one.

Each slot has an archetype, the shape of its container: "card" (compact tile), "panel" (taller detail pane), "row" (wide, short strip), "full" (the whole canvas; only for single-slot plans).

Pick the agents that serve the utterance, decide whether the screen wants a merged view, and lay the slots out so the screen reads well.`;

/** The user-turn content for the plan call: the utterance plus the shortlist's cards. */
export function plannerPrompt({
  utterance,
  shortlist,
}: {
  utterance: string;
  shortlist: readonly ShortlistEntry[];
}): string {
  const agents = shortlist
    .map(({record, card}) => {
      const skills = (card.skills ?? [])
        .map(skill => {
          const examples = skill.examples?.length ? ` (e.g. ${skill.examples.join('; ')})` : '';
          return `  - ${skill.name}: ${skill.description}${examples}`;
        })
        .join('\n');
      return `- appId: ${record.id}\n  name: ${card.name}\n  description: ${card.description}${skills ? `\n  skills:\n${skills}` : ''}`;
    })
    .join('\n');
  return `User utterance:\n${utterance}\n\nAvailable agents:\n${agents}`;
}
