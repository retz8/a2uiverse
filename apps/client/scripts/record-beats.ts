/**
 * Re-record beat fixtures through the orchestrator (task 1.4, spec decisions 2–3).
 *
 *   pnpm --filter @a2uiverse/client record:beats -- --model gemini-3.7-flash [--beats 1,2,3]
 *       [--url http://localhost:10001] [--out recordings/beats]
 *
 * Captures what the client receives from the hub — source stamp included — one `BeatBatch` per
 * stream event, into the `BeatFixture` shape the canvas replays. Run against the LLM agent on
 * the stub tool backend so no account data lands in committed fixtures. Beat 3 is a follow-up
 * inside beat 2's conversation, so asking for 3 pulls 2 in and both share one contextId.
 */
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {parseArgs} from 'node:util';
import type {BeatBatch, BeatFixture, BeatTurn} from '../src/beats/beatFixtures';
import {
  extractA2uiMessagesFromEvent,
  extractAgentTextFromEvent,
  extractStampFromEvent,
} from '../src/a2a/messages';
import type {BeatSpec} from './lib/beats';
import {BEATS} from './lib/beats';
import {createSender, driveTurn, parseBeatList, supportedCatalogIds} from './lib/drive';

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

async function main() {
  const {values} = parseArgs({
    options: {
      url: {type: 'string', default: 'http://localhost:10001'},
      beats: {type: 'string', default: '1,2,3'},
      model: {type: 'string'},
      out: {type: 'string', default: 'recordings/beats'},
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
  const sender = await createSender(values.url);
  const catalogIds = await supportedCatalogIds();
  let flagged = 0;

  for (const group of groupsOf(parseBeatList(values.beats))) {
    let contextId: string | undefined;
    let chainedFrom: string | null = null;
    for (const spec of group) {
      const name = nameOf(spec);
      console.log(`▶ ${name}: ${spec.prompt}`);
      let batches: BeatBatch[] = [];
      let driven!: Awaited<ReturnType<typeof driveTurn>>;
      let painted = false;
      for (let attempt = 1; attempt <= MAX_ATTEMPTS && !painted; attempt += 1) {
        batches = [];
        driven = await driveTurn(sender, spec.prompt, contextId, catalogIds, ({atMs, event}) => {
          const messages = extractA2uiMessagesFromEvent(event);
          const texts = extractAgentTextFromEvent(event);
          // The stamp is what makes a recorded composition replay as one: which slot each
          // fragment fills lives on the event, not in the A2UI it carries.
          const stamp = extractStampFromEvent(event);
          if (messages.length || texts.length)
            batches.push({offsetMs: atMs, messages, texts, ...(stamp ? {stamp} : {})});
        });
        contextId = driven.contextId;
        painted = batches.some(b => b.messages.some(m => 'createSurface' in m));
        if (!painted && attempt < MAX_ATTEMPTS)
          console.log(`  attempt ${attempt}: no createSurface — retrying`);
      }
      const turn: BeatTurn = {
        taskId: driven.taskId,
        kind: 'utterance',
        prompt: spec.prompt,
        action: null,
        batches,
        outcome: painted ? 'completed' : 'apology',
        durationMs: driven.durationMs,
      };
      const fixture: BeatFixture = {
        name,
        beat: spec.beat,
        title: spec.title,
        prompt: spec.prompt,
        model: values.model,
        recordedAt: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
        contextId: contextId ?? '',
        chainedFrom,
        turns: [turn],
      };
      const path = resolve(outDir, `${name}.json`);
      await writeFile(path, JSON.stringify(fixture, null, 2) + '\n');
      console.log(
        `  ${painted ? 'ok' : 'FLAGGED (no createSurface)'} · ${batches.length} batches · ${driven.durationMs} ms → ${path}`,
      );
      if (!painted) flagged += 1;
      chainedFrom = name;
    }
  }
  process.exit(flagged ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
