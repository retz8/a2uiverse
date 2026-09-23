/**
 * Re-record beat fixtures through the orchestrator (task 1.4, spec decisions 2–3).
 *
 *   pnpm --filter @a2uiverse/client record:beats -- --model gemini-3.7-flash [--beats 1,2,10-18]
 *       [--url http://localhost:10001] [--fault-port 10091] [--out recordings/beats]
 *
 * Captures what the client receives from the hub — source stamp and synthesis payload included — one `BeatBatch` per
 * stream event, into the `BeatFixture` shape the canvas replays. Run against the LLM agent on
 * the stub tool backend so no account data lands in committed fixtures. Beat 3 is a follow-up
 * inside beat 2's conversation, so asking for 3 pulls 2 in and both share one contextId.
 *
 * Beats 10–18 are Phase 8's cases (task 8.6): each runs through an orchestrator the recorder
 * starts on `--fault-port` with the case's fault map and deadlines, over the agents already
 * running — the deterministic roster. The reader's presses and the client's failure report are
 * sent on streams of their own, as the canvas sends them, and recorded beside the turn. A take
 * that does not show its case is taken again.
 */
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {parseArgs} from 'node:util';
import type {A2AMessageSender} from '../src/a2a/client';
import {VALIDATION_FAILED} from '../src/a2a/messages';
import type {BeatBatch, BeatFixture, BeatTurn} from '../src/beats/beatFixtures';
import {batchOf} from './lib/batch';
import type {BeatSpec, FaultCase, RecordedCase} from './lib/beats';
import {BEATS} from './lib/beats';
import {
  createSender,
  drivePress,
  driveReport,
  driveTurn,
  parseBeatList,
  supportedCatalogIds,
  type DrivenTurn,
  type TimedEvent,
} from './lib/drive';
import {startOrchestrator} from './lib/orchestrator';

/** The orchestrator's own defaults (`apps/orchestrator/src/config.ts`), unless a case shortens one. */
const SOFT_DEADLINE_SECONDS = 10;
const HARD_CAP_SECONDS = 300;

/** Like the source recorder: a turn that never painted is retried before it is flagged. */
const MAX_ATTEMPTS = 3;

const nameOf = (spec: BeatSpec) => `beat-${spec.beat}-${spec.slug}`;

/** Group the wanted beats so a chained beat always follows the beat it continues. */
function groupsOf(wanted: number[]): BeatSpec[][] {
  const set = new Set(wanted);
  for (const spec of BEATS) if (spec.chains && set.has(spec.beat)) set.add(spec.beat - 1);
  const groups: BeatSpec[][] = [];
  for (const spec of BEATS) {
    if (!set.has(spec.beat)) continue;
    if (spec.chains && groups.length) groups[groups.length - 1].push(spec);
    else groups.push([spec]);
  }
  return groups;
}

/** One take of a turn: its batches, and when it painted. */
async function takeTurn(
  sender: A2AMessageSender,
  prompt: string,
  contextId: string | undefined,
  catalogIds: string[],
): Promise<{batches: BeatBatch[]; driven: DrivenTurn}> {
  const batches: BeatBatch[] = [];
  const driven = await driveTurn(sender, prompt, contextId, catalogIds, collect(batches));
  return {batches, driven};
}

const collect =
  (batches: BeatBatch[]) =>
  ({atMs, event}: TimedEvent) => {
    const batch = batchOf(event, atMs);
    if (batch) batches.push(batch);
  };

const painted = (batches: readonly BeatBatch[]) =>
  batches.some(b => b.messages.some(m => 'createSurface' in m));

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/** A stream beside the turn, as the beat keeps it. */
const besideTurn = (
  kind: 'press' | 'failure-report',
  atMs: number,
  batches: BeatBatch[],
  driven: DrivenTurn,
  extra: Partial<BeatTurn> = {},
): BeatTurn => ({
  taskId: driven.taskId,
  kind,
  prompt: '',
  action: null,
  ...extra,
  atMs,
  batches,
  outcome: 'completed',
  durationMs: driven.durationMs,
});

/**
 * One take of a Phase 8 case, in a fresh conversation: the turn to its final, then the client's
 * report, then each press once its time has come — each on a stream of its own, timed from the
 * turn's send.
 */
async function takeCase(
  sender: A2AMessageSender,
  spec: BeatSpec,
  fault: FaultCase,
  catalogIds: string[],
): Promise<{turns: BeatTurn[]; contextId: string; recorded: RecordedCase}> {
  const started = performance.now();
  const since = () => Math.round(performance.now() - started);
  const {batches, driven} = await takeTurn(sender, spec.prompt, undefined, catalogIds);
  const contextId = driven.contextId ?? '';
  const turns: BeatTurn[] = [
    {
      taskId: driven.taskId,
      kind: 'utterance',
      prompt: spec.prompt,
      action: null,
      batches,
      outcome: painted(batches) ? 'completed' : 'apology',
      durationMs: driven.durationMs,
    },
  ];
  const recorded: RecordedCase = {turn: batches, presses: [], report: undefined};

  // The canvas judges its fragments once the turn's stream ends, and reports what it cannot draw.
  if (fault.report) {
    const surfaceId = batches
      .filter(b => b.stamp?.role === 'fragment' && b.stamp.source === fault.report)
      .flatMap(b => b.messages)
      .map(m => (m as {createSurface?: {surfaceId: string}}).createSurface?.surfaceId)
      .find(Boolean);
    if (surfaceId) {
      const atMs = since();
      const answer: BeatBatch[] = [];
      const reported = await driveReport(
        sender,
        {
          code: VALIDATION_FAILED,
          surfaceId,
          path: '/',
          message: 'components failed catalog validation',
        },
        contextId,
        catalogIds,
        collect(answer),
      );
      turns.push(besideTurn('failure-report', atMs, answer, reported));
      recorded.report = answer;
    }
  }

  for (const press of fault.presses ?? []) {
    const wait = (press.atLeastMs ?? 0) - since();
    if (wait > 0) await sleep(wait);
    const atMs = since();
    const answer: BeatBatch[] = [];
    const pressed = await drivePress(
      sender,
      press.operation,
      contextId,
      catalogIds,
      collect(answer),
    );
    turns.push(besideTurn('press', atMs, answer, pressed, {operation: press.operation}));
    recorded.presses.push(answer);
  }
  return {turns, contextId, recorded};
}

async function main() {
  const {values} = parseArgs({
    options: {
      url: {type: 'string', default: 'http://localhost:10001'},
      beats: {type: 'string', default: '1,2,3'},
      model: {type: 'string'},
      out: {type: 'string', default: 'recordings/beats'},
      'fault-port': {type: 'string', default: '10091'},
    },
  });
  if (!values.model) {
    console.error(
      '--model <name> is required (the model the agent was started with; recorded, not detected)',
    );
    process.exit(2);
  }
  const outDir = resolve(values.out);
  await mkdir(outDir, {recursive: true});
  const wanted = parseBeatList(values.beats);
  const catalogIds = await supportedCatalogIds();
  const recordedAt = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  let flagged = 0;

  const plain = wanted.filter(beat => !BEATS.find(spec => spec.beat === beat)?.fault);
  if (plain.length > 0) {
    const sender = await createSender(values.url);
    for (const group of groupsOf(plain)) {
      let contextId: string | undefined;
      let chainedFrom: string | null = null;
      for (const spec of group) {
        const name = nameOf(spec);
        console.log(`▶ ${name}: ${spec.prompt}`);
        let take!: Awaited<ReturnType<typeof takeTurn>>;
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
          take = await takeTurn(sender, spec.prompt, contextId, catalogIds);
          if (painted(take.batches) || attempt === MAX_ATTEMPTS) break;
          console.log(`  attempt ${attempt}: no createSurface — retrying`);
        }
        const {batches, driven} = take;
        contextId = driven.contextId;
        const ok = painted(batches);
        const fixture: BeatFixture = {
          name,
          beat: spec.beat,
          title: spec.title,
          prompt: spec.prompt,
          model: values.model,
          recordedAt: recordedAt(),
          contextId: contextId ?? '',
          chainedFrom,
          turns: [
            {
              taskId: driven.taskId,
              kind: 'utterance',
              prompt: spec.prompt,
              action: null,
              batches,
              outcome: ok ? 'completed' : 'apology',
              durationMs: driven.durationMs,
            },
          ],
        };
        const path = await write(outDir, fixture);
        // The client-side first-paint reading (task 6.6 decision 3): the shell's layout, then the
        // first vendor fragment, as offsets from send.
        const paintAt = (test: (b: BeatBatch) => boolean) =>
          batches.find(b => b.messages.some(m => 'createSurface' in m) && test(b))?.offsetMs;
        const layoutMs = paintAt(b => b.stamp?.role === 'shell');
        const fragmentMs = paintAt(b => b.stamp?.role === 'fragment' && b.stamp.source !== 'shell');
        console.log(
          `  ${ok ? 'ok' : 'FLAGGED (no createSurface)'} · ${batches.length} batches · ${driven.durationMs} ms` +
            ` · layout ${layoutMs ?? '—'} ms · first fragment ${fragmentMs ?? '—'} ms → ${path}`,
        );
        if (!ok) flagged += 1;
        chainedFrom = name;
      }
    }
  }

  for (const spec of BEATS.filter(s => s.fault && wanted.includes(s.beat))) {
    const fault = spec.fault!;
    const name = nameOf(spec);
    const deadlines = {
      softDeadlineSeconds: SOFT_DEADLINE_SECONDS,
      hardCapSeconds: fault.hardCapSeconds ?? HARD_CAP_SECONDS,
    };
    console.log(`▶ ${name}: ${spec.prompt} · faults ${JSON.stringify(fault.faults)}`);
    const orchestrator = await startOrchestrator(
      {port: Number(values['fault-port']), faults: fault.faults, model: values.model, ...deadlines},
      name,
    );
    console.log(`  orchestrator on ${orchestrator.url} · log ${orchestrator.log}`);
    try {
      const sender = await createSender(orchestrator.url);
      let take!: Awaited<ReturnType<typeof takeCase>>;
      let problem: string | undefined;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        take = await takeCase(sender, spec, fault, catalogIds);
        problem = painted(take.recorded.turn) ? fault.shows(take.recorded) : 'nothing painted';
        if (!problem || attempt === MAX_ATTEMPTS) break;
        console.log(`  attempt ${attempt}: ${problem} — retrying`);
      }
      const fixture: BeatFixture = {
        name,
        beat: spec.beat,
        title: spec.title,
        prompt: spec.prompt,
        model: values.model,
        recordedAt: recordedAt(),
        contextId: take.contextId,
        chainedFrom: null,
        deadlines,
        faults: fault.faults,
        turns: take.turns,
      };
      const path = await write(outDir, fixture);
      const sides = take.turns.slice(1).map(t => `${t.kind} at ${t.atMs} ms (${t.batches.length})`);
      console.log(
        `  ${problem ? `FLAGGED (${problem})` : 'ok'} · ${take.recorded.turn.length} batches` +
          `${sides.length ? ` · ${sides.join(' · ')}` : ''} → ${path}`,
      );
      if (problem) flagged += 1;
    } finally {
      await orchestrator.stop();
    }
  }
  process.exit(flagged ? 1 : 0);
}

async function write(outDir: string, fixture: BeatFixture): Promise<string> {
  const path = resolve(outDir, `${fixture.name}.json`);
  await writeFile(path, JSON.stringify(fixture, null, 2) + '\n');
  return path;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
