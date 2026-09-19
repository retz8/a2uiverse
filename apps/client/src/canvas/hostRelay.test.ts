import {expect, test, vi} from 'vitest';
import type {CellTarget} from '@a2uiverse/shell-catalog';
import {createHostRelay, type ShellHost} from './hostRelay';

const TARGET: CellTarget = {app: 'github', surface: 'github:pulls', pointer: '/pulls[number=1]'};

test('the relay forwards to the bound canvas, and to nothing once it unbinds', () => {
  const relay = createHostRelay();
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const canvas: ShellHost = {
    onShellAction: vi.fn(),
    onNavigate: vi.fn(),
    appDisplayName: appId => (appId === 'github' ? 'GitHub' : undefined),
  };

  relay.host.onNavigate(TARGET);
  expect(relay.host.appDisplayName('github')).toBeUndefined();
  expect(warn).toHaveBeenCalledOnce();

  const unbind = relay.bind(canvas);
  relay.host.onNavigate(TARGET);
  relay.host.onShellAction({name: 'openAppLibrary', surfaceId: 'shell:main'});
  expect(canvas.onNavigate).toHaveBeenCalledWith(TARGET);
  expect(canvas.onShellAction).toHaveBeenCalledOnce();
  expect(relay.host.appDisplayName('github')).toBe('GitHub');

  unbind();
  expect(relay.host.appDisplayName('github')).toBeUndefined();
  warn.mockRestore();
});
