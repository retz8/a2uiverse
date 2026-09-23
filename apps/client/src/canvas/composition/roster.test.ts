/**
 * The roster read off the shell's paint: slot order and the Registry's display names, which
 * reach the client nowhere else.
 */
import {describe, it, expect} from 'vitest';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import {
  mergeFactsOf,
  rosterFromShellMessages,
  SHELL_SOURCE,
  shellPaintSlots,
  slotStatesOf,
} from './roster';

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;

/**
 * As the shell painter emits it (task-6.4 decision 3): the model's tree and ids, each vendor
 * slot wrapped in an attribution whose `child` names it, the wrapper standing where the slot
 * stood in its parent.
 */
const shellPaint = (leaves: Array<{appId: string; displayName?: string}>) =>
  msg({
    updateComponents: {
      surfaceId: 'shell:main',
      components: [
        {id: 'root', component: 'Row', children: leaves.map(l => `attribution-${l.appId}`)},
        ...leaves.flatMap(l => [
          {
            id: `attribution-${l.appId}`,
            component: 'Attribution',
            appId: l.appId,
            child: l.appId,
            ...(l.displayName !== undefined ? {displayName: l.displayName} : {}),
          },
          {id: l.appId, component: 'Slot', source: l.appId, state: 'pending'},
        ]),
      ],
    },
  });

describe('rosterFromShellMessages', () => {
  it('reads the sources in the order the slots were painted', () => {
    const roster = rosterFromShellMessages([
      shellPaint([
        {appId: 'github', displayName: 'GitHub'},
        {appId: 'gmail', displayName: 'Gmail'},
        {appId: 'calendar', displayName: 'Google Calendar'},
      ]),
    ]);
    expect(roster).toEqual([
      {appId: 'github', displayName: 'GitHub'},
      {appId: 'gmail', displayName: 'Gmail'},
      {appId: 'calendar', displayName: 'Google Calendar'},
    ]);
  });

  it('pairs an attribution to its slot by `child`, wherever either sits in the list', () => {
    // The Planner nests as it likes and the painter keeps its order: the attribution may follow
    // its slot, or sit a whole subtree away from it.
    const paint = msg({
      updateComponents: {
        surfaceId: 'shell:main',
        components: [
          {id: 'root', component: 'Column', children: ['heading', 'row']},
          {id: 'heading', component: 'Text', text: 'Your morning'},
          {id: 'mail', component: 'Slot', source: 'gmail', state: 'pending'},
          {id: 'row', component: 'Row', children: ['attribution-mail', 'card']},
          {id: 'card', component: 'Card', child: 'attribution-code'},
          {id: 'code', component: 'Slot', source: 'github', state: 'pending'},
          {
            id: 'attribution-code',
            component: 'Attribution',
            appId: 'github',
            displayName: 'GitHub',
            child: 'code',
          },
          {
            id: 'attribution-mail',
            component: 'Attribution',
            appId: 'gmail',
            displayName: 'Gmail',
            child: 'mail',
          },
        ],
      },
    });
    expect(shellPaintSlots([paint])).toEqual({
      roster: [
        {appId: 'gmail', displayName: 'Gmail'},
        {appId: 'github', displayName: 'GitHub'},
      ],
      unattributed: [],
    });
  });

  it('reads a shell-content slot as the reserved shell source, named by its label, with no attribution around it (task-5.5 decision 1)', () => {
    const paint = msg({
      updateComponents: {
        surfaceId: 'shell:main',
        components: [
          {id: 'root', component: 'Row', children: ['merged', 'attribution-github']},
          {
            id: 'merged',
            component: 'Slot',
            source: 'shell',
            state: 'pending',
            label: 'Synthesis',
            content: 'shell',
          },
          {
            id: 'attribution-github',
            component: 'Attribution',
            appId: 'github',
            displayName: 'GitHub',
            child: 'github',
          },
          {id: 'github', component: 'Slot', source: 'github', state: 'pending'},
        ],
      },
    });
    expect(rosterFromShellMessages([paint])).toEqual([
      {appId: SHELL_SOURCE, displayName: 'Synthesis'},
      {appId: 'github', displayName: 'GitHub'},
    ]);
    expect(SHELL_SOURCE).toBe('shell');
  });

  it('the shell source carries the join’s nouns painted on its slot (task-7.15)', () => {
    const paint = msg({
      updateComponents: {
        surfaceId: 'shell:main',
        components: [
          {
            id: 'merged',
            component: 'Slot',
            source: 'shell',
            state: 'pending',
            label: 'Synthesis',
            content: 'shell',
            columns: ['Issue', 'Pull request'],
            join: {home: 'linear', nouns: {linear: 'issues', github: 'PRs', bad: 3}},
          },
        ],
      },
    });
    expect(rosterFromShellMessages([paint])).toEqual([
      {
        appId: SHELL_SOURCE,
        displayName: 'Synthesis',
        join: {home: 'linear', nouns: {linear: 'issues', github: 'PRs'}},
      },
    ]);
  });

  it('a gap slot names no source and enters no roster', () => {
    const paint = msg({
      updateComponents: {
        surfaceId: 'shell:main',
        components: [
          {id: 'root', component: 'Column', children: ['flight']},
          {id: 'flight', component: 'Slot', gap: 'flight booking'},
        ],
      },
    });
    expect(shellPaintSlots([paint])).toEqual({roster: undefined, unattributed: []});
  });

  it('a vendor slot the child of no attribution is unattributed, and enters no roster', () => {
    // A painter bug, not a shape the shell ever emits. The attribution beside the slot in the old
    // list-order sense counts for nothing: only the `child` link pairs.
    const paint = msg({
      updateComponents: {
        surfaceId: 'shell:main',
        components: [
          {id: 'root', component: 'Column', children: ['attribution-github', 'gmail']},
          {
            id: 'attribution-github',
            component: 'Attribution',
            appId: 'github',
            displayName: 'GitHub',
            child: 'github',
          },
          {id: 'github', component: 'Slot', source: 'github', state: 'pending'},
          {id: 'stray', component: 'Attribution', appId: 'gmail', displayName: 'Gmail'},
          {id: 'gmail', component: 'Slot', source: 'gmail', state: 'pending'},
        ],
      },
    });
    expect(shellPaintSlots([paint])).toEqual({
      roster: [{appId: 'github', displayName: 'GitHub'}],
      unattributed: ['gmail'],
    });
  });

  it('an attribution naming a different source than its child slot holds pairs nothing', () => {
    const paint = msg({
      updateComponents: {
        surfaceId: 'shell:main',
        components: [
          {id: 'root', component: 'Column', children: ['attribution-x']},
          {id: 'attribution-x', component: 'Attribution', appId: 'github', child: 'x'},
          {id: 'x', component: 'Slot', source: 'gmail', state: 'pending'},
        ],
      },
    });
    expect(shellPaintSlots([paint]).unattributed).toEqual(['gmail']);
  });

  it('falls back to the app id when the paint carries no display name', () => {
    expect(rosterFromShellMessages([shellPaint([{appId: 'github'}])])).toEqual([
      {appId: 'github', displayName: 'github'},
    ]);
  });

  it('reads nothing from a repaint that names no source', () => {
    // The orchestrator flips a slot by repainting its shell surface, and a repaint may carry
    // only what changed. That paint must leave the roster standing — reading it as "no sources"
    // drops the display names mid-turn and the stack falls back to raw app ids.
    const framing = msg({
      updateComponents: {
        surfaceId: 'shell:main',
        components: [{id: 'heading', component: 'Text', text: 'Your morning'}],
      },
    });
    expect(rosterFromShellMessages([framing])).toBeUndefined();
    expect(rosterFromShellMessages([shellPaint([])])).toBeUndefined();
  });

  it('a partial repaint carrying a bare slot says nothing about its attribution either', () => {
    // The wrapper still stands around the slot on the canvas; only a whole-tree paint — one
    // carrying the root — can show a vendor slot to be unattributed.
    const slotFlip = msg({
      updateComponents: {
        surfaceId: 'shell:main',
        components: [{id: 'gmail', component: 'Slot', source: 'gmail', state: 'failed'}],
      },
    });
    expect(shellPaintSlots([slotFlip])).toEqual({roster: undefined, unattributed: []});
  });

  it('reads nothing from a batch carrying no component tree', () => {
    // A createSurface or a data update must not be mistaken for a composition with no sources,
    // which would drop the roster the turn's real paint established.
    expect(
      rosterFromShellMessages([
        msg({createSurface: {surfaceId: 'shell:main', catalogId: 'shell'}}),
        msg({updateDataModel: {surfaceId: 'shell:main', value: {}}}),
      ]),
    ).toBeUndefined();
  });
});

describe('slotStatesOf', () => {
  it("reads each slot's painted state by source, the synthesis slot under the shell source", () => {
    const paint = msg({
      updateComponents: {
        surfaceId: 'shell:main',
        components: [
          {id: 'merged', component: 'Slot', source: 'shell', content: 'shell', state: 'pending'},
          {id: 'linear', component: 'Slot', source: 'linear', state: 'failed'},
          {id: 'github', component: 'Slot', source: 'github'},
        ],
      },
    });
    expect(slotStatesOf([paint])).toEqual(
      new Map([
        [SHELL_SOURCE, 'pending'],
        ['linear', 'failed'],
        ['github', null],
      ]),
    );
  });

  it('says nothing about a slot the repaint does not carry', () => {
    expect(
      slotStatesOf([msg({updateComponents: {surfaceId: 'shell:main', components: []}})]).size,
    ).toBe(0);
  });
});

describe('mergeFactsOf', () => {
  const paint = (components: Record<string, unknown>[]) =>
    [{version: 'v0.9', updateComponents: {surfaceId: 'shell:main', components}}] as never;

  it('reads what the orchestrator painted on the merged view’s slot (task-8.4 decision 13)', () => {
    expect(
      mergeFactsOf(
        paint([
          {id: 'github', component: 'Slot', source: 'github', state: 'failed'},
          {
            id: 'merge',
            component: 'Slot',
            source: 'shell',
            content: 'shell',
            merged: ['linear'],
            late: ['circleci'],
            working: {sources: []},
            callFailed: {kind: 'update', sources: []},
          },
        ]),
      ),
    ).toEqual({
      merged: ['linear'],
      late: ['circleci'],
      working: {sources: []},
      callFailed: {kind: 'update', sources: []},
    });
    expect(
      mergeFactsOf(
        paint([
          {
            id: 'merge',
            component: 'Slot',
            source: 'shell',
            content: 'shell',
            state: 'collapsed',
            declined: {reason: 'Nothing lines up.'},
            retrying: ['gmail'],
          },
        ]),
      ),
    ).toEqual({declined: {reason: 'Nothing lines up.'}, retrying: ['gmail']});
  });

  it('says nothing when the paint does not carry the merged view’s slot', () => {
    expect(
      mergeFactsOf(paint([{id: 'github', component: 'Slot', source: 'github'}])),
    ).toBeUndefined();
  });
});
