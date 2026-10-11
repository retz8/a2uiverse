/**
 * The launcher's side of the marketplace under `--publish` (task-13.6 decisions 3 to 5, 11 and 13):
 * the dev publisher — one fixed name, kept in a file of the launcher's own in the shape of
 * Stellify's publisher file — established against a marketplace whose state can be wiped; the
 * ahead-of-the-Store notices left for the end; the listing's words. Stellify's API is called with
 * the address and the token explicit; the person's home-directory publisher file is never read or
 * written (task-13.4 decision 1).
 *
 * The file and the marketplace can disagree. No file: the name is claimed. A marketplace that no
 * longer knows the file's token — its state wiped — has disowned it: the name is claimed again and
 * the file rewritten. A claim refused as taken means the name is held under a token the launcher no
 * longer has; a file naming another marketplace, or another publisher, holds a token that
 * marketplace may still know, and so does a token the marketplace says is another publisher's.
 * Each stops the marketplace path: a token is overwritten only once the marketplace has disowned it.
 */
import {mkdir, readFile, rename, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';

/** The dev publisher's name (decision 3): what the Store shows as the roster apps' publisher. */
export const DEV_PUBLISHER = 'a2uiverse-apps';

/**
 * The launcher's publisher file (decision 4), gitignored as every `.state/` is. `STELLIFY_HOME`
 * pointed at its directory gives Stellify's command line the dev publisher by hand.
 */
export const publisherFileOf = scriptsDir =>
  join(scriptsDir, '.state', 'stellify', 'publisher.json');

/** The marketplace's route answering whose a bearer token is: the sdk's `MARKETPLACE_ROUTES.publisher`. */
const PUBLISHER_ROUTE = 'publisher';

/**
 * Whose the token is, asked of the marketplace (task-14.4 decision 18): `{ok: true, publisher}`;
 * `{ok: false, status, findings}` — 401 for a token it does not know; `{ok: false, findings}` with no
 * status when it cannot be reached.
 */
export async function publisherOfToken({marketplace, token}, fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl(`${marketplace.replace(/\/$/, '')}/${PUBLISHER_ROUTE}`, {
      headers: {authorization: `Bearer ${token}`},
    });
  } catch (err) {
    return {
      ok: false,
      findings: [`cannot reach the marketplace at ${marketplace}: ${err.message}`],
    };
  }
  const body = await response.json().catch(() => undefined);
  if (response.ok && typeof body?.publisher === 'string') {
    return {ok: true, publisher: body.publisher};
  }
  const findings = Array.isArray(body?.findings)
    ? body.findings
    : [`the marketplace answered ${response.status} to ${PUBLISHER_ROUTE}`];
  return {ok: false, status: response.status, findings};
}

/** The file as read: `{record}`, `{none: true}` when there is none, `{damaged: reason}`. */
export async function readPublisherFile(path) {
  let text;
  try {
    text = await readFile(path, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return {none: true};
    return {damaged: `cannot read ${path}: ${err.message}`};
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return {damaged: `${path} is not JSON: ${err.message}`};
  }
  for (const field of ['marketplace', 'publisher', 'token']) {
    if (typeof parsed?.[field] !== 'string' || parsed[field] === '') {
      return {damaged: `${path} is not a publisher file: no ${field}`};
    }
  }
  const {marketplace, publisher, token} = parsed;
  return {record: {marketplace, publisher, token}};
}

/** Writes the record owner-only, the directory created as needed, through a temporary file. */
export async function writePublisherFile(path, record) {
  await mkdir(dirname(path), {recursive: true, mode: 0o700});
  const temp = `${path}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(record, null, 2)}\n`, {mode: 0o600});
  await rename(temp, path);
}

const sameAddress = (a, b) => a.replace(/\/$/, '') === b.replace(/\/$/, '');

/**
 * What the file says against the marketplace resolved: `none`, `held` — the dev publisher for this
 * marketplace — or a stop: `elsewhere`, another marketplace's; `another`, another publisher's;
 * `damaged`. Each stop carries the words that say so.
 */
export function publisherState(read, marketplace, path) {
  if (read.none) return {state: 'none'};
  if (read.damaged) {
    return {state: 'damaged', words: `${read.damaged}: mend or delete it to publish`};
  }
  const {record} = read;
  if (!sameAddress(record.marketplace, marketplace)) {
    return {
      state: 'elsewhere',
      words: `${path} holds the dev publisher for ${record.marketplace}, not ${marketplace}: move or delete it to publish to ${marketplace}`,
    };
  }
  if (record.publisher !== DEV_PUBLISHER) {
    return {
      state: 'another',
      words: `${path} holds publisher ${record.publisher}, not ${DEV_PUBLISHER}: move or delete it to publish as ${DEV_PUBLISHER}`,
    };
  }
  return {state: 'held', record};
}

/**
 * The dev publisher for this launch (decision 5), once, before any publish: `{ok: true, record,
 * claimed}` — `claimed` saying the name was claimed now, `'again'` when the marketplace had
 * disowned the file's token — or `{ok: false, words}`, the marketplace path stopped. `api` is
 * Stellify's `claim` and `publisherOfToken`; `read` and `write` the file's.
 */
export async function establishPublisher({marketplace, path, api, read, write}) {
  const known = publisherState(await read(path), marketplace, path);

  const claimName = async again => {
    const answer = await api.claim({marketplace, name: DEV_PUBLISHER});
    if (answer.ok) {
      const record = {marketplace, publisher: answer.publisher, token: answer.token};
      await write(path, record);
      return {ok: true, record, claimed: again ? 'again' : true};
    }
    if (answer.status === 409) {
      return {
        ok: false,
        words: `the marketplace at ${marketplace} holds ${DEV_PUBLISHER} under a token this launcher no longer has: wipe the marketplace's state directory (apps/marketplace/.state unless its STATE_DIR says otherwise) to claim it again`,
      };
    }
    return {
      ok: false,
      words: `the claim of ${DEV_PUBLISHER} at ${marketplace} was refused:${answer.findings.map(f => `\n    ${f}`).join('')}`,
    };
  };

  if (known.state === 'none') return claimName(false);
  if (known.state !== 'held') return {ok: false, words: known.words};

  const asked = await api.publisherOf({marketplace, token: known.record.token});
  if (!asked.ok && asked.status === 401) return claimName(true);
  if (!asked.ok) {
    return {
      ok: false,
      words: `the marketplace at ${marketplace} could not be asked about ${DEV_PUBLISHER}'s token:${asked.findings.map(f => `\n    ${f}`).join('')}`,
    };
  }
  if (asked.publisher !== DEV_PUBLISHER) {
    return {
      ok: false,
      words: `the token in ${path} is ${asked.publisher}'s at ${marketplace}, not ${DEV_PUBLISHER}'s: move or delete it to publish as ${DEV_PUBLISHER}`,
    };
  }
  return {ok: true, record: known.record, claimed: false};
}

/** The notices printed at the end (decision 11): the apps this launch did not publish. */
export function noticesLeft(notices, publishedIds) {
  const published = new Set(publishedIds);
  return notices.filter(notice => !published.has(notice.appId));
}

/** The listing's words for the publisher file (decision 13); read from disk, nothing contacted. */
export function publisherLine(known, path) {
  switch (known.state) {
    case 'none':
      return `publisher: ${DEV_PUBLISHER} — not claimed yet: the launch claims it, kept in ${path}`;
    case 'held':
      return `publisher: ${DEV_PUBLISHER} — held for this marketplace in ${path}`;
    default:
      return `publisher: ${DEV_PUBLISHER} — the launch would not publish: ${known.words}`;
  }
}

/**
 * What a roster entry's preview signs in with, for the listing: its account or its demo key — under
 * `--mode live`, on a deterministic instance (task-13.7 decision 8).
 */
export function previewWords(entry, mode) {
  const on = mode === 'live' ? ' on a deterministic instance' : '';
  if (entry.previewAs) return `previews as ${entry.previewAs}${on}`;
  if (entry.previewKey) return `previews with its demo key${on}`;
  return '';
}
