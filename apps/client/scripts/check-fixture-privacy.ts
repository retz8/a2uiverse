/**
 * Fixture privacy gate (task 2.9 decision 9): refuse to ship a recorded beat that carries real
 * account data.
 *
 *   pnpm --filter @a2uiverse/client check:fixtures [-- --dir recordings/beats]
 *
 * Why this exists. A beat recorded through the hub over live MCP is captured **client-side**,
 * and the only thing standing between a real mailbox and a tracked file in this repo is the
 * Gmail agent having been started with `A2UI_RECORD_DIR` set — which is what arms its
 * pseudonymizer. The recorder cannot see whether that happened: it receives whatever the hub
 * relays, scrubbed or not. So the backstop is here, and it fails closed.
 *
 * The needles are the real strings to look for — an account address, a correspondent's name.
 * They are deliberately NOT in this file: they are real personal data, and this repo is public.
 * They come from `A2UI_FIXTURE_FORBIDDEN` (comma-separated), and an unset variable is a failure,
 * not a pass — a check that silently does nothing is worse than no check, because it is trusted.
 *
 * This cannot prove a recording is clean. It proves a specific, known leak is absent.
 */
import {readdir, readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {parseArgs} from 'node:util';

const FORBIDDEN_ENV = 'A2UI_FIXTURE_FORBIDDEN';

async function main() {
  const {values} = parseArgs({options: {dir: {type: 'string', default: 'recordings/beats'}}});

  const raw = process.env[FORBIDDEN_ENV];
  const needles = (raw ?? '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (needles.length === 0) {
    console.error(
      `${FORBIDDEN_ENV} is unset. Set it to the real strings that must not appear in a fixture ` +
        `(account address, correspondent names), comma-separated. Refusing to pass by default.`,
    );
    process.exit(2);
  }

  const dir = resolve(values.dir);
  const files = (await readdir(dir)).filter(f => f.endsWith('.json'));
  let failed = false;

  for (const file of files) {
    const text = (await readFile(resolve(dir, file), 'utf8')).toLowerCase();
    const hits = needles.filter(needle => text.includes(needle.toLowerCase()));
    if (hits.length) {
      failed = true;
      // The needle itself is not printed back — this output can land in a log or a CI page.
      console.error(`✗ ${file}: ${hits.length} forbidden string(s) present`);
    }
  }

  if (failed) {
    console.error(
      `\nA recording carries real data. The likely cause is the Gmail agent having been started ` +
        `without A2UI_RECORD_DIR, which is what arms its pseudonymizer. Re-record; do not edit ` +
        `the fixture by hand.`,
    );
    process.exit(1);
  }
  console.log(`✓ ${files.length} fixture(s) clean against ${needles.length} needle(s)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
