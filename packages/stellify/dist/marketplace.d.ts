/**
 * The marketplace as Stellify reaches it (SPEC §9.3): the sdk's routes over `fetch`, nothing
 * more. The reads — the index, an artifact's files — and the writes — claim, publish, unpublish —
 * each answered as the marketplace answered, a refusal's findings passed through unchanged. An
 * unreachable marketplace throws, naming its address.
 */
import { type ClaimResponse, type IndexEntry, type PublishOutcome, type PublishRequest } from '@a2uiverse/sdk';
/** Every entry the marketplace lists. */
export declare function fetchIndex(base: string, fetchImpl?: typeof fetch): Promise<IndexEntry[]>;
/** One file of a hosted artifact, by its id and path. */
export declare function fetchArtifactFile(base: string, artifactId: string, path: string, fetchImpl?: typeof fetch): Promise<Uint8Array>;
/** What a write answered: the status and the body as it came. */
export interface WriteAnswer<T> {
    status: number;
    body: T | {
        ok: false;
        findings: string[];
    } | unknown;
}
export declare const postClaim: (base: string, name: string, fetchImpl?: typeof fetch) => Promise<WriteAnswer<ClaimResponse>>;
export declare const postPublish: (base: string, token: string, body: PublishRequest, fetchImpl?: typeof fetch) => Promise<WriteAnswer<PublishOutcome>>;
export declare const postUnpublish: (base: string, token: string, appId: string, fetchImpl?: typeof fetch) => Promise<WriteAnswer<{
    ok: true;
    appId: string;
}>>;
/** The findings a refusal body carries, else one line saying what came instead. */
export declare function findingsOf(answer: WriteAnswer<unknown>, route: string): string[];
