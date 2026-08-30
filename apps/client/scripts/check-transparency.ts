/**
 * Relay-transparency + journal check, composed form (task 2.9 decision 12; phase-2 acceptance
 * 3 and 7).
 *
 *   pnpm --filter @a2uiverse/client check:transparency -- [--hub http://localhost:10001]
 *       [--journal ../orchestrator/.state/intent-journal.jsonl] [--prompt "…"]
 *       [--agents github=http://localhost:11001,gmail=http://localhost:11002,…]
 *
 * Run against **deterministic** agents, so the vendor side is identical between the two sends.
 * On demand only — needs live processes.
 *
 * Why this shape. "The relay is transparent except its named rewrites" is a *negative* claim:
 * nothing else is touched. A unit test on `composeFragment` proves that function does what it
 * says; only an end-to-end comparison proves no fourth rewrite happens elsewhere in the
 * pipeline. So the comparison survives composition rather than being retired for it.
 *
 * What composition changed. The Phase-1 version sent the same utterance both ways. It cannot
 * now: the Planner authors a *per-agent request* and dispatches that, so the vendor is asked a
 * different question than the user asked. The plan is recorded on the turn's journal line, so
 * the check reads each slot's request from there and sends exactly that direct — which is what
 * puts both sides back on the same question.
 */
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {parseArgs} from 'node:util';
import {isDeepStrictEqual} from 'node:util';
import type {A2AStreamEventData} from '../src/a2a/messages';
import {extractStampFromEvent} from '../src/a2a/messages';
import {createSender, driveTurn, supportedCatalogIds} from './lib/drive';
import {BEATS} from './lib/beats';

/** A2A envelope ids and clocks — minted per run on both sides. */
const STRIPPED_KEYS = new Set(['id', 'taskId', 'contextId', 'messageId', 'timestamp']);
/** The orchestrator's own metadata namespace (the source stamp, debug ids). */
const STRIPPED_METADATA = 'a2uiverse';
/** Surface ids the agent mints with a per-process counter (`chat-3` → `chat-#`). */
const SURFACE_ID_KEY = 'surfaceId';
/** The A2UI ops whose surfaceId the hub namespaces. */
const A2UI_OPS = ['createSurface', 'updateComponents', 'updateDataModel', 'deleteSurface'];
const TERMINAL = new Set(['completed', 'failed', 'canceled', 'rejected']);

const DEFAULT_AGENTS =
  'github=http://localhost:11001,gmail=http://localhost:11002,calendar=http://localhost:11003';

/**
 * The hub's envelope: it publishes its own `task` (state `working`, no history, no message)
 * before relaying anything. That one leading event is the hub's, not a vendor's.
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

/**
 * Un-namespace `<appId>:<surfaceId>` back to the vendor's own id — the inverse of the hub's one
 * A2UI rewrite, applied so the comparison sees the vendor's stream as the vendor sent it.
 */
function unnamespace(value: unknown, appId: string): unknown {
  if (Array.isArray(value)) return value.map(v => unnamespace(v, appId));
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (A2UI_OPS.includes(k) && v && typeof v === 'object') {
      const body = v as Record<string, unknown>;
      const id = body[SURFACE_ID_KEY];
      out[k] =
        typeof id === 'string' && id.startsWith(`${appId}:`)
          ? {...body, [SURFACE_ID_KEY]: id.slice(appId.length + 1)}
          : unnamespace(body, appId);
      continue;
    }
    out[k] = unnamespace(v, appId);
  }
  return out;
}

/**
 * Demote terminal envelopes on BOTH sides.
 *
 * This is the rewrite the phase spec's "exactly three" does not name: under fan-out several
 * vendors end on one orchestrator task, so `composeFragment` rewrites each vendor's final into a
 * non-final working status and the executor owns the single turn-final. It is A2A envelope
 * bookkeeping rather than an A2UI content rewrite, but it is a fourth transformation of the
 * relayed stream and the comparison cannot pretend otherwise. Normalising both sides keeps the
 * comparison honest about everything else; the demotion itself is asserted separately below.
 */
function demote(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(demote);
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (k === 'final') out[k] = false;
    else if (k === 'state' && typeof v === 'string' && TERMINAL.has(v)) out[k] = 'working';
    else out[k] = demote(v);
  }
  return out;
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

/** Every surfaceId mentioned by an event's A2UI payload. */
function surfaceIdsOf(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const v of value) surfaceIdsOf(v, found);
    return found;
  }
  if (!value || typeof value !== 'object') return found;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (A2UI_OPS.includes(k) && v && typeof v === 'object') {
      const id = (v as Record<string, unknown>)[SURFACE_ID_KEY];
      if (typeof id === 'string') found.push(id);
    }
    surfaceIdsOf(v, found);
  }
  return found;
}

interface JournalEntry {
  plan?: {groups: Array<{slots: Array<{appId: string; request: string}>}>};
  dispatch?: Array<{appId?: string}>;
  embedding?: number[] | null;
}

async function journalLines(path: string): Promise<string[]> {
  try {
    return (await readFile(path, 'utf8')).split('\n').filter(Boolean);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw err;
  }
}

function show(events: A2AStreamEventData[]): string {
  return events.map((e, i) => `  [${i}] ${e.kind}`).join('\n');
}

async function main() {
  const {values} = parseArgs({
    options: {
      hub: {type: 'string', default: 'http://localhost:10001'},
      journal: {type: 'string', default: '../orchestrator/.state/intent-journal.jsonl'},
      prompt: {type: 'string', default: BEATS[0].prompt},
      agents: {type: 'string', default: DEFAULT_AGENTS},
    },
  });
  const journal = resolve(values.journal);
  const catalogIds = await supportedCatalogIds();
  const agentUrls = new Map(
    values.agents.split(',').map(pair => {
      const [id, url] = pair.split('=');
      return [id.trim(), url?.trim()] as [string, string];
    }),
  );

  const before = (await journalLines(journal)).length;
  console.log(`hub → ${values.hub}`);
  const hub = await driveTurn(await createSender(values.hub), values.prompt, undefined, catalogIds);

  // The journal line lands after the client stream ends; give the append a moment.
  let lines = await journalLines(journal);
  for (let i = 0; i < 20 && lines.length === before; i += 1) {
    await new Promise(r => setTimeout(r, 100));
    lines = await journalLines(journal);
  }

  let failed = false;
  const bad = (msg: string) => {
    failed = true;
    console.error(`✗ ${msg}`);
  };

  // ── Acceptance 7: one journal line per turn, embedded, recording every fan-out target ──
  if (lines.length - before !== 1) {
    bad(`journal grew by ${lines.length - before} line(s), expected 1 (${journal})`);
    process.exit(1);
  }
  console.log(`✓ journal +1 (${journal})`);
  const entry = JSON.parse(lines[lines.length - 1]) as JournalEntry;
  const planned = (entry.plan?.groups ?? []).flatMap(g => g.slots);
  if (planned.length === 0) bad('the journal line carries no plan — nothing was routed');
  if (!entry.embedding || entry.embedding.length === 0)
    bad('the journal line has a null embedding');
  else console.log(`✓ embedding non-null (${entry.embedding.length} dims)`);

  const dispatched = new Set((entry.dispatch ?? []).map(d => d.appId));
  const missing = planned.map(s => s.appId).filter(id => !dispatched.has(id));
  if (missing.length) bad(`plan targeted ${missing.join(', ')} but the dispatch list omits them`);
  else console.log(`✓ dispatch records all ${planned.length} fan-out target(s)`);

  // ── Acceptance 3, client-observable half: no surface crosses a namespace ──
  for (const {event} of hub.events) {
    const stamp = extractStampFromEvent(event);
    if (stamp?.role !== 'fragment') continue;
    for (const id of surfaceIdsOf(event)) {
      if (!id.startsWith(`${stamp.source}:`)) {
        bad(`event stamped '${stamp.source}' carries surface '${id}' from another namespace`);
      }
    }
  }
  if (!failed) console.log('✓ every relayed surface sits in its own source’s namespace');

  // ── The relay comparison, per planned slot ──
  for (const slot of planned) {
    const url = agentUrls.get(slot.appId);
    if (!url) {
      bad(`no agent url for '${slot.appId}' — pass it in --agents`);
      continue;
    }
    console.log(`\ndirect → ${slot.appId} @ ${url}`);
    console.log(`  request: ${slot.request}`);
    const direct = await driveTurn(await createSender(url), slot.request, undefined, catalogIds);

    const relayed = hub.events
      .map(e => e.event)
      .filter(e => !isOrchestratorEnvelope(e))
      .filter(e => extractStampFromEvent(e)?.source === slot.appId);

    // The hub owns the turn-final, so no vendor's stream may still carry one.
    const stillFinal = relayed.filter(e => e.kind === 'status-update' && e.final);
    if (stillFinal.length) bad(`${slot.appId}: a vendor final survived the relay`);

    const a = direct.events.map(e => normalize(demote(e.event)));
    const b = relayed.map(e => normalize(demote(unnamespace(e, slot.appId))));
    if (a.length !== b.length) {
      bad(`${slot.appId}: event count differs — direct ${a.length}, hub ${b.length}`);
      console.error(`direct:\n${show(direct.events.map(e => e.event))}\nhub:\n${show(relayed)}`);
      continue;
    }
    const i = a.findIndex((e, idx) => !isDeepStrictEqual(e, b[idx]));
    if (i >= 0) {
      bad(`${slot.appId}: first difference at event [${i}]`);
      console.error(
        `direct:\n${JSON.stringify(a[i], null, 2)}\nhub:\n${JSON.stringify(b[i], null, 2)}`,
      );
    } else {
      console.log(`✓ ${slot.appId}: ${a.length} events equal modulo the named rewrites`);
    }
  }

  process.exit(failed ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
