/**
 * Stellify — turns a catalog package into the A2UIVerse catalog artifact (SPEC §9.1, task 11.3).
 * `stellify()` runs the pipeline in memory and returns the artifact or the findings that refuse
 * it; `artifactFiles()` is the artifact's every file, its descriptor among them; `writeArtifact()` is
 * the one writer; `defineConfig()` types `stellify.config.ts`.
 */
export { defineConfig } from './config.js';
export { stellify } from './pack.js';
export { artifactFiles, writeArtifact } from './write.js';
export { preview } from './preview.js';
export { claim, listPublished, publish, unpublish } from './verbs.js';
export { describeNotice } from './notices.js';
export type { ArtifactDescriptor, ClaimOptions, ClaimResult, Finding, ListOptions, ListResult, Notice, PreviewDocument, PreviewOptions, PreviewResult, PublishedApp, PublisherRecord, PublishOptions, PublishResult, StellifyConfig, StellifyOptions, StellifyResult, UnpublishOptions, UnpublishResult, } from './types.js';
