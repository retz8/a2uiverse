/** The marketplace command's entry point: `pnpm --filter @a2uiverse/marketplace marketplace search <words...>`. */
import {runMarketplaceCommand} from './command.js';

process.exitCode = await runMarketplaceCommand(process.argv.slice(2), {
  env: process.env,
  out: line => console.log(line),
  err: line => console.error(line),
});
