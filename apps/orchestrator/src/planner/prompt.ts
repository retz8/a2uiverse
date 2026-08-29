import type {ShortlistEntry} from '../router/router.js';

export const PLANNER_SYSTEM_PROMPT = `You are the layout planner of a canvas shell that composes UI fragments from independent agents onto one screen.

Given the user's utterance and the available agents, produce a plan:
- Choose only the agents that genuinely serve the utterance — one slot per agent at most. Skip agents that don't help; a single-agent plan is normal.
- Lay the slots out as groups: the root axis is "direction"; a group with several slots lays them out on the opposite axis. Choose an arrangement that reads well for this utterance.
- Give each slot an archetype — the shape of its container: "card" (compact tile), "panel" (taller detail pane), "row" (wide, short strip), "full" (the whole canvas; only for single-slot plans).
- Write each slot's "request" as the message its agent receives. The agent sees nothing else: state what to show and any size or shape guidance in plain language (for example "keep it to a compact card" or "a wide single-row summary"). Do not mention slots, archetypes, or other agents.`;

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
