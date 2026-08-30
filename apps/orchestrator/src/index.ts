import {buildOrchestrator} from './app.js';
import {loadConfig} from './config.js';

export const APP_NAME = '@a2uiverse/orchestrator';

const config = loadConfig();
const {app, registry, init} = buildOrchestrator({config});

if (!config.googleApiKey) {
  console.warn(`${APP_NAME}: GOOGLE_API_KEY not set — palette turns will fail until it is`);
}

// Cards are fetched at startup only (SPEC decision 11): an agent unreachable
// now has a null card and is unroutable this session.
await init();

const unroutable = registry.list().filter(r => !registry.card(r.id));
if (unroutable.length > 0) {
  // A null card is unroutable for the whole session, and the failure is otherwise silent — the
  // turn simply finds nothing to route to. Say so once, loudly, at the only moment it is fixable.
  console.warn(
    `${APP_NAME}: no card from ${unroutable.map(r => r.id).join(', ')} — unroutable this session. ` +
      `Start the agents before the orchestrator (\`pnpm dev:all\`) and restart to pick them up.`,
  );
}

app.listen(config.port, () => {
  const apps = registry
    .list()
    .map(r => `${r.id} → ${r.agentUrl} (${registry.card(r.id) ? 'routable' : 'no card'})`)
    .join(', ');
  console.log(
    `${APP_NAME} listening on :${config.port} · card url ${config.baseUrl} · state ${config.stateDir} · apps: ${apps}`,
  );
});
