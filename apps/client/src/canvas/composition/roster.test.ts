/**
 * The roster read off the shell's paint: slot order and the Registry's display names, which
 * reach the client nowhere else.
 */
import {describe, it, expect} from 'vitest';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import {rosterFromShellMessages, SHELL_SOURCE} from './roster';

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;

/** As the shell painter emits it: one attribution then one slot, per leaf, in plan order. */
const shellPaint = (leaves: Array<{appId: string; displayName?: string}>) =>
  msg({
    updateComponents: {
      surfaceId: 'shell:shell',
      components: [
        {id: 'root', component: 'Column', children: leaves.map(l => `wrap-slot-${l.appId}`)},
        ...leaves.flatMap(l => [
          {id: `wrap-slot-${l.appId}`, component: 'Column', children: []},
          {
            id: `attr-slot-${l.appId}`,
            component: 'Attribution',
            appId: l.appId,
            ...(l.displayName !== undefined ? {displayName: l.displayName} : {}),
          },
          {id: `slot-${l.appId}`, component: 'Slot', name: `slot-${l.appId}`, state: 'pending'},
        ]),
      ],
    },
  });

describe('rosterFromShellMessages', () => {
  it('reads the sources in the order the plan laid the slots out', () => {
    const roster = rosterFromShellMessages([
      shellPaint([
        {appId: 'github', displayName: 'GitHub'},
        {appId: 'gmail', displayName: 'Gmail'},
        {appId: 'calendar', displayName: 'Google Calendar'},
      ]),
    ]);
    expect(roster).toEqual([
      {appId: 'github', displayName: 'GitHub', slot: 'slot-github'},
      {appId: 'gmail', displayName: 'Gmail', slot: 'slot-gmail'},
      {appId: 'calendar', displayName: 'Google Calendar', slot: 'slot-calendar'},
    ]);
  });

  it('reads a shell-content slot as the reserved shell source, named by its label, with no attribution before it (task-5.5 decision 1)', () => {
    const paint = msg({
      updateComponents: {
        surfaceId: 'shell:shell',
        components: [
          {
            id: 'root',
            component: 'Frame',
            direction: 'row',
            children: ['slot-shell', 'wrap-slot-github'],
          },
          {
            id: 'slot-shell',
            component: 'Slot',
            name: 'slot-shell',
            state: 'pending',
            label: 'Synthesis',
            content: 'shell',
          },
          {id: 'wrap-slot-github', component: 'Column', children: []},
          {
            id: 'attr-slot-github',
            component: 'Attribution',
            appId: 'github',
            displayName: 'GitHub',
          },
          {id: 'slot-github', component: 'Slot', name: 'slot-github', state: 'pending'},
        ],
      },
    });
    expect(rosterFromShellMessages([paint])).toEqual([
      {appId: SHELL_SOURCE, displayName: 'Synthesis', slot: 'slot-shell'},
      {appId: 'github', displayName: 'GitHub', slot: 'slot-github'},
    ]);
    expect(SHELL_SOURCE).toBe('shell');
  });

  it('falls back to the app id when the paint carries no display name', () => {
    expect(rosterFromShellMessages([shellPaint([{appId: 'github'}])])).toEqual([
      {appId: 'github', displayName: 'github', slot: 'slot-github'},
    ]);
  });

  it('reads nothing from a repaint that names no source', () => {
    // The orchestrator flips a slot by repainting its shell surface, and a repaint may carry
    // only what changed. That paint must leave the roster standing — reading it as "no sources"
    // drops the display names mid-turn and the stack falls back to raw app ids.
    const slotFlip = msg({
      updateComponents: {
        surfaceId: 'shell:shell',
        components: [{id: 'slot-gmail', component: 'Slot', name: 'slot-gmail', state: 'failed'}],
      },
    });
    expect(rosterFromShellMessages([slotFlip])).toBeUndefined();
    expect(rosterFromShellMessages([shellPaint([])])).toBeUndefined();
  });

  it('reads nothing from a batch carrying no component tree', () => {
    // A createSurface or a data update must not be mistaken for a composition with no sources,
    // which would drop the roster the turn's real paint established.
    expect(
      rosterFromShellMessages([
        msg({createSurface: {surfaceId: 'shell:shell', catalogId: 'shell'}}),
        msg({updateDataModel: {surfaceId: 'shell:shell', value: {}}}),
      ]),
    ).toBeUndefined();
  });
});
