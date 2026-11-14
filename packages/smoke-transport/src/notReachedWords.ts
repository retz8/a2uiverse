/**
 * What a publisher reads of the interfaces a walk did not reach (task-20.5 decision 7), at publish
 * and at `stellify preview`: a note for each interface passed over before the one the request went
 * to, and one finding when the walk reached none. Each interface is named by its binding and its
 * A2A version as the card spells them, with its URL.
 */
import type {AgentInterface} from '@a2a-js/sdk';
import {a2aVersionOf} from '@a2uiverse/card';
import type {NotReached} from './dial.js';

/** The note for an interface passed over before the one the request went to. */
export function passedOverNote(entry: NotReached, taken: AgentInterface): string {
  const passed = entry.why === 'credential' ? 'was passed over' : 'was not reached';
  return `${named(entry.interface)} (${entry.interface.url}) ${passed}: ${why(entry)}; the request went to ${named(taken)}`;
}

/** The finding when the walk reached no interface the card lists. */
export function noneReachedFinding(notReached: readonly NotReached[]): string {
  const tried = notReached.map(
    entry => `${named(entry.interface)} (${entry.interface.url}): ${why(entry)}`,
  );
  return `no interface the card lists was reached: ${tried.join('; ')}`;
}

function named(agentInterface: AgentInterface): string {
  return `${agentInterface.protocolBinding} at A2A ${a2aVersionOf(agentInterface)}`;
}

function why(entry: NotReached): string {
  switch (entry.why) {
    case 'connection':
      return 'no connection could be opened';
    case 'unserved':
      return 'what answered there does not serve it';
    case 'credential':
      return `the credential's header "${entry.header ?? ''}" is not a name gRPC can carry`;
  }
}
