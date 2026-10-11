/**
 * The trusted page in the address (phase-14 decision 11, task-14.2 decision 17): its destination
 * under `page`, the Store's query under `q`, and an app — one app's view in the Store or the App
 * Library — under `app`, beside whatever else the address carries (`?beat=` among them). The canvas
 * itself is never in the address: a reload starts a fresh session (SPEC §6, §11).
 */
import type {TrustedPage, TrustedPageState} from '../trail/trailStore';

const PAGE = 'page';
const QUERY = 'q';
const APP = 'app';

/** Each destination's word in the address. */
const WORDS: Record<TrustedPage, string> = {
  store: 'store',
  appLibrary: 'library',
  publish: 'publish',
};
const PAGES = new Map(Object.entries(WORDS).map(([page, word]) => [word, page as TrustedPage]));

/** The page an address opens; none when it names none, or one this client does not know. */
export function pageOfAddress(url: URL): TrustedPageState | null {
  const page = PAGES.get(url.searchParams.get(PAGE) ?? '');
  if (!page) return null;
  if (page === 'publish') return {page};
  const query = page === 'store' ? url.searchParams.get(QUERY) : null;
  const app = url.searchParams.get(APP);
  return {page, ...(query ? {query} : {}), ...(app ? {app} : {})};
}

/** `url` with `page` in its address — or none, taken out — as a path, query and hash. */
export function addressOf(page: TrustedPageState | null, url: URL): string {
  const params = new URLSearchParams(url.search);
  for (const key of [PAGE, QUERY, APP]) params.delete(key);
  if (page) {
    params.set(PAGE, WORDS[page.page]);
    if (page.query) params.set(QUERY, page.query);
    if (page.app) params.set(APP, page.app);
  }
  const search = params.toString();
  return `${url.pathname}${search ? `?${search}` : ''}${url.hash}`;
}
