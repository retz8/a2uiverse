/**
 * The thin command over the marketplace's search route (task-13.3 decision 12): what proves the
 * search over the published roster by hand.
 *
 *   marketplace search <words...>
 *
 * The marketplace is reached at `MARKETPLACE_URL` (default `http://localhost:$PORT`, port 10002).
 */
import {MARKETPLACE_ROUTES, readSearchResponse, searchPath} from '@a2uiverse/sdk';
import {DEFAULT_PORT} from './config.js';

export const USAGE = ['usage: marketplace search <words...>'];

export interface CommandIo {
  env: Readonly<Record<string, string | undefined>>;
  out(line: string): void;
  err(line: string): void;
}

/** Runs one invocation; resolves to the exit code. */
export async function runMarketplaceCommand(
  argv: readonly string[],
  io: CommandIo,
): Promise<number> {
  const [verb, ...rest] = argv;
  const base = (
    io.env.MARKETPLACE_URL ?? `http://localhost:${io.env.PORT ?? DEFAULT_PORT}`
  ).replace(/\/$/, '');
  if (verb === 'search' && rest.length > 0) {
    const url = `${base}/${searchPath(rest.join(' '))}`;
    let response: Response;
    try {
      response = await fetch(url);
    } catch (err) {
      io.err(`cannot reach the marketplace at ${base}: ${(err as Error).message}`);
      return 1;
    }
    if (!response.ok) {
      io.err(`the marketplace answered ${response.status} to ${MARKETPLACE_ROUTES.search}`);
      return 1;
    }
    const read = readSearchResponse(await response.json());
    if (!read.ok) {
      io.err(`the marketplace's answer is not a search response: ${read.errors.join('; ')}`);
      return 1;
    }
    if (read.value.results.length === 0) io.out('no apps published');
    for (const {entry, score} of read.value.results) {
      io.out(`${entry.appId}  ${entry.card.name}  ${score.toFixed(3)}`);
    }
    return 0;
  }
  for (const line of USAGE) io.err(line);
  return 1;
}
