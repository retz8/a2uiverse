import {join} from 'node:path';
import cors from 'cors';
import express, {type Express} from 'express';
import {AGENT_CARD_PATH} from '@a2a-js/sdk';
import {DefaultAgentCardResolver} from '@a2a-js/sdk/client';
import {DefaultRequestHandler, InMemoryTaskStore} from '@a2a-js/sdk/server';
import {agentCardHandler, jsonRpcHandler, UserBuilder} from '@a2a-js/sdk/server/express';
import {buildAgentCard} from './agentCard.js';
import {AgentsPool} from './agentsPool/agentsPool.js';
import {Canvases} from './composition/canvases.js';
import type {Config} from './config.js';
import {TransformersEmbedder} from './embedder/transformersEmbedder.js';
import type {Embedder} from './embedder/types.js';
import {OrchestratorExecutor} from './executor.js';
import {IntentJournal} from './journal/intentJournal.js';
import {getModel, plannerProviderOptions} from './planner/getModel.js';
import {ModelPlanner, type Planner} from './planner/planner.js';
import {platformReaders} from './planner/platformReaders.js';
import {plannerSystemPrompt, readPlannerFiles} from './planner/prompt.js';
import type {PlatformReaders} from './planner/readers.js';
import {applyUrlOverrides, defaultEntries} from './registry/entries.js';
import {readRoster} from './registry/manifests.js';
import {Registry, type ResolveCard} from './registry/registry.js';
import {Router} from './router/router.js';
import {readSynthesizerFiles, synthesizerSystemPrompt} from './synthesizer/prompt.js';
import {AiSdkSynthesisModel, Synthesizer, type SynthesisModel} from './synthesizer/synthesizer.js';

/** localhost, 127.0.0.1 on any port, and VS Code dev tunnels (tunnel-environment.md). */
export const ORIGIN_RE =
  /^(https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?|https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.devtunnels\.ms)$/;

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
  /** The Synthesizer's text seam: the model behind it, not the loop. */
  synthesisModel?: SynthesisModel;
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
  // The roster: the manifests one level below the agents dir when one is set (the mock tier is
  // opted in this way — task 4.7), the hardcoded entries otherwise, until Phase 10's install root.
  const entries = config.agentsDir ? readRoster(config.agentsDir) : defaultEntries();
  const card = buildAgentCard(config.baseUrl);
  // One card, two readers (phase-6 decision 1): the client fetches it; the Registry indexes it.
  const registry = new Registry(applyUrlOverrides(entries, config.agentUrls), {platformCard: card});
  const embedder =
    overrides?.embedder ?? new TransformersEmbedder({cacheDir: join(config.stateDir, 'models')});
  const journal = new IntentJournal(join(config.stateDir, JOURNAL_FILE), embedder);
  const canvases = new Canvases();
  const readers = platformReaders({
    registry,
    canvas: contextId => canvases.get(contextId),
    ancestry: contextId => canvases.ancestry(contextId),
  });
  const planner = overrides?.planner ?? plannerFrom(config, readers);
  const synthesizer = synthesizerFrom(config, overrides?.synthesisModel);
  const router = new Router(registry, embedder, {shortlistCap: config.shortlistCap});
  const pool = new AgentsPool(registry, {
    hardCapMs: config.hardCapMs,
    debugIds: config.debugIds,
    faults: config.faults,
  });
  const executor = new OrchestratorExecutor({
    registry,
    pool,
    journal,
    router,
    planner,
    synthesizer,
    canvases,
    deadlines: {softMs: config.softDeadlineMs, capMs: config.hardCapMs},
    heartbeatMs: config.heartbeatMs,
  });
  const requestHandler = new DefaultRequestHandler(card, new InMemoryTaskStore(), executor);

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

/**
 * The turn's one model call, authored here: its prompt from the files read at boot, its pruned
 * catalog, and the readers as its tools. Without a key it is a broken turn.
 */
function plannerFrom(config: Config, readers: PlatformReaders): Planner {
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
  const files = readPlannerFiles();
  return new ModelPlanner({
    model: getModel(settings),
    providerOptions: plannerProviderOptions(settings),
    systemPrompt: plannerSystemPrompt(files),
    catalog: files.catalog,
    readers,
  });
}

/**
 * The second model call shares the Planner's provider seam; without a key it declines as a
 * failure. The loop around the model — prompt, extract, validate, one retry — is the same for
 * the real model and an injected fake; only the text seam is overridable.
 */
function synthesizerFrom(config: Config, model: SynthesisModel | undefined): Synthesizer {
  const files = readSynthesizerFiles();
  return new Synthesizer({
    model: model ?? synthesisModelFrom(config),
    systemPrompt: synthesizerSystemPrompt(files),
    catalog: files.catalog,
  });
}

function synthesisModelFrom(config: Config): SynthesisModel {
  const {googleApiKey} = config;
  if (!googleApiKey) {
    return {
      async generate() {
        throw new Error('GOOGLE_API_KEY not set: the Synthesizer has no model');
      },
    };
  }
  const settings = {
    googleApiKey,
    modelId: config.synthesizerModelId,
    effort: config.synthesizerEffort,
  };
  return new AiSdkSynthesisModel({
    model: getModel(settings),
    providerOptions: plannerProviderOptions(settings),
  });
}

function defaultResolveCard(): ResolveCard {
  const resolver = new DefaultAgentCardResolver();
  return url => resolver.resolve(url);
}
