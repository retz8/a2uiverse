/** Where the live suite's stack runs (`playwright.live.config.ts`). */
export const ORCHESTRATOR_PORT = 10081;
export const CLIENT_PORT = 5183;
export const ORCHESTRATOR = `http://localhost:${ORCHESTRATOR_PORT}`;
/** The one agent: GitHub, on its roster port. */
export const AGENT_CARD = 'http://localhost:11001/.well-known/agent-card.json';
