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
 * Both sides are signed in through the real flow (task-12.12 decision 7): the hub first, as the
 * recorder signs it in — each app as its one fake account, numbered by the orchestrator — and the
 * direct side with a token of its own taken straight from each agent through the non-interactive
 * entry, or with the app's demo key. The direct side pairs a slot's source with the account from the
 * hub's sign-in result: the i-th source the hub reported for an app is the i-th fake account named
 * for it, no number assumed. A slot on an account the vault held beside those has no pair, and is
 * not compared.
 *
 * The agents compared against are every app the hub has installed, each reached at its card URL
 * and sent the entitlement the hub advertises to it (task-11.6 decision 13); `--agents` overrides
 * an app's URL.
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
import {parseSourceId} from '@a2uiverse/sdk';
import {TaskState} from '@a2a-js/sdk';
import type {A2AStreamEventData} from '../src/a2a/messages';
import {extractStampFromEvent, messageOf} from '../src/a2a/messages';
import {createSender, driveTurn, supportedCatalogIds} from './lib/drive';
import {installedApps} from './lib/registry';
import {
  agentHeaders,
  fakeAccountOf,
  heldBeside,
  openCanvas,
  signIn,
  signInLine,
} from './lib/signIn';
import {BEATS} from './lib/beats';

/** A2A envelope ids and clocks — minted per run on both sides. */
const STRIPPED_KEYS = new Set(['id', 'taskId', 'contextId', 'messageId', 'timestamp']);
/** The orchestrator's own metadata namespace (the source stamp, debug ids). */
const STRIPPED_METADATA = 'a2uiverse';
/** Surface ids the agent mints with a per-process counter (`chat-3` → `chat-#`). */
const SURFACE_ID_KEY = 'surfaceId';
/** The A2UI ops whose surfaceId the hub namespaces. */
const A2UI_OPS = ['createSurface', 'updateComponents', 'updateDataModel', 'deleteSurface'];
/** Besides them, the surface a vendor's `paintMeta` titles (task 10.9). */
const NAMESPACED = [...A2UI_OPS, 'paintMeta'];

/**
 * The hub's envelope: it publishes its own task before relaying anything, and no vendor's task
 * reaches the private wire as one (task-20.1 decision 6). That one leading event is the hub's.
 */
function isOrchestratorEnvelope(event: A2AStreamEventData): boolean {
  return event.payload?.$case === 'task';
}

/**
 * Un-namespace `<source>:<surfaceId>` back to the vendor's own id — the inverse of the hub's one
 * A2UI rewrite and of the same rewrite on a `paintMeta`, applied so the comparison sees the
 * vendor's stream as the vendor sent it.
 */
function unnamespace(value: unknown, source: string): unknown {
  if (Array.isArray(value)) return value.map(v => unnamespace(v, source));
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (NAMESPACED.includes(k) && v && typeof v === 'object') {
      const body = v as Record<string, unknown>;
      const id = body[SURFACE_ID_KEY];
      out[k] =
        typeof id === 'string' && id.startsWith(`${source}:`)
          ? {...body, [SURFACE_ID_KEY]: id.slice(source.length + 1)}
          : unnamespace(body, source);
      continue;
    }
    out[k] = unnamespace(v, source);
  }
  return out;
}

/**
 * An event as the private wire carries it, applied to BOTH sides (task-20.1 decision 6).
 *
 * This is the rewrite the phase spec's "exactly three" does not name: under fan-out several
 * vendors end on one orchestrator task, so `composeFragment` reshapes each vendor's event into a
 * `working` status update of that task — a vendor's task becomes a status update carrying its
 * status message, a bare message a status update carrying that message, every state `working` —
 * and relays an artifact update as it is; the executor owns the turn's one terminal update. It is
 * A2A envelope bookkeeping rather than an A2UI content rewrite, but it is a fourth transformation
 * of the relayed stream and the comparison cannot pretend otherwise. Reducing both sides to what
 * the wire carries keeps the comparison honest about everything else; the reshaping itself is
 * asserted separately below.
 */
function onTheWire(event: A2AStreamEventData): unknown {
  const payload = event.payload;
  if (payload?.$case === 'artifactUpdate') return {artifactUpdate: payload.value};
  return {statusUpdate: {message: messageOf(event), metadata: payload?.value.metadata}};
}

/** Whether a relayed event is in a shape the private wire carries after the hub's task. */
function inWireShape(event: A2AStreamEventData): boolean {
  const payload = event.payload;
  if (payload?.$case === 'artifactUpdate') return true;
  return (
    payload?.$case === 'statusUpdate' &&
    payload.value.status?.state === TaskState.TASK_STATE_WORKING
  );
}

function normalize(value: unknown, key?: string): unknown {
  if (Array.isArray(value)) return value.map(v => normalize(v));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      // A key left out and a key holding nothing are one thing: the two sides come through
      // different codecs of the SDK.
      if (STRIPPED_KEYS.has(k) || v === undefined) continue;
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

/** Every surfaceId mentioned by an event's A2UI payload and its `paintMeta`. */
function surfaceIdsOf(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const v of value) surfaceIdsOf(v, found);
    return found;
  }
  if (!value || typeof value !== 'object') return found;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (NAMESPACED.includes(k) && v && typeof v === 'object') {
      const id = (v as Record<string, unknown>)[SURFACE_ID_KEY];
      if (typeof id === 'string') found.push(id);
    }
    surfaceIdsOf(v, found);
  }
  return found;
}

interface JournalEntry {
  /** The Planner's layout surface (task 6.4): each source dispatched with its request, `shell` the merged view, a gap no source. */
  plan?: {layoutSurface?: {dispatch?: Array<{source?: string; request?: string; gap?: string}>}};
  dispatch?: Array<{source?: string}>;
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

/** Wait until the journal stops growing: each line is embedded before it lands. */
async function journalSettled(path: string): Promise<void> {
  let count = (await journalLines(path)).length;
  for (let quiet = 0; quiet < 3;) {
    await new Promise(r => setTimeout(r, 1000));
    const now = (await journalLines(path)).length;
    quiet = now === count ? quiet + 1 : 0;
    count = now;
  }
}

function show(events: A2AStreamEventData[]): string {
  return events.map((e, i) => `  [${i}] ${e.payload?.$case ?? '(empty)'}`).join('\n');
}

async function main() {
  const {values} = parseArgs({
    options: {
      hub: {type: 'string', default: 'http://localhost:10001'},
      journal: {type: 'string', default: '../orchestrator/.state/intent-journal.jsonl'},
      prompt: {type: 'string', default: BEATS[0].prompt},
      agents: {type: 'string'},
    },
  });
  const journal = resolve(values.journal);
  const catalogIds = await supportedCatalogIds();
  /** Each agent the direct side reaches: where, and the catalogs the hub advertises to it. */
  const agents = new Map<string, {url: string; path?: string; catalogIds: string[]}>(
    (await installedApps(values.hub)).map(app => [
      app.id,
      {url: app.cardUrl, path: '', catalogIds: app.entitlement},
    ]),
  );
  for (const pair of values.agents?.split(',') ?? []) {
    const [id, url] = pair.split('=').map(part => part?.trim());
    if (!id || !url) continue;
    agents.set(id, {url, catalogIds: agents.get(id)?.catalogIds ?? catalogIds});
  }

  const hubSender = await createSender(values.hub);
  const signedIn = await signIn(values.hub, await openCanvas(hubSender, catalogIds));
  const beside = await heldBeside(values.hub, signedIn);
  console.log(`hub ${signInLine(signedIn, beside)}`);
  // The canvas signed in from writes its own journal line: wait for it before counting.
  await journalSettled(journal);

  const before = (await journalLines(journal)).length;
  console.log(`hub → ${values.hub}`);
  const hub = await driveTurn(hubSender, values.prompt, undefined, catalogIds);

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
  const planned = (entry.plan?.layoutSurface?.dispatch ?? []).flatMap(d =>
    d.source && d.source !== 'shell' && d.request ? [{source: d.source, request: d.request}] : [],
  );
  if (planned.length === 0) bad('the journal line carries no plan — nothing was routed');
  if (!entry.embedding || entry.embedding.length === 0)
    bad('the journal line has a null embedding');
  else console.log(`✓ embedding non-null (${entry.embedding.length} dims)`);

  const dispatched = new Set((entry.dispatch ?? []).map(d => d.source));
  const missing = planned.map(s => s.source).filter(id => !dispatched.has(id));
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
    if (beside.some(account => account.source === slot.source)) {
      console.log(`\n– ${slot.source}: an account this run did not sign in, not compared`);
      continue;
    }
    // A source names the app and the account it painted under: the agent is the app's (task 12.4).
    const named = parseSourceId(slot.source);
    const appId = named?.appId ?? slot.source;
    const agent = agents.get(appId);
    if (!agent) {
      bad(`'${appId}' is not installed on the hub — pass its url in --agents`);
      continue;
    }
    const relayed = hub.events
      .map(e => e.event)
      .filter(e => !isOrchestratorEnvelope(e))
      .filter(e => extractStampFromEvent(e)?.source === slot.source)
      // The hub's own marker after a source's last event (task 8.7), carrying no parts: not relayed.
      .filter(e => !extractStampFromEvent(e)?.settled);

    // The plan's request. The hub adds sentences after it — the credential guidance (task 12.7),
    // the person's local time — and a vendor's echo of what it was sent, in its task's history,
    // no longer rides the private wire (task-20.1 decision 6); a deterministic agent answers the
    // plan's request and the hub's longer one alike.
    const request = slot.request;
    console.log(`\ndirect → ${slot.source} @ ${agent.url}`);
    console.log(`  request: ${request}`);
    const as = fakeAccountOf(slot.source, signedIn);
    const headers = as ? await agentHeaders(agent.url, as) : {};
    const direct = await driveTurn(
      await createSender(agent.url, agent.path, headers),
      request,
      undefined,
      agent.catalogIds,
    );

    // The hub owns the turn's one terminal update, so everything relayed is a working status
    // update of its task, or an artifact update.
    if (!relayed.every(inWireShape)) {
      bad(`${slot.source}: a vendor's task, message or state survived the relay`);
    }

    const a = direct.events.map(e => normalize(onTheWire(e.event)));
    const b = relayed.map(e => normalize(unnamespace(onTheWire(e), slot.source)));
    if (a.length !== b.length) {
      bad(`${slot.source}: event count differs — direct ${a.length}, hub ${b.length}`);
      console.error(`direct:\n${show(direct.events.map(e => e.event))}\nhub:\n${show(relayed)}`);
      continue;
    }
    const i = a.findIndex((e, idx) => !isDeepStrictEqual(e, b[idx]));
    if (i >= 0) {
      bad(`${slot.source}: first difference at event [${i}]`);
      console.error(
        `direct:\n${JSON.stringify(a[i], null, 2)}\nhub:\n${JSON.stringify(b[i], null, 2)}`,
      );
    } else {
      console.log(`✓ ${slot.source}: ${a.length} events equal modulo the named rewrites`);
    }
  }

  process.exit(failed ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
