/**
 * The time-travel gate over real recordings: the
 * round-trip fidelity check — a recorded beat lands live, departs at the next paint
 * (serialize-on-swap), then parks; the rehydrated render must match what the live render
 * produced. Zero LLM calls; the recordings drive everything.
 */
import {describe, it, expect} from 'vitest';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import {CATALOG} from 'primer-a2ui-adapter';
import {BEAT_FIXTURES} from '../src/beats/beatFixtures';
import {createCanvasStore} from '../src/canvas/canvasStore';
import {createTurnRunner} from '../src/canvas/turn/canvasTurn';
import {createParkedSession} from '../src/canvas/timeline/parkedSession';
import {replayBeatOnCanvas} from '../src/canvas/replayBeat';
import {CanvasStage} from '../src/canvas/components/CanvasStage';
import {ParkedStage} from '../src/canvas/components/ParkedStage';
import {renderWithShell} from './helpers';

function setup() {
  const processor = new MessageProcessor([CATALOG]);
  const store = createCanvasStore();
  const runner = createTurnRunner({
    processor,
    store,
    createStaging: () => new MessageProcessor([CATALOG]),
  });
  return {processor, store, runner};
}

/** React's useId tokens (`_r_61_` / `:r0:`) differ per render pass and carry no fidelity signal. */
const normalize = (html: string): string =>
  html.replace(/_r_[0-9a-z]+_/g, '_id_').replace(/:r[0-9a-z]+:/g, ':id:');

describe('parked-restore round-trip fidelity', () => {
  // The two largest recordings (252 and 201 components) exercise the widest component
  // vocabulary; the smallest keeps a cheap end of the sweep.
  const picked = BEAT_FIXTURES.filter(f => [2, 6, 8].includes(f.beat));

  describe.each(picked.map(f => [f.name, f] as const))('%s', (_name, fixture) => {
    it('rehydrates from the snapshot to the same rendered surface', async () => {
      const {store, runner, processor} = setup();

      // Land the beat live and capture what the live stage renders.
      await replayBeatOnCanvas(fixture, {runner, store, paced: false});
      expect(store.getState().error).toBeNull();
      const live = renderWithShell(<CanvasStage processor={processor} state={store.getState()} />);
      const liveHtml = live.container.querySelector('.canvas-stage')!.innerHTML;
      expect(liveHtml.length).toBeGreaterThan(0);
      live.unmount();

      // Depart it: the next paint triggers serialize-on-swap.
      await replayBeatOnCanvas(BEAT_FIXTURES[0], {runner, store, paced: false});
      const entry = store.getState().timeline[0];
      expect(entry.snapshot).not.toBeNull();

      // Park and render the rehydrated snapshot.
      store.park(entry.paintId);
      const parked = renderWithShell(
        <ParkedStage
          entry={entry}
          create={e => createParkedSession(e, {catalogs: [CATALOG], store})}
          attach={() => () => {}}
        />,
      );
      const parkedHtml = parked.container.querySelector('.canvas-stage')!.innerHTML;

      expect(normalize(parkedHtml)).toBe(normalize(liveHtml));
    });
  });
});
