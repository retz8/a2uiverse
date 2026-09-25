/**
 * An orchestrator of the recorder's own, for a beat recorded under the fault map (task-8.6
 * decisions 3, 4): started on a port apart from the one in daily use, with the beat's fault map and
 * deadlines in its environment, and stopped once the beat is recorded. Everything else — the
 * Gemini key, the roster — comes from the orchestrator's own `.env`; the environment set here wins
 * over it. The card URL is pinned to the port, or the `.env`'s tunnel URL would send the recorder
 * to the orchestrator in daily use.
 */
import {spawn, type ChildProcess} from 'node:child_process';
import {createWriteStream} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const ORCHESTRATOR_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../../orchestrator');
/** Boot embeds every card before it listens. */
const BOOT_TIMEOUT_MS = 120_000;

export interface OrchestratorEnv {
  port: number;
  /** `A2UIVERSE_FAULTS`. */
  faults: Record<string, unknown>;
  softDeadlineSeconds: number;
  hardCapSeconds: number;
  /** Planner and Synthesizer, so the beat's `model` is what ran. */
  model: string;
}

export interface StartedOrchestrator {
  url: string;
  log: string;
  /** Its intent journal: the orchestrator's own state directory, shared with the one in daily use. */
  journal: string;
  stop(): Promise<void>;
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export async function startOrchestrator(
  env: OrchestratorEnv,
  name: string,
): Promise<StartedOrchestrator> {
  const url = `http://localhost:${env.port}`;
  if (await answers(url)) {
    throw new Error(`port ${env.port} is taken — stop what is on it, or pass --fault-port`);
  }
  const log = resolve(tmpdir(), `a2uiverse-record-${name}.log`);
  const out = createWriteStream(log);
  const child: ChildProcess = spawn('pnpm', ['--dir', ORCHESTRATOR_DIR, 'dev'], {
    env: {
      ...process.env,
      PORT: String(env.port),
      BASE_URL: url,
      A2UIVERSE_FAULTS: JSON.stringify(env.faults),
      A2UIVERSE_SOFT_DEADLINE_SECONDS: String(env.softDeadlineSeconds),
      A2UIVERSE_HARD_CAP_SECONDS: String(env.hardCapSeconds),
      A2UIVERSE_PLANNER_MODEL: env.model,
      A2UIVERSE_SYNTHESIZER_MODEL: env.model,
    },
    // Its own group, so stopping it stops pnpm's children too.
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.pipe(out);
  child.stderr?.pipe(out);
  let exited = false;
  const exit = new Promise<void>(r =>
    child.once('exit', () => {
      exited = true;
      r();
    }),
  );
  const stop = async () => {
    if (!exited && child.pid) {
      try {
        process.kill(-child.pid, 'SIGTERM');
      } catch {
        // Already gone.
      }
      await Promise.race([exit, sleep(10_000)]);
    }
    out.end();
  };
  const deadline = Date.now() + BOOT_TIMEOUT_MS;
  while (!(await answers(url))) {
    if (exited) throw new Error(`the orchestrator exited during boot — see ${log}`);
    if (Date.now() > deadline) {
      await stop();
      throw new Error(`the orchestrator did not boot in ${BOOT_TIMEOUT_MS / 1000} s — see ${log}`);
    }
    await sleep(500);
  }
  const journal = resolve(
    process.env.STATE_DIR ?? resolve(ORCHESTRATOR_DIR, '.state'),
    'intent-journal.jsonl',
  );
  return {url, log, journal, stop};
}

async function answers(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/.well-known/agent-card.json`);
    return res.ok;
  } catch {
    return false;
  }
}
