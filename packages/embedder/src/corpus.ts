/** The part of an A2A AgentCard the corpus document reads; structural, so the package depends on no A2A package. */
export interface CardForCorpus {
  name: string;
  description: string;
  skills?: {name: string; description: string; tags?: string[]; examples?: string[]}[];
}

/**
 * The retrieval corpus's one document per agent: the whole card blended — name, description,
 * every skill's name, description, tags and examples — one line each, empty lines dropped. The
 * Router embeds an installed card this way and the marketplace embeds a published one the same
 * way, so a question ranks the same against both indexes. Skills are card content the Planner
 * reads; they are not index structure.
 */
export function corpusDoc(card: CardForCorpus): string {
  const parts: string[] = [card.name, card.description];
  for (const skill of card.skills ?? []) {
    parts.push(skill.name, skill.description);
    if (skill.tags?.length) parts.push(skill.tags.join(' '));
    if (skill.examples?.length) parts.push(skill.examples.join(' '));
  }
  return parts.filter(Boolean).join('\n');
}
