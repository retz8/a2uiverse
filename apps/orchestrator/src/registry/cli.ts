/** The registry command's entry point: `pnpm --filter @a2uiverse/orchestrator registry <verb> …`. */
import {runRegistryCommand} from './command.js';

process.exitCode = await runRegistryCommand(process.argv.slice(2), {
  env: process.env,
  // pnpm runs a package script in the package's directory; the caller's is INIT_CWD.
  cwd: process.env.INIT_CWD ?? process.cwd(),
  packageDir: process.cwd(),
  out: line => console.log(line),
  err: line => console.error(line),
});
