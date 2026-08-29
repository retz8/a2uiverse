import type {AgentCard} from '@a2a-js/sdk';

/**
 * The Router's retrieval corpus: one document per agent (whole card blended —
 * name, description, every skill's texts). Skills are card content the
 * Planner reads; they are not index structure.
 */
export function corpusDoc(card: AgentCard): string {
  const parts: string[] = [card.name, card.description];
  for (const skill of card.skills ?? []) {
    parts.push(skill.name, skill.description);
    if (skill.tags?.length) parts.push(skill.tags.join(' '));
    if (skill.examples?.length) parts.push(skill.examples.join(' '));
  }
  return parts.filter(Boolean).join('\n');
}
