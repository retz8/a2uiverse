/**
 * The canvas page: the canvas-first shell — a full-screen stage, an overlay slot for question
 * paints, a summonable command palette as the language control plane, a thin status strip,
 * transient ambient notices, and the top-edge history chrome. It owns only layout and the
 * page-level affordances (palette summon, beat replay); the runtime graph and every dispatch
 * handler live in `createCanvasWiring`, built once at mount.
 *
 * `?beat=N[,M…]` replays recorded beats in sequence (paced by the recorded offsets; `&instant`
 * collapses the waits) — the zero-LLM verification path.
 */
import {useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {Button, Kbd} from '@radix-ui/themes';
import type {A2ASenderOptions} from '../a2a/client';
import {getBeatFixture} from '../beats/beatFixtures';
import {syntheticBeat} from '../beats/syntheticBeats';
import {SlotContentContext} from '@a2uiverse/shell-catalog';
import {CatalogProvider} from '../catalogs/CatalogContext';
import type {ResolvedCatalog} from '../catalogs/resolver';
import {useSlotContent} from './composition/slotContent';
import {createCanvasWiring} from './createCanvasWiring';
import {replayBeatOnCanvas} from './replayBeat';
import {AmbientNotice} from './components/AmbientNotice';
import {CanvasOverlay} from './components/CanvasOverlay';
import {CanvasStage} from './components/CanvasStage';
import {HistoryChrome} from './components/HistoryChrome';
import {ParkedStage} from './components/ParkedStage';
import {Palette} from './components/Palette';
import {StatusStrip} from './components/StatusStrip';
import './CanvasApp.css';

export interface CanvasAppProps extends A2ASenderOptions {
  /** The installed catalogs, resolved by the entry through `orchestratorApi`. */
  catalogs: ResolvedCatalog[];
}

/** A `?beat=` token: a recorded beat number, or a synthetic beat's name. */
function beatFixtureFor(token: string) {
  const beat = Number(token);
  return Number.isInteger(beat) ? getBeatFixture(beat) : syntheticBeat(token);
}

export function CanvasApp({serverUrl, client, catalogs}: CanvasAppProps) {
  const [wiring] = useState(() =>
    createCanvasWiring({serverUrl, client, catalogs: catalogs.map(c => c.catalog)}),
  );

  const state = useSyncExternalStore(wiring.store.subscribe, wiring.store.getState);

  // What a `Slot` in the shell surface renders: the fragment placed in it, inside its boundary.
  const slotContent = useSlotContent(
    wiring.processor,
    state.placement,
    state.appliedSeq,
    state.promoted,
  );

  // Promotion is plural, so it is emphasis rather than a modal: no focus trap, and the count
  // is announced instead of the focus being seized.
  const promotedCount = state.promoted.size;

  // The ?beat= replay affordance, read once at mount. A comma-separated list runs in sequence.
  const [beatParams] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const beat = params.get('beat');
    return beat === null ? null : {beats: beat.split(','), instant: params.has('instant')};
  });

  // The palette auto-opens on an empty idle canvas (nothing else to do there) — unless a
  // beat replay is about to occupy the stage.
  const [paletteOpen, setPaletteOpen] = useState(beatParams === null);
  /** Set once the whole `?beat=` list has replayed — the settle signal for visual tests. */
  const [replayDone, setReplayDone] = useState(false);

  const replayStarted = useRef(false);
  useEffect(() => {
    if (!beatParams || replayStarted.current) return;
    replayStarted.current = true;
    void (async () => {
      for (const beat of beatParams.beats) {
        const fixture = beatFixtureFor(beat);
        if (!fixture) {
          wiring.store.reportError(`Unknown beat: ${beat}.`);
          return;
        }
        await replayBeatOnCanvas(fixture, {
          runner: wiring.runner,
          store: wiring.store,
          paced: !beatParams.instant,
        });
      }
      setReplayDone(true);
    })();
  }, [beatParams, wiring]);

  // ⌘K (or Ctrl+K) summons the palette from anywhere on the page.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const parkedEntry =
    state.viewing !== null ? state.timeline.find(e => e.paintId === state.viewing) : undefined;

  return (
    <CatalogProvider catalogs={catalogs}>
      <SlotContentContext.Provider value={slotContent}>
        <main
          className={parkedEntry ? 'canvas-app canvas-app--parked' : 'canvas-app'}
          data-replay={replayDone ? 'done' : undefined}
        >
          {parkedEntry ? (
            <ParkedStage
              key={parkedEntry.paintId}
              entry={parkedEntry}
              create={wiring.createParked}
              attach={wiring.attachParked}
            />
          ) : (
            <CanvasStage processor={wiring.processor} state={state} />
          )}
          {promotedCount > 0 && (
            <div className="canvas-scrim" data-testid="canvas-scrim" aria-hidden="true" />
          )}
          <div role="status" aria-live="polite" className="canvas-visually-hidden">
            {promotedCount > 0
              ? `${promotedCount} ${promotedCount === 1 ? 'source needs' : 'sources need'} your answer`
              : ''}
          </div>
          <CanvasOverlay processor={wiring.processor} state={state} />
          <AmbientNotice notice={state.notice} onDismiss={wiring.store.dismissNotice} />
          <HistoryChrome
            state={state}
            onPark={wiring.store.park}
            onReturnToLive={wiring.store.returnToLive}
            onRepaint={wiring.repaint}
          />
          <Palette
            open={paletteOpen}
            onDismiss={() => setPaletteOpen(false)}
            onSubmit={utterance => {
              setPaletteOpen(false);
              void wiring.sendUtterance(utterance);
            }}
          />
          {/* The canvas's one call-to-action; yields to the palette while it is open. */}
          {!paletteOpen && (
            <Button
              variant="solid"
              size="3"
              className="canvas-ask-pill"
              aria-label="Ask"
              onClick={() => setPaletteOpen(true)}
            >
              Ask <Kbd className="canvas-ask-kbd">⌘K</Kbd>
            </Button>
          )}
          <StatusStrip state={state} />
        </main>
      </SlotContentContext.Provider>
    </CatalogProvider>
  );
}
