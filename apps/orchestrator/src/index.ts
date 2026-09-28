import {describeFaults} from './agentsPool/faults.js';
import {buildOrchestrator} from './app.js';
import {DEFAULT_HARD_CAP_SECONDS, DEFAULT_SOFT_DEADLINE_SECONDS, loadConfig} from './config.js';

export const APP_NAME = '@a2uiverse/orchestrator';

const config = loadConfig();
const {app, registry, init} = buildOrchestrator({config});

if (!config.googleApiKey) {
  console.warn(`${APP_NAME}: GOOGLE_API_KEY not set — palette turns will fail until it is`);
}
// A changed deadline or an active fault is said once, loudly: a run with either is not a clean one.
if (
  config.softDeadlineMs !== DEFAULT_SOFT_DEADLINE_SECONDS * 1000 ||
  config.hardCapMs !== DEFAULT_HARD_CAP_SECONDS * 1000
) {
  console.warn(
    `${APP_NAME}: deadlines changed — soft ${config.softDeadlineMs / 1000} s (default ${DEFAULT_SOFT_DEADLINE_SECONDS}), hard cap ${config.hardCapMs / 1000} s (default ${DEFAULT_HARD_CAP_SECONDS})`,
  );
}
if (config.faults.size > 0) {
  console.warn(`${APP_NAME}: FAULT MAP ACTIVE — ${describeFaults(config.faults)}`);
}

// The registry is read from the state directory — a damaged one stops the boot here (task-11.4
// decision 9) — and every installed app's card fetched: an agent unreachable now is unroutable
// this run, and stays installed.
await init();

const unroutable = registry.list().filter(r => !registry.card(r.id));
if (unroutable.length > 0) {
  // An unreachable app is unroutable for the whole run, and the failure is otherwise silent — the
  // turn simply finds nothing to route to. Say so once, loudly, at the only moment it is fixable.
  console.warn(
    `${APP_NAME}: no card from ${unroutable.map(r => r.id).join(', ')} — unroutable this run. ` +
      `Start the agents before the orchestrator and restart to pick them up.`,
  );
}

app.listen(config.port, () => {
  const installed = registry.list();
  const apps =
    installed.length === 0
      ? 'none installed — install with `pnpm --filter @a2uiverse/orchestrator registry install`'
      : installed
          .map(r => `${r.id} → ${r.agentUrl} (${registry.card(r.id) ? 'routable' : 'no card'})`)
          .join(', ');
  console.log(
    `${APP_NAME} listening on http://localhost:${config.port} · card url ${config.baseUrl} · state ${config.stateDir} · apps: ${apps}`,
  );
});
