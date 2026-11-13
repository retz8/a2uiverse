import {TaskState} from '@a2a-js/sdk';

/**
 * Each task state as A2A 0.3 names it. The two states A2A 1.0 gives no name of its own, the
 * unspecified one and one the A2A SDK does not recognize, take 0.3's `unknown`, which the A2A
 * SDK's 0.3 layer reads as unspecified.
 */
const WORDS: Record<TaskState, string> = {
  [TaskState.TASK_STATE_UNSPECIFIED]: 'unknown',
  [TaskState.TASK_STATE_SUBMITTED]: 'submitted',
  [TaskState.TASK_STATE_WORKING]: 'working',
  [TaskState.TASK_STATE_COMPLETED]: 'completed',
  [TaskState.TASK_STATE_FAILED]: 'failed',
  [TaskState.TASK_STATE_CANCELED]: 'canceled',
  [TaskState.TASK_STATE_INPUT_REQUIRED]: 'input-required',
  [TaskState.TASK_STATE_REJECTED]: 'rejected',
  [TaskState.TASK_STATE_AUTH_REQUIRED]: 'auth-required',
  [TaskState.UNRECOGNIZED]: 'unknown',
};

/**
 * A task state as a finding spells it (task-20.2 decision 6): in lowercase, A2A 0.3's name for
 * it, for an agent on either A2A version.
 */
export function taskStateWord(state: TaskState): string {
  return WORDS[state] ?? 'unknown';
}
