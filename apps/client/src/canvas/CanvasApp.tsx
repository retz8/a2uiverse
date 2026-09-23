/**
 * The canvas page: the canvas-first shell — a full-screen stage, an overlay slot for question
 * paints, a summonable command palette as the language control plane, a thin status strip,
 * transient ambient notices, and the top-edge history chrome. It owns only layout and the
 * page-level affordances (palette summon, beat replay); the runtime graph and every dispatch
 * handler live in `createCanvasWiring`, built once at mount.
 *
 * `?beat=N[,M…]` replays recorded beats in sequence (paced by the recorded offsets; `&instant`
 * collapses the waits) — the zero-LLM verification path. A beat's presses fire through the same
 * handler the buttons call, answered by the beat's own recording, never the orchestrator.
 */
import {useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore} from 'react';
import {Button, Kbd} from '@radix-ui/themes';
import type {A2ASenderOptions} from '../a2a/client';
import {getBeatFixture} from '../beats/beatFixtures';
import {syntheticBeat} from '../beats/syntheticBeats';
import {
  type PressState,
  PressStateContext,
  SlotContentContext,
  SlotStateContext,
} from '@a2uiverse/shell-catalog';
import {CatalogProvider} from '../catalogs/CatalogContext';
import type {ResolvedCatalog} from '../catalogs/resolver';
import {columnState} from './composition/columnState';
import {useSlotContent} from './composition/slotContent';
import {orderedNotices, questionOnView} from './canvasStore';
import {createCanvasWiring} from './createCanvasWiring';
import {replayBeatOnCanvas} from './replayBeat';
import {AmbientNotice} from './components/AmbientNotice';
import {CanvasOverlay} from './components/CanvasOverlay';
import {CanvasStage} from './components/CanvasStage';
import {HistoryChrome} from './components/HistoryChrome';
import {ParkedStage} from './components/ParkedStage';
import {Palette} from './components/Palette';
import {CompactHead} from './components/CompactHead';
import {ProgressLine} from './components/ProgressLine';
import {QuestionHeader} from './components/QuestionHeader';
import {StatusStrip} from './components/StatusStrip';
import {TrustedPageOverlay} from './components/TrustedPageOverlay';
import type {HostRelay} from './hostRelay';
import {BindingIndexContext} from './navigation/decorateCatalog';
import './CanvasApp.css';

export interface CanvasAppProps extends A2ASenderOptions {
  /** The installed catalogs, resolved by the entry through `orchestratorApi`. */
  catalogs: ResolvedCatalog[];
  /** The relay the shell catalog was built with; the canvas binds its host while mounted. */
  hostRelay?: HostRelay;
}

/** A `?beat=` token: a recorded beat number, or a synthetic beat's name. */
function beatFixtureFor(token: string) {
  const beat = Number(token);
  return Number.isInteger(beat) ? getBeatFixture(beat) : syntheticBeat(token);
}

export function CanvasApp({serverUrl, client, catalogs, hostRelay}: CanvasAppProps) {
  const [wiring] = useState(() =>
    createCanvasWiring({serverUrl, client, catalogs: catalogs.map(c => c.catalog)}),
  );

  const state = useSyncExternalStore(wiring.store.subscribe, wiring.store.getState);

  // What the shell's surfaces raise — a shell action from the model's button or the capability
  // tile, a navigation from a merged cell — lands in this canvas for as long as it is mounted,
  // and its roster names the apps.
  useEffect(() => hostRelay?.bind(wiring.host), [hostRelay, wiring]);

  // What a `Slot` in the shell surface renders: the fragment placed in it, inside its boundary —
  // or, for a slot whose source answered in prose and never painted, what that source said.
  const slotContent = useSlotContent(
    wiring.processor,
    state.placement,
    state.appliedSeq,
    state.promoted,
    state.roster,
    state.prose,
  );

  // What a reserved column in the merged view says of its source (task-8.5 decision 12).
  const {merge, slotStates, placement, presses, superseded} = state;
  const slotStateOf = useCallback(
    (source: string) => columnState({merge, slotStates, placement, presses}, source),
    [merge, slotStates, placement, presses],
  );
  // The presses the paint has not caught up with, and whether a press can be made at all: not on
  // a composition a newer question is replacing (task-8.5 decisions 8, 9).
  const pressState = useMemo<PressState>(
    () => ({
      enabled: !superseded,
      presses: presses.flatMap(({operation, status}) =>
        status === 'running' ? [] : [{operation, status}],
      ),
    }),
    [presses, superseded],
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
  /**
   * What the palette opens holding — the question, when it is opened from the header. A new
   * seed remounts the palette with those words; opening it otherwise keeps any draft.
   */
  const [paletteSeed, setPaletteSeed] = useState<{text?: string; key: number}>({key: 0});
  const openPalette = (text?: string) => {
    if (text !== undefined) setPaletteSeed(seed => ({text, key: seed.key + 1}));
    setPaletteOpen(true);
  };
  /** The page that scrolls and the header at its top: the condensed header watches the one leave the other. */
  const scrollRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLElement>(null);
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
          sides: wiring,
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
  const question = questionOnView(state);
  // The progress line belongs to the live turn; a parked view is a finished one.
  const showProgress = !parkedEntry && (question !== null || state.inFlight !== null);

  return (
    <CatalogProvider catalogs={catalogs}>
      <BindingIndexContext.Provider value={wiring.bindingIndex}>
        <SlotContentContext.Provider value={slotContent}>
          <main
            className={parkedEntry ? 'canvas-app canvas-app--parked' : 'canvas-app'}
            data-replay={replayDone ? 'done' : undefined}
          >
            {/* The header scrolls with the page it heads; once it has left, the condensed bar
                holds the top edge (CompactHead). */}
            <div className="canvas-scroll" data-testid="canvas-scroll" ref={scrollRef}>
              <CompactHead
                scroller={scrollRef}
                head={headRef}
                question={question}
                state={state}
                showProgress={showProgress}
                onEdit={openPalette}
              />
              {(question || showProgress) && (
                <header className="canvas-head" data-testid="canvas-head" ref={headRef}>
                  {question && (
                    // Keyed by the question, so a new one starts over at display size, measured.
                    <QuestionHeader
                      key={`${question.askedAt}:${question.text}`}
                      question={question}
                      onEdit={openPalette}
                    />
                  )}
                  {showProgress && <ProgressLine state={state} since={question?.askedAt ?? null} />}
                </header>
              )}
              {parkedEntry ? (
                <ParkedStage
                  key={parkedEntry.paintId}
                  entry={parkedEntry}
                  create={wiring.createParked}
                  attach={wiring.attachParked}
                />
              ) : (
                <SlotStateContext.Provider value={slotStateOf}>
                  <PressStateContext.Provider value={pressState}>
                    <CanvasStage processor={wiring.processor} state={state} />
                  </PressStateContext.Provider>
                </SlotStateContext.Provider>
              )}
            </div>
            {promotedCount > 0 && (
              <div className="canvas-scrim" data-testid="canvas-scrim" aria-hidden="true" />
            )}
            <div role="status" aria-live="polite" className="canvas-visually-hidden">
              {promotedCount > 0
                ? `${promotedCount} ${promotedCount === 1 ? 'source needs' : 'sources need'} your answer`
                : ''}
            </div>
            <CanvasOverlay processor={wiring.processor} state={state} />
            <TrustedPageOverlay page={state.trustedPage} onClose={wiring.store.closeTrustedPage} />
            <AmbientNotice notices={orderedNotices(state)} onDismiss={wiring.store.dismissNotice} />
            <HistoryChrome
              state={state}
              onPark={wiring.store.park}
              onReturnToLive={wiring.store.returnToLive}
              onRepaint={wiring.repaint}
            />
            <Palette
              key={paletteSeed.key}
              open={paletteOpen}
              initialText={paletteSeed.text}
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
                onClick={() => openPalette()}
              >
                Ask <Kbd className="canvas-ask-kbd">⌘K</Kbd>
              </Button>
            )}
            <StatusStrip state={state} />
          </main>
        </SlotContentContext.Provider>
      </BindingIndexContext.Provider>
    </CatalogProvider>
  );
}
