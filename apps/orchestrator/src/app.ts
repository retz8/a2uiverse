import {join} from 'node:path';
import cors from 'cors';
import express, {type Express} from 'express';
import {AGENT_CARD_PATH} from '@a2a-js/sdk';
import {DefaultRequestHandler, InMemoryTaskStore} from '@a2a-js/sdk/server';
import {agentCardHandler, jsonRpcHandler, UserBuilder} from '@a2a-js/sdk/server/express';
import {buildAgentCard} from './agentCard.js';
import {AgentsPool} from './agentsPool/agentsPool.js';
import type {Config} from './config.js';
import {OrchestratorExecutor} from './executor.js';
import {IntentJournal} from './journal/intentJournal.js';
import {applyUrlOverrides, defaultEntries} from './registry/entries.js';
import {Registry} from './registry/registry.js';

/** localhost, 127.0.0.1 on any port, and VS Code dev tunnels (tunnel-environment.md). */
export const ORIGIN_RE =
  /^(https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?|https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.devtunnels\.ms)$/;

export const DEFAULT_DEADLINE_MS = 30_000;
export const JOURNAL_FILE = 'intent-journal.jsonl';

export interface Orchestrator {
  app: Express;
  registry: Registry;
  pool: AgentsPool;
  journal: IntentJournal;
}

/** Wires the M0 orchestrator: Registry · AgentsPool · IntentJournal behind one A2A executor. */
export function buildOrchestrator({config}: {config: Config}): Orchestrator {
  const registry = new Registry(applyUrlOverrides(defaultEntries(), config.agentUrls));
  const pool = new AgentsPool(registry, {
    defaultDeadlineMs: DEFAULT_DEADLINE_MS,
    debugIds: config.debugIds,
  });
  const journal = new IntentJournal(join(config.stateDir, JOURNAL_FILE));
  const executor = new OrchestratorExecutor({registry, pool, journal});
  const requestHandler = new DefaultRequestHandler(
    buildAgentCard(config.baseUrl),
    new InMemoryTaskStore(),
    executor,
  );

  const app = express();
  app.use(
    cors({
      origin: (origin, callback) => callback(null, !origin || ORIGIN_RE.test(origin)),
      credentials: true,
    }),
  );
  app.use(`/${AGENT_CARD_PATH}`, agentCardHandler({agentCardProvider: requestHandler}));
  app.use('/', jsonRpcHandler({requestHandler, userBuilder: UserBuilder.noAuthentication}));

  return {app, registry, pool, journal};
}
