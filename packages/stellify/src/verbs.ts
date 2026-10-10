/**
 * The verbs that reach the marketplace (SPEC §9.3; task-13.4 decisions 3, 9, 10, 11): `claim`,
 * `publish`, `unpublish` and `listPublished`, each a function taking the marketplace's address and
 * the token explicitly — the command line alone reads the publisher file — and returning the
 * marketplace's answer or its findings, never throwing on a refusal. The words are the
 * marketplace's own, passed through unchanged.
 */
import {MARKETPLACE_ROUTES, validatePreview, type PublishRequest} from '@a2uiverse/sdk';
import {
  fetchIndex,
  findingsOf,
  postClaim,
  postPublish,
  postUnpublish,
  type WriteAnswer,
} from './marketplace.js';
import {noticesOf} from './notices.js';
import type {
  ClaimOptions,
  ClaimResult,
  ListOptions,
  ListResult,
  PublishOptions,
  PublishResult,
  PublishedApp,
  UnpublishOptions,
  UnpublishResult,
} from './types.js';

/** Test seam: the fetch under every request. */
export interface VerbDeps {
  fetchImpl?: typeof fetch;
}

const unreachable = (err: unknown) => ({ok: false as const, findings: [(err as Error).message]});

export async function claim(
  {marketplace, name}: ClaimOptions,
  deps: VerbDeps = {},
): Promise<ClaimResult> {
  let answer: WriteAnswer<unknown>;
  try {
    answer = await postClaim(marketplace, name, deps.fetchImpl);
  } catch (err) {
    return unreachable(err);
  }
  if (answer.status === 201) {
    const body = answer.body as {publisher?: unknown; token?: unknown} | null;
    if (typeof body?.publisher === 'string' && typeof body.token === 'string') {
      return {ok: true, marketplace, publisher: body.publisher, token: body.token};
    }
    return {
      ok: false,
      status: answer.status,
      findings: [
        `the marketplace answered 201 to ${MARKETPLACE_ROUTES.claim} without a name and a token`,
      ],
    };
  }
  return {ok: false, status: answer.status, findings: findingsOf(answer, MARKETPLACE_ROUTES.claim)};
}

const base64Of = (files: ReadonlyMap<string, Uint8Array>): Record<string, string> =>
  Object.fromEntries(
    [...files].map(([path, bytes]) => [path, Buffer.from(bytes).toString('base64')]),
  );

export async function publish(
  options: PublishOptions,
  deps: VerbDeps = {},
): Promise<PublishResult> {
  if (options.preview !== undefined) {
    const read = validatePreview(options.preview);
    if (!read.ok) {
      return {
        ok: false,
        findings: read.errors.map(e => `the preview is not a preview document: ${e}`),
      };
    }
  }
  const body: PublishRequest = {
    appId: options.appId,
    cardUrl: options.cardUrl,
    catalogs: options.catalogs.map(files => ({files: base64Of(files)})),
    ...(options.preview === undefined ? {} : {preview: options.preview}),
  };
  let answer: WriteAnswer<unknown>;
  try {
    answer = await postPublish(options.marketplace, options.token, body, deps.fetchImpl);
  } catch (err) {
    return unreachable(err);
  }
  const outcome = answer.body as {
    ok?: unknown;
    appId?: unknown;
    version?: unknown;
    summary?: unknown;
    notes?: unknown;
  } | null;
  if (
    answer.status === 200 &&
    outcome?.ok === true &&
    typeof outcome.appId === 'string' &&
    typeof outcome.version === 'string' &&
    typeof outcome.summary === 'string'
  ) {
    const notes = Array.isArray(outcome.notes)
      ? outcome.notes.filter((n): n is string => typeof n === 'string')
      : [];
    return {
      ok: true,
      appId: outcome.appId,
      version: outcome.version,
      summary: outcome.summary,
      notes,
    };
  }
  return {
    ok: false,
    status: answer.status,
    findings: findingsOf(answer, MARKETPLACE_ROUTES.publish),
  };
}

export async function unpublish(
  options: UnpublishOptions,
  deps: VerbDeps = {},
): Promise<UnpublishResult> {
  let answer: WriteAnswer<unknown>;
  try {
    answer = await postUnpublish(options.marketplace, options.token, options.appId, deps.fetchImpl);
  } catch (err) {
    return unreachable(err);
  }
  const outcome = answer.body as {ok?: unknown; appId?: unknown} | null;
  if (answer.status === 200 && outcome?.ok === true && typeof outcome.appId === 'string') {
    return {ok: true, appId: outcome.appId};
  }
  return {
    ok: false,
    status: answer.status,
    findings: findingsOf(answer, MARKETPLACE_ROUTES.unpublish),
  };
}

export async function listPublished(
  {marketplace, publisher}: ListOptions,
  deps: VerbDeps = {},
): Promise<ListResult> {
  try {
    const entries = await fetchIndex(marketplace, deps.fetchImpl);
    const apps: PublishedApp[] = entries
      .filter(entry => entry.publisher === publisher)
      .map(entry => ({
        appId: entry.appId,
        version: entry.card.version,
        cardUrl: entry.cardUrl,
        catalogs: {...entry.catalogs},
        retired: [...entry.retired],
        publishedAt: entry.publishedAt,
        ...(entry.aheadOfStore
          ? {
              aheadOfStore: {
                catalogIds: [...entry.aheadOfStore.catalogIds],
                ...(entry.aheadOfStore.version === undefined
                  ? {}
                  : {version: entry.aheadOfStore.version}),
                seenAt: entry.aheadOfStore.seenAt,
              },
            }
          : {}),
      }));
    return {ok: true, apps, notices: noticesOf(entries, publisher)};
  } catch (err) {
    return unreachable(err);
  }
}
