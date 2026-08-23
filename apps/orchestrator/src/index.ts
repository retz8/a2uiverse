import {buildOrchestrator} from './app.js';
import {loadConfig} from './config.js';

export const APP_NAME = '@a2uiverse/orchestrator';

const config = loadConfig();
const {app, registry} = buildOrchestrator({config});

app.listen(config.port, () => {
  const apps = registry
    .list()
    .map(r => `${r.id} → ${r.agentUrl}`)
    .join(', ');
  console.log(
    `${APP_NAME} listening on :${config.port} · card url ${config.baseUrl} · state ${config.stateDir} · apps: ${apps}`,
  );
});
