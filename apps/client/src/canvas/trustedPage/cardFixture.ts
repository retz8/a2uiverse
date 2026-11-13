/**
 * Card fixtures for the client's tests: a card as an A2A 0.3 agent serves it — what the
 * orchestrator hands the page — and the same card read, as the page holds one past
 * `orchestratorApi` (task-20.3 decision 6).
 */
import type {AgentCard} from '@a2a-js/sdk';
import {readCard} from '@a2uiverse/card';
import type {IndexEntry} from '@a2uiverse/sdk';
import type {StoreEntry} from '../../orchestratorApi';

/** A card as an A2A 0.3 agent serves it. */
export type ServedCardFixture = Record<string, unknown> & {name: string; version: string};

/** A skill as a test writes one: its id and tags filled in where left out. */
type SkillFixture = {name: string; description: string; examples?: string[]};

/**
 * A card served for A2A 0.3 under `name`, with every field the A2A SDK's reader requires, then
 * `more` — `securitySchemes`, `security`, `skills`, a `version` of its own.
 */
export function servedCard(
  name: string,
  more: Record<string, unknown> & {skills?: SkillFixture[]} = {},
): ServedCardFixture {
  const {skills = [], ...rest} = more;
  return {
    name,
    description: `${name} does its thing.`,
    url: `http://127.0.0.1:11001/${name}`,
    version: '1.0.0',
    protocolVersion: '0.3.0',
    capabilities: {},
    defaultInputModes: ['text'],
    defaultOutputModes: ['text'],
    skills: skills.map((skill, i) => ({id: `skill-${i}`, tags: [], ...skill})),
    ...rest,
  };
}

/** The same card read: what a function past `orchestratorApi` is handed. */
export function readCardFixture(
  name: string,
  more: Parameters<typeof servedCard>[1] = {},
): AgentCard {
  return readCard(servedCard(name, more));
}

/** An entry as the page holds it: its served card read. */
export function readEntryFixture(entry: IndexEntry): StoreEntry {
  return {...entry, card: readCard(entry.card)};
}
