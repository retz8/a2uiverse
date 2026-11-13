import {TaskState} from '@a2a-js/sdk';
import {expect, test} from 'vitest';
import {taskStateWord} from './taskStateWord.js';

test("every task state takes A2A 0.3's lowercase name", () => {
  expect(taskStateWord(TaskState.TASK_STATE_SUBMITTED)).toBe('submitted');
  expect(taskStateWord(TaskState.TASK_STATE_WORKING)).toBe('working');
  expect(taskStateWord(TaskState.TASK_STATE_COMPLETED)).toBe('completed');
  expect(taskStateWord(TaskState.TASK_STATE_FAILED)).toBe('failed');
  expect(taskStateWord(TaskState.TASK_STATE_CANCELED)).toBe('canceled');
  expect(taskStateWord(TaskState.TASK_STATE_REJECTED)).toBe('rejected');
  expect(taskStateWord(TaskState.TASK_STATE_INPUT_REQUIRED)).toBe('input-required');
  expect(taskStateWord(TaskState.TASK_STATE_AUTH_REQUIRED)).toBe('auth-required');
});

test("a state A2A 1.0 gives no name of its own is 'unknown'", () => {
  expect(taskStateWord(TaskState.TASK_STATE_UNSPECIFIED)).toBe('unknown');
  expect(taskStateWord(TaskState.UNRECOGNIZED)).toBe('unknown');
  expect(taskStateWord(99 as TaskState)).toBe('unknown');
});
