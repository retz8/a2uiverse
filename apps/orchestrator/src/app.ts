import {join} from 'node:path';
import cors from 'cors';
import express, {type Express} from 'express';
import {AGENT_CARD_PATH} from '@a2a-js/sdk';
import {DefaultAgentCardResolver} from '@a2a-js/sdk/client';
import {DefaultRequestHandler, InMemoryTaskStore} from '@a2a-js/sdk/server';
import {agentCardHandler, jsonRpcHandler, UserBuilder} from '@a2a-js/sdk/server/express';
import {buildAgentCard} from './agentCard.js';
import {AgentsPool} from './agentsPool/agentsPool.js';
import type {Config} from './config.js';
import {TransformersEmbedder} from './embedder/transformersEmbedder.js';
import type {Embedder} from './embedder/types.js';
import {OrchestratorExecutor} from './executor.js';
import {IntentJournal} from './journal/intentJournal.js';
import {getModel, plannerProviderOptions} from './planner/getModel.js';
import {ModelPlanner, type Planner} from './planner/planner.js';
import {applyUrlOverrides, defaultEntries} from './registry/entries.js';
import {Registry, type ResolveCard} from './registry/registry.js';
import {Router} from './router/router.js';
import {operatorVocabulary} from './synthesizer/operators.js';
import {ModelSynthesizer, type Synthesizer} from './synthesizer/synthesizer.js';

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
  /** Boot step: fetch AgentCards and build the Router corpus. Run before listen. */
  init(): Promise<void>;
}

/** Injection seams so tests run with no model download, no model call, no network. */
export interface OrchestratorOverrides {
  embedder?: Embedder;
  planner?: Planner;
  synthesizer?: Synthesizer;
  resolveCard?: ResolveCard;
}

/** Wires the orchestrator: Registry · Embedder · Router · Planner · Synthesizer · AgentsPool · IntentJournal behind one A2A executor. */
export function buildOrchestrator({
  config,
  overrides,
}: {
  config: Config;
  overrides?: OrchestratorOverrides;
}): Orchestrator {
  const registry = new Registry(applyUrlOverrides(defaultEntries(), config.agentUrls));
  const embedder =
    overrides?.embedder ?? new TransformersEmbedder({cacheDir: join(config.stateDir, 'models')});
  const planner = overrides?.planner ?? plannerFrom(config);
  const synthesizer = overrides?.synthesizer ?? synthesizerFrom(config);
  const router = new Router(registry, embedder, {shortlistCap: config.shortlistCap});
  const pool = new AgentsPool(registry, {
    defaultDeadlineMs: DEFAULT_DEADLINE_MS,
    debugIds: config.debugIds,
  });
  const journal = new IntentJournal(join(config.stateDir, JOURNAL_FILE), embedder);
  const executor = new OrchestratorExecutor({
    registry,
    pool,
    journal,
    router,
    planner,
    synthesizer,
    operators: operatorVocabulary(),
  });
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

  const resolveCard = overrides?.resolveCard ?? defaultResolveCard();
  return {
    app,
    registry,
    pool,
    journal,
    init: () => registry.refreshCards({resolveCard, embedder}),
  };
}

function plannerFrom(config: Config): Planner {
  const {googleApiKey} = config;
  if (!googleApiKey) {
    // Booting without a key is fine (actions still route); a palette turn is then a broken turn.
    return {
      async plan() {
        throw new Error('GOOGLE_API_KEY not set: the Planner has no model');
      },
    };
  }
  const settings = {googleApiKey, modelId: config.plannerModelId, effort: config.plannerEffort};
  return new ModelPlanner({
    model: getModel(settings),
    providerOptions: plannerProviderOptions(settings),
  });
}

/** The second model call shares the Planner's provider seam; without a key it declines as a failure. */
function synthesizerFrom(config: Config): Synthesizer {
  const {googleApiKey} = config;
  if (!googleApiKey) {
    return {
      async synthesize() {
        throw new Error('GOOGLE_API_KEY not set: the Synthesizer has no model');
      },
    };
  }
  const settings = {
    googleApiKey,
    modelId: config.synthesizerModelId,
    effort: config.synthesizerEffort,
  };
  return new ModelSynthesizer({
    model: getModel(settings),
    providerOptions: plannerProviderOptions(settings),
  });
}

function defaultResolveCard(): ResolveCard {
  const resolver = new DefaultAgentCardResolver();
  return url => resolver.resolve(url);
}
