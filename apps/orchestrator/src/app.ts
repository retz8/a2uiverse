import {join} from 'node:path';
import cors from 'cors';
import express, {type Express} from 'express';
import {AGENT_CARD_PATH} from '@a2a-js/sdk';
import {DefaultAgentCardResolver} from '@a2a-js/sdk/client';
import {DefaultRequestHandler, InMemoryTaskStore} from '@a2a-js/sdk/server';
import {agentCardHandler, jsonRpcHandler, UserBuilder} from '@a2a-js/sdk/server/express';
import {Sources, type AccountStore} from './accounts/accounts.js';
import {buildAgentCard} from './agentCard.js';
import {AgentsPool} from './agentsPool/agentsPool.js';
import {Compositions} from './composition/compositions.js';
import {STEP_QUIET_MS, type Config} from './config.js';
import {TransformersEmbedder, type Embedder} from '@a2uiverse/embedder';
import {OrchestratorExecutor} from './executor.js';
import {IntentJournal} from './journal/intentJournal.js';
import {getModel, plannerProviderOptions} from './planner/getModel.js';
import {ModelPlanner, type Planner} from './planner/planner.js';
import {platformReaders} from './planner/platformReaders.js';
import {plannerSystemPrompt, readPlannerFiles} from './planner/prompt.js';
import type {PlatformReaders} from './planner/readers.js';
import {registryRoutes, REGISTRY_ROUTE_PREFIX} from './registry/api.js';
import {Registry, type ResolveCard} from './registry/registry.js';
import {issueWriteToken} from './registry/token.js';
import {Router} from './router/router.js';
import {
  AUTH_ROUTE_PREFIX,
  authRoutes,
  CALLBACK_PATH,
  CLIENT_DOCUMENT_PATH,
} from './vault/routes.js';
import {VaultStore} from './vault/store.js';
import {AuthVault} from './vault/vault.js';
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
  vault: AuthVault;
  /**
   * Boot step, run before listen: the persisted registry read and verified — a damaged one throws
   * (task-11.4 decision 9) — a fresh write token issued, every installed card fetched and the
   * Router corpus built.
   */
  init(): Promise<void>;
}

/** Injection seams so tests run with no model download, no model call, no network. */
export interface OrchestratorOverrides {
  embedder?: Embedder;
  planner?: Planner;
  /** The Synthesizer's text seam: the model behind it, not the loop. */
  synthesisModel?: SynthesisModel;
  resolveCard?: ResolveCard;
  /** The quiet after a step before its walk starts; `STEP_QUIET_MS` unless a test shortens it. */
  stepQuietMs?: number;
  /** The accounts held per app, in place of the vault's (task-12.4 decision 3): a test's seam. */
  accounts?: AccountStore;
  /** The vault's network, for a test's fake authorization server. */
  vaultFetch?: typeof fetch;
}

/** Wires the orchestrator: Registry · the accounts seam · Embedder · Router · Planner · Synthesizer · AgentsPool · IntentJournal behind one A2A executor, the registry's routes beside it. */
export function buildOrchestrator({
  config,
  overrides,
}: {
  config: Config;
  overrides?: OrchestratorOverrides;
}): Orchestrator {
  const card = buildAgentCard(config.baseUrl);
  const embedder =
    overrides?.embedder ?? new TransformersEmbedder({cacheDir: join(config.stateDir, 'models')});
  const journal = new IntentJournal(join(config.stateDir, JOURNAL_FILE), embedder);
  // The registry is the orchestrator's persisted state, booted from alone (task-11.4 decision 8).
  // One platform card, two readers (phase-6 decision 1): the client fetches it; the Registry
  // indexes it.
  const resolveCard = overrides?.resolveCard ?? defaultResolveCard();
  const registry = new Registry({
    stateDir: config.stateDir,
    resolveCard,
    embedder,
    journal,
    platformCard: card,
  });
  let writeToken: string | undefined;
  // The vault (task 12.5): the accounts seam, the card checked before dispatch, the header on the
  // wire, and the sign-ins on `orchestratorApi`. Its client is this orchestrator at its public
  // address.
  const base = config.baseUrl.replace(/\/$/, '');
  const identity = {
    documentUrl: `${base}${AUTH_ROUTE_PREFIX}${CLIENT_DOCUMENT_PATH}`,
    redirectUri: `${base}${AUTH_ROUTE_PREFIX}${CALLBACK_PATH}`,
    name: 'A2UIVerse',
  };
  const vaultStore = new VaultStore(config.stateDir);
  const vault = new AuthVault({
    store: vaultStore,
    cardOf: appId => registry.card(appId) ?? registry.storedCard(appId),
    displayName: appId => registry.displayName(appId),
    identity,
    journal: record => void journal.signIn(record),
    ...(overrides?.vaultFetch ? {fetchImpl: overrides.vaultFetch} : {}),
  });
  registry.onUninstalled(appId => vault.forgetApp(appId));
  const sources = new Sources(registry, overrides?.accounts ?? vault);
  const compositions = new Compositions();
  const readers = platformReaders({
    registry,
    sources,
    composition: contextId => compositions.get(contextId),
    ancestry: contextId => compositions.ancestry(contextId),
  });
  const planner = overrides?.planner ?? plannerFrom(config, readers, sources);
  const synthesizer = synthesizerFrom(config, overrides?.synthesisModel);
  const router = new Router(registry, embedder, {shortlistCap: config.shortlistCap});
  const pool = new AgentsPool(registry, {
    hardCapMs: config.hardCapMs,
    debugIds: config.debugIds,
    faults: config.faults,
    credentials: vault,
  });
  const executor = new OrchestratorExecutor({
    sources,
    pool,
    journal,
    router,
    planner,
    synthesizer,
    compositions,
    deadlines: {softMs: config.softDeadlineMs, capMs: config.hardCapMs},
    heartbeatMs: config.heartbeatMs,
    stepQuietMs: overrides?.stepQuietMs ?? STEP_QUIET_MS,
    gate: vault,
  });
  const requestHandler = new DefaultRequestHandler(card, new InMemoryTaskStore(), executor);

  const app = express();
  app.use(
    cors({
      origin: (origin, callback) => callback(null, !origin || ORIGIN_RE.test(origin)),
      credentials: true,
    }),
  );
  app.use(REGISTRY_ROUTE_PREFIX, registryRoutes({registry, writeToken: () => writeToken}));
  app.use(
    AUTH_ROUTE_PREFIX,
    authRoutes({
      vault,
      identity,
      // Public first: it decides the cookie's `secure` (task-12.13 decision 29).
      origins: [new URL(base).origin, `http://localhost:${config.port}`],
      ask: (canvas, source) => {
        const state = compositions.get(canvas);
        if (!state) return undefined;
        const slot = state.slots.get(source);
        const asked =
          slot?.escalation ?? (slot?.authority?.cause === 'signIn' ? slot.authority : undefined);
        return {
          slot: slot !== undefined,
          ...(asked?.scheme !== undefined && asked.keys !== undefined
            ? {ask: {scheme: asked.scheme, keys: asked.keys}}
            : {}),
        };
      },
      app: appId => {
        const card = registry.card(appId) ?? registry.storedCard(appId);
        return {
          name: registry.displayName(appId),
          ...(card?.documentationUrl ? {documentationUrl: card.documentationUrl} : {}),
        };
      },
    }),
  );
  app.use(`/${AGENT_CARD_PATH}`, agentCardHandler({agentCardProvider: requestHandler}));
  app.use('/', jsonRpcHandler({requestHandler, userBuilder: UserBuilder.noAuthentication}));

  return {
    app,
    registry,
    pool,
    journal,
    vault,
    init: async () => {
      await registry.load();
      await vaultStore.load();
      writeToken = await issueWriteToken(config.stateDir);
      await registry.refreshCards();
    },
  };
}

/**
 * The turn's one model call, authored here: its prompt from the files read at boot, its pruned
 * catalog, and the readers as its tools. Without a key it is a broken turn.
 */
function plannerFrom(config: Config, readers: PlatformReaders, sources: Sources): Planner {
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
    sourcesOf: appId => sources.of(appId),
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

/** Fetches a card from its full URL: the path is part of the URL, none appended. */
function defaultResolveCard(): ResolveCard {
  const resolver = new DefaultAgentCardResolver();
  return url => resolver.resolve(url, '');
}
