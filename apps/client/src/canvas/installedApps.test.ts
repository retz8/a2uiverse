import {describe, expect, it, vi} from 'vitest';
import type {InstalledApp} from '../orchestratorApi';
import {createInstalledApps} from './installedApps';

const app = (id: string, name: string, version: string): InstalledApp =>
  ({id, card: {name, version}}) as InstalledApp;

describe('the installed apps the client holds (task-15.9 decision 1)', () => {
  it('reads each installed app’s version and name as the registry lists them', async () => {
    const apps = createInstalledApps({
      read: async () => [app('shop-a', 'Shop A', '1.0.0'), app('shop-b', 'Shop B', '2.1.0')],
    });
    expect(apps.getState().versions.size).toBe(0);
    await apps.read();
    expect(apps.getState().versions.get('shop-b')).toBe('2.1.0');
    expect(apps.getState().names.get('shop-a')).toBe('Shop A');
  });

  it('keeps what it held when the registry cannot be read', async () => {
    let answer: InstalledApp[] | null = [app('shop-a', 'Shop A', '1.0.0')];
    const apps = createInstalledApps({read: async () => answer});
    await apps.read();
    answer = null;
    await apps.read();
    expect(apps.getState().versions.get('shop-a')).toBe('1.0.0');
  });

  it('a read drops an app no longer installed', async () => {
    let answer = [app('shop-a', 'Shop A', '1.0.0'), app('shop-b', 'Shop B', '1.0.0')];
    const apps = createInstalledApps({read: async () => answer});
    await apps.read();
    answer = [app('shop-a', 'Shop A', '1.0.0')];
    await apps.read();
    expect(apps.getState().versions.has('shop-b')).toBe(false);
  });

  it('holds one press at a time on an app, anywhere: a second hold is refused until released', () => {
    const apps = createInstalledApps({read: async () => []});
    expect(apps.hold('shop-b')).toBe(true);
    expect(apps.hold('shop-b')).toBe(false);
    expect(apps.hold('shop-a')).toBe(true);
    expect(apps.getState().held.has('shop-b')).toBe(true);
    apps.release('shop-b');
    expect(apps.getState().held.has('shop-b')).toBe(false);
    expect(apps.hold('shop-b')).toBe(true);
  });

  it('tells its readers when what it holds changes', async () => {
    const apps = createInstalledApps({read: async () => [app('shop-a', 'Shop A', '1.0.0')]});
    const listener = vi.fn();
    apps.subscribe(listener);
    apps.hold('shop-a');
    apps.release('shop-a');
    await apps.read();
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
