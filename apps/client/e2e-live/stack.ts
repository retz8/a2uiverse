import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';

/** Where the live suite's stack runs (`playwright.live.config.ts`). */
export const ORCHESTRATOR_PORT = 10081;
export const MARKETPLACE_PORT = 10082;
export const CLIENT_PORT = 5183;
export const ORCHESTRATOR = `http://localhost:${ORCHESTRATOR_PORT}`;
/** The suite's own marketplace (task-14.10 decision 4), on a port of its own. */
export const MARKETPLACE = `http://localhost:${MARKETPLACE_PORT}`;
/** The page's origin: what the orchestrator's origin check admits for a write with no token. */
export const CLIENT = `http://localhost:${CLIENT_PORT}`;

/** The apps on their roster ports (task-14.10 decision 3). */
export const AGENT_CARD = 'http://localhost:11001/.well-known/agent-card.json';
export const SHOP_A_CARD = 'http://localhost:12001/.well-known/agent-card.json';
export const SHOP_B_CARD = 'http://localhost:12002/.well-known/agent-card.json';

/** The sibling `a2uiverse-apps` checkout the launcher starts the apps from. */
export const AGENTS_DIR = resolve(
  process.env.A2UIVERSE_AGENTS_DIR ??
    join(import.meta.dirname, '..', '..', '..', '..', 'a2uiverse-apps'),
);

/** Every folder the stack writes, scratch and wiped at each start: never the developer's own. */
export const SCRATCH = join(tmpdir(), 'a2uiverse-e2e-live');
export const STATE_DIR = join(SCRATCH, 'orchestrator');
export const MARKETPLACE_STATE = join(SCRATCH, 'marketplace');
export const AGENT_STATE = join(SCRATCH, 'agents');
/** The dev publisher the launcher publishes GitHub, Gmail, Shop A and Calendar as, kept here for this run alone. */
export const PUBLISHER_FILE = join(SCRATCH, 'publisher.json');
/** Where a story packs what it publishes. */
export const PACKS = join(SCRATCH, 'packs');
