/**
 * What a shell action opens on the client, and what its report carries to the hub's journal
 * (task-6.5 decisions 2–6; task-14.5 decisions 8–10).
 */
import {describe, expect, it} from 'vitest';
import {shellActionContext, trustedPageOf} from './canvasRuntime';

const surfaceId = 'shell:main';

describe('trustedPageOf', () => {
  it('opens the Store with its query', () => {
    expect(trustedPageOf({name: 'openStore', surfaceId, query: 'flights'})).toEqual({
      page: 'store',
      query: 'flights',
    });
  });

  it('opens the App Library on the app it names, or on the list', () => {
    expect(trustedPageOf({name: 'openAppLibrary', surfaceId, app: 'linear'})).toEqual({
      page: 'appLibrary',
      app: 'linear',
    });
    expect(trustedPageOf({name: 'openAppLibrary', surfaceId})).toEqual({page: 'appLibrary'});
  });

  it('opens Publish', () => {
    expect(trustedPageOf({name: 'openPublish', surfaceId})).toEqual({page: 'publish'});
  });
});

describe('shellActionContext', () => {
  it('carries the Store’s query and the App Library’s app; Publish carries nothing', () => {
    expect(shellActionContext({name: 'openStore', surfaceId, query: 'flights'})).toEqual({
      query: 'flights',
    });
    expect(shellActionContext({name: 'openAppLibrary', surfaceId, app: 'linear'})).toEqual({
      app: 'linear',
    });
    expect(shellActionContext({name: 'openAppLibrary', surfaceId})).toEqual({});
    expect(shellActionContext({name: 'openPublish', surfaceId})).toEqual({});
  });
});
