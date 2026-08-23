/**
 * Serialize-on-swap (task 8.3): a live surface materializes into plain deep-frozen JSON,
 * decoupled from the processor that produced it.
 */
import {describe, it, expect} from 'vitest';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import {CATALOG, CATALOG_ID} from 'primer-a2ui-adapter';
import {serializeSurface, deepFreeze} from './snapshotSurface';

function paintedSurface() {
  const processor = new MessageProcessor([CATALOG]);
  processor.processMessages([
    {version: 'v0.9', createSurface: {surfaceId: 'stage', catalogId: CATALOG_ID}},
    {
      version: 'v0.9',
      updateComponents: {
        surfaceId: 'stage',
        components: [
          {id: 'root', component: 'Stack', children: ['title']},
          {id: 'title', component: 'Text', text: {path: '/title'}},
        ],
      },
    },
    {
      version: 'v0.9',
      updateDataModel: {surfaceId: 'stage', value: {title: 'hello'}},
    },
  ] as unknown as A2uiMessage[]);
  const surface = processor.model.getSurface('stage');
  if (!surface) throw new Error('surface not created');
  return {processor, surface};
}

describe('serializeSurface', () => {
  it('captures the full flat component tree and the data model', () => {
    const {surface} = paintedSurface();
    const snapshot = serializeSurface(surface);
    expect(Object.keys(snapshot.tree).sort()).toEqual(['root', 'title']);
    expect(snapshot.tree.root).toMatchObject({id: 'root', type: 'Stack'});
    expect(snapshot.dataModel).toMatchObject({title: 'hello'});
  });

  it('is a copy, decoupled from later mutations of the live surface', () => {
    const {processor, surface} = paintedSurface();
    const snapshot = serializeSurface(surface);
    processor.processMessages([
      {
        version: 'v0.9',
        updateDataModel: {surfaceId: 'stage', value: {title: 'changed'}},
      },
    ] as unknown as A2uiMessage[]);
    expect(snapshot.dataModel).toMatchObject({title: 'hello'});
  });

  it('deep-freezes the captured content', () => {
    const {surface} = paintedSurface();
    const snapshot = serializeSurface(surface);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.tree)).toBe(true);
    expect(Object.isFrozen(snapshot.tree.root)).toBe(true);
    expect(Object.isFrozen(snapshot.dataModel)).toBe(true);
  });

  it('serializes an empty data model to an empty object', () => {
    const processor = new MessageProcessor([CATALOG]);
    processor.processMessages([
      {version: 'v0.9', createSurface: {surfaceId: 'bare', catalogId: CATALOG_ID}},
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId: 'bare',
          components: [{id: 'root', component: 'Text', text: 'bare'}],
        },
      },
    ] as unknown as A2uiMessage[]);
    const surface = processor.model.getSurface('bare');
    if (!surface) throw new Error('surface not created');
    expect(serializeSurface(surface).dataModel).toEqual({});
  });
});

describe('deepFreeze', () => {
  it('freezes nested objects and arrays and tolerates cycles', () => {
    const value: Record<string, unknown> = {list: [{a: 1}]};
    value.self = value;
    deepFreeze(value);
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.list)).toBe(true);
    expect(Object.isFrozen((value.list as unknown[])[0])).toBe(true);
  });
});
