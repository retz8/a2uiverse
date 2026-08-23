/**
 * Transparency + journal check (task 1.4, spec decision 4; phase-1 acceptance 2 and 4).
 *
 *   pnpm --filter @a2uiverse/client check:transparency -- [--agent http://localhost:11001]
 *       [--hub http://localhost:10001] [--journal ../orchestrator/.state/intent-journal.jsonl]
 *       [--prompt "…"]
 *
 * Sends the same utterance direct to the vendor agent and via the orchestrator, then asserts the
 * two A2UI event sequences are equal once the explicit strip list below is applied, and that the
 * intent journal grew by exactly one line for the hub turn. Run against the deterministic agent
 * so the vendor side is stable between the two sends. On demand only — needs live processes.
 */
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {parseArgs} from 'node:util';
import {isDeepStrictEqual} from 'node:util';
import type {A2AStreamEventData} from '../src/a2a/messages';
import {createSender, driveTurn, supportedCatalogIds} from './lib/drive';
import {BEATS} from './lib/beats';

/** A2A envelope ids and clocks — minted per run on both sides. */
const STRIPPED_KEYS = new Set(['id', 'taskId', 'contextId', 'messageId', 'timestamp']);
/** The orchestrator's own metadata namespace (the source stamp, debug ids). */
const STRIPPED_METADATA = 'a2uiverse';
/** Surface ids the agent mints with a per-process counter (`chat-3` → `chat-#`). */
const SURFACE_ID_KEY = 'surfaceId';

/**
 * The orchestrator's envelope: it publishes its own `task` (state `working`, no history, no
 * message) before relaying the vendor's events. That one leading event is the hub's, not the
 * vendor's, and is the only event the comparison may drop — and only when it has that exact shape.
 */
function isOrchestratorEnvelope(event: A2AStreamEventData): boolean {
  return (
    event.kind === 'task' &&
    event.status.state === 'working' &&
    event.status.message === undefined &&
    (event.history === undefined || event.history.length === 0) &&
    (event.artifacts === undefined || event.artifacts.length === 0)
  );
}

function normalize(value: unknown, key?: string): unknown {
  if (Array.isArray(value)) return value.map(v => normalize(v));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (STRIPPED_KEYS.has(k)) continue;
      if (k === 'metadata' && v && typeof v === 'object') {
        const rest = {...(v as Record<string, unknown>)};
        delete rest[STRIPPED_METADATA];
        if (Object.keys(rest).length) out[k] = normalize(rest);
        continue;
      }
      out[k] = normalize(v, k);
    }
    return out;
  }
  if (key === SURFACE_ID_KEY && typeof value === 'string') return value.replace(/-\d+$/, '-#');
  return value;
}

async function journalLines(path: string): Promise<number> {
  try {
    return (await readFile(path, 'utf8')).split('\n').filter(Boolean).length;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return 0;
    throw err;
  }
}

function show(events: A2AStreamEventData[]): string {
  return events.map((e, i) => `  [${i}] ${e.kind}`).join('\n');
}

async function main() {
  const {values} = parseArgs({
    options: {
      agent: {type: 'string', default: 'http://localhost:11001'},
      hub: {type: 'string', default: 'http://localhost:10001'},
      journal: {type: 'string', default: '../orchestrator/.state/intent-journal.jsonl'},
      prompt: {type: 'string', default: BEATS[0].prompt},
    },
  });
  const journal = resolve(values.journal);
  const catalogIds = await supportedCatalogIds();

  console.log(`direct → ${values.agent}`);
  const direct = await driveTurn(
    await createSender(values.agent),
    values.prompt,
    undefined,
    catalogIds,
  );
  const before = await journalLines(journal);
  console.log(`hub    → ${values.hub}`);
  const hub = await driveTurn(await createSender(values.hub), values.prompt, undefined, catalogIds);
  // The journal line lands after the client stream ends; give the append a moment.
  let after = await journalLines(journal);
  for (let i = 0; i < 20 && after === before; i += 1) {
    await new Promise(r => setTimeout(r, 100));
    after = await journalLines(journal);
  }

  let failed = false;
  const hubEvents = hub.events.map(e => e.event);
  if (hubEvents.length && isOrchestratorEnvelope(hubEvents[0])) {
    console.log("· dropped the hub's leading envelope task event");
    hubEvents.shift();
  }
  const a = direct.events.map(e => normalize(e.event));
  const b = hubEvents.map(e => normalize(e));
  if (a.length !== b.length) {
    failed = true;
    console.error(`✗ event count differs: direct ${a.length}, hub ${b.length}`);
    console.error(
      `direct:\n${show(direct.events.map(e => e.event))}\nhub:\n${show(hub.events.map(e => e.event))}`,
    );
  } else {
    const i = a.findIndex((e, idx) => !isDeepStrictEqual(e, b[idx]));
    if (i >= 0) {
      failed = true;
      console.error(`✗ first difference at event [${i}]`);
      console.error(
        `direct:\n${JSON.stringify(a[i], null, 2)}\nhub:\n${JSON.stringify(b[i], null, 2)}`,
      );
    } else {
      console.log(`✓ ${a.length} events equal modulo the strip list`);
    }
  }
  if (after - before !== 1) {
    failed = true;
    console.error(`✗ journal grew by ${after - before} line(s), expected 1 (${journal})`);
  } else {
    console.log(`✓ journal +1 (${journal})`);
  }
  process.exit(failed ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
