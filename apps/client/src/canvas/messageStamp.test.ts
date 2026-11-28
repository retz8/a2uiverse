/**
 * The client reads only what is stamped `1.0` (task-21.14 decisions 10, 15): a message stamped
 * anything else — v0.9, a version above 1.0, none — is not drawn on the canvas, and passed over
 * with nothing said.
 */
import {describe, expect, it, vi} from 'vitest';
import {TaskState} from '@a2a-js/sdk';
import {BASIC_CATALOG_ID} from '@a2uiverse/sdk';
import type {A2AMessageSender} from '../a2a/client';
import {dataPart, statusUpdateEvent} from '../a2a/messages';
import {clientCatalogs} from '../catalogs/clientCatalogs';
import {createCanvasWiring} from './createCanvasWiring';

/** A paint of the basic catalog under `stamp`: what the agent answered with. */
const paint = (stamp: {version?: string}) => [
  {...stamp, createSurface: {surfaceId: 'answer', catalogId: BASIC_CATALOG_ID}},
  {
    ...stamp,
    updateComponents: {
      surfaceId: 'answer',
      components: [{id: 'root', component: 'Text', text: 'hello'}],
    },
  },
];

/** A canvas asked one question, the answer the paint under `stamp`. */
async function answered(stamp: {version?: string}) {
  const client: A2AMessageSender = {
    sendMessageStream: () =>
      (async function* () {
        yield statusUpdateEvent({
          taskId: 't1',
          contextId: 'ctx-1',
          state: TaskState.TASK_STATE_COMPLETED,
          parts: paint(stamp).map(dataPart),
        });
      })(),
  };
  const own = clientCatalogs();
  const wiring = createCanvasWiring({client, catalogs: own.map(c => c.catalog)});
  await wiring.sendUtterance('hello?');
  return wiring.viewed()!;
}

describe('a message stamped anything but 1.0', () => {
  it.each([
    ['v0.9', {version: 'v0.9'}],
    ['v0.9.1', {version: 'v0.9.1'}],
    ['above 1.0', {version: '1.1'}],
    ['with no version', {}],
  ])('is not drawn when stamped %s, and nothing is said', async (_name, stamp) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const canvas = await answered(stamp);
    expect([...canvas.processor.model.surfacesMap.keys()]).toEqual([]);
    expect(canvas.store.getState().stageId).toBeNull();
    expect(canvas.store.getState().error).toBeNull();
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('beside one stamped 1.0, which is drawn', async () => {
    const canvas = await answered({version: '1.0'});
    expect(canvas.store.getState().stageId).toBe('answer');
    expect(canvas.processor.model.getSurface('answer')).toBeDefined();
  });
});
