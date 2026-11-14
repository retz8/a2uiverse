/**
 * A signed-in account's extended card beside the public card (task-20.8 decisions 1, 3, 5): whether
 * a card says its agent serves one, what an account's card says that the public card does not —
 * what the Router and the Planner read — and the sign-in it names that the platform will not use.
 */
import type {AgentCard, AgentSkill} from '@a2a-js/sdk';
import {signInAlternatives} from './requirements.js';

/**
 * Whether the card says its agent serves an extended card to a signed-in caller: its flag,
 * `capabilities.extendedAgentCard`, which the reading carries over from A2A 0.3's
 * `supportsAuthenticatedExtendedCard`.
 */
export function servesExtendedCard(card: AgentCard): boolean {
  return card.capabilities?.extendedAgentCard === true;
}

/** What an account's card says that the public card does not. */
export interface AccountCardAdds {
  /** The account card's name, where it is not the public card's. */
  name?: string;
  /** The account card's description, where it is not the public card's. */
  description?: string;
  /** Each skill the public card does not carry as it is. */
  skills: AgentSkill[];
}

/**
 * What the account's card says that the public card does not: its name and its description where
 * they differ, and each skill the public card does not hold the same — the same id, name,
 * description, tags and examples. None when it says nothing more.
 */
export function accountCardAdds(
  publicCard: AgentCard,
  accountCard: AgentCard,
): AccountCardAdds | undefined {
  const held = new Set(publicCard.skills.map(skillKey));
  const skills = accountCard.skills.filter(skill => !held.has(skillKey(skill)));
  const adds: AccountCardAdds = {
    ...(accountCard.name && accountCard.name !== publicCard.name ? {name: accountCard.name} : {}),
    ...(accountCard.description && accountCard.description !== publicCard.description
      ? {description: accountCard.description}
      : {}),
    skills,
  };
  return adds.name !== undefined || adds.description !== undefined || skills.length > 0
    ? adds
    : undefined;
}

function skillKey({id, name, description, tags, examples}: AgentSkill): string {
  return JSON.stringify([id, name, description, tags ?? [], examples ?? []]);
}

/**
 * The sign-in an account's card names that the public card does not, which the platform never
 * reads from an account's card (decision 5): each scheme the public card does not declare, and
 * each scope a requirement asks of a scheme beyond what the public card's requirements ask of it.
 */
export function signInBeyond(
  publicCard: AgentCard,
  accountCard: AgentCard,
): {schemes: string[]; scopes: {scheme: string; scope: string}[]} {
  const declared = new Set(Object.keys(publicCard.securitySchemes ?? {}));
  const schemes = Object.keys(accountCard.securitySchemes ?? {}).filter(
    scheme => !declared.has(scheme),
  );
  const asked = new Map<string, Set<string>>();
  for (const alternative of signInAlternatives(publicCard)) {
    for (const [scheme, scopes] of Object.entries(alternative)) {
      const set = asked.get(scheme) ?? new Set<string>();
      for (const scope of scopes) set.add(scope);
      asked.set(scheme, set);
    }
  }
  const scopes: {scheme: string; scope: string}[] = [];
  const said = new Set<string>();
  for (const alternative of signInAlternatives(accountCard)) {
    for (const [scheme, list] of Object.entries(alternative)) {
      if (!declared.has(scheme)) continue;
      for (const scope of list) {
        const key = JSON.stringify([scheme, scope]);
        if (asked.get(scheme)?.has(scope) || said.has(key)) continue;
        said.add(key);
        scopes.push({scheme, scope});
      }
    }
  }
  return {schemes, scopes};
}
