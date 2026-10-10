import {buildMarketplace} from './app.js';
import {loadConfig} from './config.js';
import {APP_NAME, logLine} from './log.js';
import {describeFlag} from './api.js';

const config = loadConfig();
const {app, marketplace, init, refresh} = buildMarketplace({config});

// The served subtree is read from the state directory — a damaged one stops the boot here
// (task-13.3 decision 15) — and every published card embedded.
await init();

app.listen(config.port, () => {
  const entries = marketplace.entries();
  const apps =
    entries.length === 0
      ? 'none published'
      : entries.map(e => `${e.appId} (${e.publisher}, ${e.card.version})`).join(', ');
  console.log(
    `${APP_NAME} listening on http://localhost:${config.port} · state ${config.stateDir} · apps: ${apps}`,
  );
  // The refresh runs in the background (decision 9): a publisher's agent being down holds no read.
  void refresh().then(() => {
    for (const entry of marketplace.entries()) {
      if (entry.aheadOfStore) {
        logLine(`${entry.appId} is ahead of the Store: ${describeFlag(entry.aheadOfStore)}`);
      }
    }
  });
});
