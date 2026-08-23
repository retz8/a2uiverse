/**
 * The history chrome (task 8.4, spec decisions 9, 12–14): a floating Back button at the top
 * left — click steps to the chronological neighbour, right-click opens the titled history
 * list — and, while parked, a full-width banner materialising around it: return-to-live
 * beside Back, the stale text centred, Repaint at the right. No Forward: return-to-live
 * leaves the past in one gesture, the list addresses any retained entry directly.
 *
 * All of this is shell chrome — the user's command channel, never blocked by an in-flight
 * paint (decision 16). Titles are agent-authored when the paint streamed one (task 8.5),
 * `entryTitle` fallbacks otherwise; the causal chip renders only on forked entries and goes inert when its parent is
 * evicted, naming it via the denormalised `parentTitle`.
 */
import {useState} from 'react';
import {Button} from '@radix-ui/themes';
import type {CanvasState} from '../canvasStore';
import type {PaintEntry} from '../timeline/paint';
import {entryTitle} from '../timeline/paint';

export interface HistoryChromeProps {
  state: CanvasState;
  onPark: (paintId: number) => void;
  onReturnToLive: () => void;
  onRepaint: () => void;
}

const timeOf = (ms: number | undefined): string =>
  ms === undefined ? '' : new Date(ms).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

export function HistoryChrome({state, onPark, onReturnToLive, onRepaint}: HistoryChromeProps) {
  const [listOpen, setListOpen] = useState(false);
  const {timeline, viewing, stageId, headAdvancedWhileParked} = state;

  // The current position in the chronological sequence: the parked index; the head while its
  // paint occupies the stage; one past the end on a live-and-empty canvas (whose neighbour is
  // then the newest departed entry).
  const viewedIndex =
    viewing !== null
      ? timeline.findIndex(e => e.paintId === viewing)
      : stageId !== null
        ? timeline.length - 1
        : timeline.length;
  const backTarget: PaintEntry | undefined = timeline[viewedIndex - 1];
  const viewedEntry = viewing !== null ? timeline[viewedIndex] : undefined;
  const head = timeline[timeline.length - 1];

  const jump = (entry: PaintEntry) => {
    setListOpen(false);
    // The live head is not parkable — picking it in the list is return-to-live.
    if (entry.snapshot === null) onReturnToLive();
    else if (entry.paintId === head?.paintId && viewing === null) return;
    else onPark(entry.paintId);
  };

  return (
    <div className={viewedEntry ? 'canvas-history canvas-history--parked' : 'canvas-history'}>
      <button
        type="button"
        className="canvas-history-back"
        aria-label="Back"
        disabled={!backTarget}
        onClick={() => backTarget && onPark(backTarget.paintId)}
        onContextMenu={e => {
          e.preventDefault();
          if (timeline.length > 0) setListOpen(open => !open);
        }}
      >
        {/* Octicon arrow-left, inlined — the client has no direct octicons dependency. */}
        <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
          <path d="M7.78 12.53a.75.75 0 0 1-1.06 0L2.47 8.28a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L4.81 7h7.44a.75.75 0 0 1 0 1.5H4.81l2.97 2.97a.75.75 0 0 1 0 1.06Z" />
        </svg>
      </button>
      {viewedEntry && (
        <>
          <Button size="1" variant="soft" onClick={onReturnToLive}>
            Return to live
          </Button>
          <span className="canvas-history-stale">
            Past view — data as of {timeOf(viewedEntry.snapshot?.capturedAt)}
            {headAdvancedWhileParked && (
              <em className="canvas-history-newer"> · newer view available</em>
            )}
          </span>
          <Button size="1" variant="solid" onClick={onRepaint}>
            Repaint
          </Button>
        </>
      )}
      {listOpen && (
        <>
          <div className="canvas-history-backdrop" onClick={() => setListOpen(false)} />
          <ul className="canvas-history-list" role="menu" aria-label="History">
            {[...timeline].reverse().map(entry => {
              const isLiveHead = entry.snapshot === null;
              const parentRetained =
                entry.cause.forked &&
                entry.cause.parent !== null &&
                timeline.some(e => e.paintId === entry.cause.parent);
              return (
                <li key={entry.paintId} role="none" className="canvas-history-item">
                  <button type="button" role="menuitem" onClick={() => jump(entry)}>
                    <span className="canvas-history-title">{entryTitle(entry)}</span>
                    {isLiveHead && <span className="canvas-history-live"> · live</span>}
                  </button>
                  {entry.cause.forked && entry.cause.parentTitle && (
                    // The causal chip: only forks carry information; inert once evicted.
                    <button
                      type="button"
                      className="canvas-history-chip"
                      disabled={!parentRetained}
                      onClick={() => {
                        if (entry.cause.parent !== null) {
                          setListOpen(false);
                          onPark(entry.cause.parent);
                        }
                      }}
                    >
                      ↩ from {entry.cause.parentTitle}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
