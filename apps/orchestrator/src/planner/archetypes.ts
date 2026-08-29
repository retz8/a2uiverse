/**
 * The shapes a slot's container can take. Hub-internal plan vocabulary only
 * (SPEC §4.4): plan-leaf enum, shell-surface paint input, and the
 * weird-layout sanity check. Never sent to or declared by agents.
 */
export const SLOT_ARCHETYPES = ['card', 'panel', 'row', 'full'] as const;
export type SlotArchetype = (typeof SLOT_ARCHETYPES)[number];
