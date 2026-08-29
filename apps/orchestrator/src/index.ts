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

app.listen(config.port, () => {
  const apps = registry
    .list()
    .map(r => `${r.id} → ${r.agentUrl} (${registry.card(r.id) ? 'routable' : 'no card'})`)
    .join(', ');
  console.log(
    `${APP_NAME} listening on :${config.port} · card url ${config.baseUrl} · state ${config.stateDir} · apps: ${apps}`,
  );
});
