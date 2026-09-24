/**
 * The canvas page: the canvas-first shell — the canvas on screen (`CanvasView`, keyed by the
 * canvas), a summonable command palette as the language control plane, the trail chrome (Back,
 * Trail, the rail, the band on a past canvas), the trusted page over the canvas, and the Ask
 * pill. It owns only layout and the page-level affordances (palette summon, beat replay); the
 * runtime graph and every dispatch handler live in `createCanvasWiring`, built once at mount.
 *
 * `?beat=N[,M…]` replays recorded beats in sequence (paced by the recorded offsets; `&instant`
 * collapses the waits) — the zero-LLM verification path. Every utterance of a beat opens a canvas
 * of its own in the trail (task-9.6 decision 14). A beat's presses fire through the same handler
 * the buttons call, answered by the beat's own recording, never the orchestrator.
 */
import {useCallback, useEffect, useRef, useState, useSyncExternalStore} from 'react';
import {Button, Kbd} from '@radix-ui/themes';
import type {A2ASenderOptions} from '../a2a/client';
import {getBeatFixture} from '../beats/beatFixtures';
import {syntheticBeat} from '../beats/syntheticBeats';
import {CatalogProvider} from '../catalogs/CatalogContext';
import type {ResolvedCatalog} from '../catalogs/resolver';
import {createCanvasWiring} from './createCanvasWiring';
import {replayBeatOnCanvas} from './replayBeat';
import {CanvasView} from './components/CanvasView';
import {EmptyCanvas} from './components/CanvasStage';
import {Palette} from './components/Palette';
import {StatusStrip} from './components/StatusStrip';
import {TrailChrome} from './components/TrailChrome';
import {TrustedPageOverlay} from './components/TrustedPageOverlay';
import type {HostRelay} from './hostRelay';
import {viewedCanvasId} from './trail/trailStore';
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

  const trail = useSyncExternalStore(wiring.trail.subscribe, wiring.trail.getState);
  const viewedId = viewedCanvasId(trail);
  const runtime = viewedId === null ? undefined : wiring.runtimeOf(viewedId);
  const past = trail.viewing !== null;

  // What the shell's surfaces raise — a shell action from the model's button or the capability
  // tile, a navigation from a merged cell, a press — lands in the canvas on screen for as long as
  // the page is mounted, and that canvas's roster names the apps.
  useEffect(() => hostRelay?.bind(wiring.host), [hostRelay, wiring]);

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
  const openPalette = useCallback((text?: string) => {
    if (text !== undefined) setPaletteSeed(seed => ({text, key: seed.key + 1}));
    setPaletteOpen(true);
  }, []);
  /** The rail, opened from Trail beside Back (task-9.6 decision 11); a pick closes it. */
  const [trailOpen, setTrailOpen] = useState(false);
  const toggleTrail = useCallback(() => setTrailOpen(open => !open), []);
  const viewFromTrail = useCallback(
    (id: string) => {
      wiring.view(id);
      setTrailOpen(false);
    },
    [wiring],
  );
  /** Set once the whole `?beat=` list has replayed — the settle signal for visual tests. */
  const [replayDone, setReplayDone] = useState(false);
  /** A replay that could not start: the sticky error with no canvas to carry it. */
  const [replayError, setReplayError] = useState<string | null>(null);

  const replayStarted = useRef(false);
  useEffect(() => {
    if (!beatParams || replayStarted.current) return;
    replayStarted.current = true;
    void (async () => {
      for (const beat of beatParams.beats) {
        const fixture = beatFixtureFor(beat);
        if (!fixture) {
          setReplayError(`Unknown beat: ${beat}.`);
          return;
        }
        await replayBeatOnCanvas(fixture, {
          canvases: wiring,
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

  const className = past ? 'canvas-app canvas-app--parked' : 'canvas-app';

  return (
    <CatalogProvider catalogs={catalogs}>
      <main className={className} data-replay={replayDone ? 'done' : undefined}>
        {runtime ? (
          <CanvasView key={runtime.id} runtime={runtime} onEdit={openPalette} />
        ) : (
          <>
            <div className="canvas-scroll" data-testid="canvas-scroll">
              <EmptyCanvas />
            </div>
            <StatusStrip error={replayError} />
          </>
        )}
        <TrustedPageOverlay page={trail.trustedPage} onClose={wiring.trail.closeTrustedPage} />
        <TrailChrome
          trail={trail}
          open={trailOpen}
          onToggle={toggleTrail}
          onView={viewFromTrail}
          onReturnToLive={wiring.returnToLive}
          onClose={wiring.closeCanvas}
          onAskAgain={() => void wiring.askAgain()}
          runtimeOf={wiring.runtimeOf}
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
        {/* The canvas's one call-to-action; yields to the palette while it is open. On a past
            canvas it says so: the question starts a branch from this view (board F5). */}
        {!paletteOpen && (
          <Button
            variant="solid"
            size="3"
            className="canvas-ask-pill"
            aria-label={past ? 'Ask from this view' : 'Ask'}
            title={past ? 'Starts a branch from this view' : undefined}
            onClick={() => openPalette()}
          >
            {past ? 'Ask from this view' : 'Ask'} <Kbd className="canvas-ask-kbd">⌘K</Kbd>
          </Button>
        )}
      </main>
    </CatalogProvider>
  );
}
