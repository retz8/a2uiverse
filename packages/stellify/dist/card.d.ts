/**
 * The live card (SPEC §9.3): what `preview` fetches from the card URL under the card timeout
 * (task-13.4 decision 12), as the marketplace fetches it at publish.
 */
import type { AgentCard } from '@a2a-js/sdk';
export declare function fetchCard(cardUrl: string, timeoutMs: number, fetchImpl?: typeof fetch): Promise<AgentCard>;
