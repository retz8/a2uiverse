/**
 * `preview` (SPEC §9.3; phase-13 decision 13; task-13.4 decisions 5–8, 12): the smoke test on the
 * publisher's machine, against their running agent, with their own credential — the paint
 * captured as the document `publish` sends for an app whose card requires sign-in, and the
 * developer's look at what the Store will show for any app. The card is fetched and read, the
 * credential's header chosen from it, each handed artifact gated, the schema of a catalog the marketplace holds
 * fetched from it, one request sent, the answer judged as the marketplace judges a live paint, the
 * paint checked through the sdk and kept as it judged it, settled. Every failure is a finding, never
 * a throw.
 */
import type {AgentCard} from '@a2a-js/sdk';
import {
  asksSignIn,
  fetchLiveCard,
  noInterfaceFinding,
  readCard,
  spokenInterfaces,
  type ServedCard,
} from '@a2uiverse/card';
import {
  ARTIFACT_DESCRIPTOR_FILE,
  BASIC_CATALOG_ID,
  BASIC_CATALOG_SCHEMA,
  checkPaint,
  entitlementByVersionOf,
  gateArtifact,
  readAuthRequired,
  readCatalogIdsByVersion,
  readSupportedCatalogIds,
  type CatalogIdsByVersion,
  smokeWords,
  validateArtifactDescriptor,
  type A2uiCatalogSchema,
  type A2uiMessage,
  type GatedArtifact,
} from '@a2uiverse/sdk';
import {
  a2aSmokeRunner,
  FAILED_STATES,
  noneReachedFinding,
  passedOverNote,
  signInSignalOf,
  type SmokeObservation,
  type SmokeRunner,
} from '@a2uiverse/smoke-transport';
import {credentialHeaders} from './credential.js';
import {fetchArtifactFile, fetchIndex} from './marketplace.js';
import {noticesOf} from './notices.js';
import type {Notice, PreviewDocument, PreviewOptions, PreviewResult} from './types.js';

export const DEFAULT_CARD_TIMEOUT_MS = 10_000;
export const DEFAULT_SMOKE_TIMEOUT_MS = 60_000;

export const CREDENTIAL_NEEDED =
  'the card requires sign-in: set STELLIFY_CREDENTIAL to a credential of your own for this agent';
export const CREDENTIAL_NOT_SENT =
  'the card requires no sign-in: the credential is not sent, and the marketplace captures this app’s preview itself at publish';

/**
 * The finding for a stream that closed on a task that had not ended (task-20.2 decision 6): the
 * last state the stream carried, or that it carried none.
 */
const neverFinished = (state: string | undefined) =>
  state === undefined
    ? 'the agent never finished: the stream ended before any answer'
    : `the agent never finished: the stream ended with its task still ${state}`;

/** Test seams: the transport and the fetch under the card and the marketplace reads. */
export interface PreviewDeps {
  smoke?: SmokeRunner;
  fetchImpl?: typeof fetch;
}

/** The public verb: no transport in its signature, so nothing of the A2A SDK's client reaches the API's types. */
export function preview(options: PreviewOptions): Promise<PreviewResult> {
  return previewWith(options, {});
}

export async function previewWith(
  options: PreviewOptions,
  deps: PreviewDeps,
): Promise<PreviewResult> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const smoke = deps.smoke ?? a2aSmokeRunner({fetchImpl});
  const findings: string[] = [];
  const notes: string[] = [];
  let notices: Notice[] = [];
  const result = (document: PreviewDocument | null, signIn?: boolean): PreviewResult => ({
    document,
    ...(signIn === undefined ? {} : {signIn}),
    findings,
    notices,
    notes,
  });

  // The live card, as the marketplace will fetch it, then read as the marketplace will read it
  // (task-20.3 decisions 3, 8). Nothing runs after a card that does not read.
  let served: ServedCard;
  try {
    served = await fetchLiveCard(options.cardUrl, {
      timeoutMs: options.cardTimeoutMs ?? DEFAULT_CARD_TIMEOUT_MS,
      fetchImpl,
    });
  } catch (err) {
    findings.push(`the card at ${options.cardUrl} could not be fetched: ${(err as Error).message}`);
    return result(null);
  }
  let card: AgentCard;
  try {
    card = readCard(served);
  } catch (err) {
    findings.push(`the card at ${options.cardUrl} could not be read: ${(err as Error).message}`);
    return result(null);
  }
  if (!card.version) {
    findings.push("the card has no version: the card's `version` is the app's version");
  }
  // An agent the platform cannot reach is sent nothing (task-20.3 decision 15).
  if (spokenInterfaces(card).length === 0) findings.push(noInterfaceFinding(card));
  // The card's declaration per A2UI version, what the request advertises and the paint is judged
  // by (task-19.2 decision 6); `declared` is its union, what the gate and the schemas read.
  let declared: string[] = [];
  let declaredByVersion: CatalogIdsByVersion = {'v0.9': [], 'v0.9.1': []};
  const read = readCatalogIdsByVersion(card);
  if (read.ok) {
    declaredByVersion = read.value;
    const union = readSupportedCatalogIds(card);
    if (union.ok) declared = union.value;
  } else findings.push(...read.errors.map(e => `the card's ${e}`));

  // The credential: required for a card that requires sign-in, not sent for one that does not.
  const signIn = asksSignIn(card);
  const given = options.credential !== undefined && options.credential !== '';
  let headers: Record<string, string> | undefined;
  if (signIn) {
    if (!given) findings.push(CREDENTIAL_NEEDED);
    else {
      const chosen = credentialHeaders(card, options.credential!);
      if (chosen.ok) headers = chosen.headers;
      else findings.push(chosen.finding);
    }
  } else if (given) {
    notes.push(CREDENTIAL_NOT_SENT);
  }

  // Each handed artifact through the gate, so its schema is read as publish will read it.
  const gated: GatedArtifact[] = [];
  for (const [index, files] of options.catalogs.entries()) {
    const gate = await gateArtifact(files, index);
    findings.push(...gate.findings);
    if (gate.artifact) gated.push(gate.artifact);
  }
  if (findings.length > 0) return result(null, signIn);

  // The schemas: the basic catalog's, each handed artifact's, then the marketplace's held rows.
  const schemas = new Map<string, A2uiCatalogSchema>([
    [BASIC_CATALOG_ID, BASIC_CATALOG_SCHEMA as A2uiCatalogSchema],
  ]);
  for (const artifact of gated) {
    const schema = parseJson(artifact.files.get(artifact.descriptor.schema));
    if (schema) schemas.set(artifact.descriptor.catalogId, schema as A2uiCatalogSchema);
  }
  if (options.marketplace !== undefined) {
    try {
      const entries = await fetchIndex(options.marketplace, fetchImpl);
      if (options.publisher !== undefined) notices = noticesOf(entries, options.publisher);
      for (const id of declared) {
        if (schemas.has(id)) continue;
        const held = entries.find(e => e.publisher === options.publisher && id in e.catalogs);
        if (!held) continue;
        const artifactId = held.catalogs[id]!;
        const descriptor = validateArtifactDescriptor(
          parseJson(
            await fetchArtifactFile(
              options.marketplace,
              artifactId,
              ARTIFACT_DESCRIPTOR_FILE,
              fetchImpl,
            ),
          ),
        );
        if (!descriptor.ok) {
          notes.push(`the marketplace’s artifact ${artifactId} has no readable descriptor`);
          continue;
        }
        const schema = parseJson(
          await fetchArtifactFile(
            options.marketplace,
            artifactId,
            descriptor.value.schema,
            fetchImpl,
          ),
        );
        if (schema) schemas.set(id, schema as A2uiCatalogSchema);
      }
    } catch (err) {
      notes.push(`${(err as Error).message}; a catalog the marketplace holds is not resolved`);
    }
  }

  // One request, judged as the marketplace judges a live paint, the paint through the sdk: the
  // entitlement per version as the hub advertises it, each surface judged by its stamp.
  const entitlement = entitlementByVersionOf(declaredByVersion);
  const words = smokeWords(card);
  const seen = await smoke({
    card,
    entitlement,
    words,
    timeoutMs: options.smokeTimeoutMs ?? DEFAULT_SMOKE_TIMEOUT_MS,
    ...(headers ? {headers} : {}),
  });
  // Each interface the request passed over is the publisher's to know (task-20.5 decision 7).
  if ('taken' in seen)
    notes.push(...seen.notReached.map(entry => passedOverNote(entry, seen.taken)));
  const judged = judge(seen, headers !== undefined);
  if ('findings' in judged) {
    findings.push(...judged.findings);
    return result(null, signIn);
  }
  const painted = checkPaint(judged.messages, {entitlement, schemaFor: id => schemas.get(id)});
  findings.push(...painted.findings);
  if (findings.length > 0) return result(null, signIn);
  return result(
    {
      appId: options.appId,
      version: card.version,
      words,
      messages: painted.paint,
      capturedBy: 'publisher',
      capturedAt: (options.now?.() ?? new Date()).toISOString(),
    },
    signIn,
  );
}

/** The judgement over what the transport saw: the paint, or why there is none. */
function judge(
  seen: SmokeObservation,
  credentialSent: boolean,
): {findings: string[]} | {messages: A2uiMessage[]} {
  switch (seen.kind) {
    case 'unauthorized':
      return {
        findings: [
          credentialSent
            ? `the agent refused the credential: ${signInSignalOf(seen.taken)}`
            : `the agent answered ${signInSignalOf(seen.taken)}, but its card requires no sign-in`,
        ],
      };
    case 'unreached':
      return {findings: [noneReachedFinding(seen.notReached)]};
    case 'error':
      return {findings: [`the smoke request failed: ${seen.message}`]};
    case 'unfinished':
      return {findings: [neverFinished(seen.state)]};
    case 'ended':
      if (seen.state === 'auth-required') {
        return {
          findings: [
            credentialSent
              ? `the agent asked to sign in although a credential was sent: ${askedFor(seen.data)}`
              : 'the agent asked to sign in, but its card requires no sign-in',
          ],
        };
      }
      if (FAILED_STATES.has(seen.state)) {
        return {
          findings: [
            `the agent ended the task as ${seen.state}${seen.text ? `: ${seen.text}` : ''}`,
          ],
        };
      }
      return {messages: seen.messages};
  }
}

/** The schemes and scopes an auth-required answer names, in the words of the finding. */
function askedFor(data: unknown): string {
  const request = readAuthRequired(data);
  if (!request) return 'naming no scheme';
  return request.securityRequirements
    .map(alternative =>
      Object.entries(alternative.schemes)
        .map(([scheme, {list: scopes}]) =>
          scopes.length > 0 ? `${scheme} (${scopes.join(', ')})` : scheme,
        )
        .join(' and '),
    )
    .join(' or ');
}

function parseJson(bytes: Uint8Array | undefined): unknown {
  if (!bytes) return undefined;
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return undefined;
  }
}
