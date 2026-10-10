import type { ClaimOptions, ClaimResult, ListOptions, ListResult, PublishOptions, PublishResult, UnpublishOptions, UnpublishResult } from './types.js';
/** Test seam: the fetch under every request. */
export interface VerbDeps {
    fetchImpl?: typeof fetch;
}
export declare function claim({ marketplace, name }: ClaimOptions, deps?: VerbDeps): Promise<ClaimResult>;
export declare function publish(options: PublishOptions, deps?: VerbDeps): Promise<PublishResult>;
export declare function unpublish(options: UnpublishOptions, deps?: VerbDeps): Promise<UnpublishResult>;
export declare function listPublished({ marketplace, publisher }: ListOptions, deps?: VerbDeps): Promise<ListResult>;
