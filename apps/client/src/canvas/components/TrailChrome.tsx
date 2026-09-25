/**
 * The trail chrome (task-9.6 decisions 5–12), drawn to board F5 of the task 7.14 design canvas:
 *
 * - In the gutter, Back — to the canvas asked just before the one on screen — and Trail beside it,
 *   which opens the rail.
 * - The rail: the trail of the session's canvases, newest first under a day header, each entry
 *   its label — the Planner's title, the question until it arrives — its time, "Live" on the
 *   newest, "Viewing" on the one on screen, a quiet mark on one still loading, a branch glyph on
 *   one asked from a past canvas — its parent named on hover and for assistive technology, the
 *   spine drawing the line — and a close. Picking an entry views it and closes the rail, since the drawer covers what the pick brought on screen; it closes on its own
 *   icon, on Trail again, on Escape, and on a click on the scrim over the page, which lands nowhere
 *   else. Hover or focus on an entry shows its preview.
 * - On a past canvas, the band over the page: "Parked · asked at HH:MM", "Ask this again now",
 *   "Return to live" naming the live question.
 *
 * All of this is shell chrome — the user's command channel, never blocked by a paint in flight.
 */
import {useEffect, useState, type CSSProperties} from 'react';
import type {CanvasRuntime} from '../canvasRuntime';
import type {TrailEntry, TrailState} from '../trail/trailStore';
import {
  backTarget,
  entryLabel,
  entryOf,
  isBranch,
  newestFirst,
  viewedCanvasId,
} from '../trail/trailStore';
import {LANE_GAP, LANE_X, ROW_HEIGHT, spineOf} from '../trail/spine';
import {dayOf, timeOf} from '../trail/time';
import {BAND_MIDDLE_ID} from './CompactHead';
import {TrailPreview} from './TrailPreview';

export interface TrailChromeProps {
  trail: TrailState;
  open: boolean;
  onToggle: () => void;
  onView: (id: string) => void;
  onReturnToLive: () => void;
  onClose: (id: string) => void;
  onAskAgain: () => void;
  /** The runtime of an entry's canvas, for its preview. */
  runtimeOf: (id: string) => CanvasRuntime | undefined;
}

const BackIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
    <path d="M7.78 12.53a.75.75 0 0 1-1.06 0L2.47 8.28a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L4.81 7h7.44a.75.75 0 0 1 0 1.5H4.81l2.97 2.97a.75.75 0 0 1 0 1.06Z" />
  </svg>
);

/** The Trail button: a branch, since the trail is one. */
const TrailIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
    <path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Zm-6 0a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Zm8.25-.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM4.25 12a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" />
  </svg>
);

const CloseIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none">
    <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const ParkedIcon = () => (
  <svg
    aria-hidden="true"
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.4"
    strokeLinecap="round"
  >
    <circle cx="7" cy="7" r="5.8" />
    <path d="M5.8 5v4M8.2 5v4" />
  </svg>
);

const AgainIcon = () => (
  <svg
    aria-hidden="true"
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M11.8 5.5A5 5 0 1 0 12 8" />
    <path d="M12 2.5v3h-3" />
  </svg>
);

const ForwardIcon = () => (
  <svg
    aria-hidden="true"
    width="14"
    height="14"
    viewBox="0 0 14 14"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2.5 7h9M8 3.5L11.5 7 8 10.5" />
  </svg>
);

const BranchIcon = () => (
  <svg
    aria-hidden="true"
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinecap="round"
  >
    <circle cx="3" cy="2.5" r="1.3" />
    <circle cx="3" cy="9.5" r="1.3" />
    <circle cx="9" cy="4" r="1.3" />
    <path d="M3 3.8v4.4M9 5.3c0 2.2-6 1.8-6 2.9" />
  </svg>
);

const LoadingMark = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 12 12"
    width="12"
    height="12"
    fill="none"
    className="canvas-spin"
  >
    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.25" />
    <path
      d="M10.5 6a4.5 4.5 0 0 0-4.5-4.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * The spine beside a group's entries (board F5): the lanes and connectors of `spineOf`, a node
 * per entry — the live one filled accent with a halo, the viewed one filled ink, the rest rings.
 */
function TrailSpine({
  entries,
  liveId,
  viewedId,
  lineage,
  hoveredId,
}: {
  entries: readonly TrailEntry[];
  liveId: string | null;
  viewedId: string | null;
  /** The viewed canvas and its ancestry: drawn in ink, the rest in the faint grey. */
  lineage: ReadonlySet<string>;
  /** The entry under the pointer: its ring fills grey with its row. */
  hoveredId: string | null;
}) {
  const spine = spineOf(entries);
  const parentOf = new Map(entries.map(entry => [entry.id, entry.parent]));
  /** A connector in the lineage: from an ancestor to the one before it. */
  const litLine = (id: string) => {
    const parent = parentOf.get(id);
    return lineage.has(id) && parent !== undefined && lineage.has(parent);
  };
  const width = LANE_X + LANE_GAP * spine.lanes + 8;
  const height = entries.length * ROW_HEIGHT;
  return (
    <svg
      className="canvas-trail-spine"
      aria-hidden="true"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
    >
      {spine.connectors.map(connector => (
        <path
          key={connector.from.id}
          d={connector.path}
          className={
            litLine(connector.from.id)
              ? 'canvas-trail-spine-line canvas-trail-spine-line--lit'
              : 'canvas-trail-spine-line'
          }
          fill="none"
          strokeWidth="1.5"
        />
      ))}
      {spine.nodes.map(node =>
        node.id === liveId ? (
          <g key={node.id}>
            <circle cx={node.x} cy={node.y} r="8" className="canvas-trail-spine-halo" />
            <circle cx={node.x} cy={node.y} r="4.5" className="canvas-trail-spine-live" />
          </g>
        ) : node.id === viewedId ? (
          <circle
            key={node.id}
            cx={node.x}
            cy={node.y}
            r="4.5"
            className="canvas-trail-spine-viewing"
          />
        ) : (
          <circle
            key={node.id}
            cx={node.x}
            cy={node.y}
            r="4"
            className={[
              'canvas-trail-spine-node',
              lineage.has(node.id) ? 'canvas-trail-spine-node--lit' : '',
              node.id === hoveredId ? 'canvas-trail-spine-node--hover' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            strokeWidth="1.5"
          />
        ),
      )}
    </svg>
  );
}

/** The node column: 48px, or wider when the spine's lanes need it (each 16px more). */
function nodeColumnWidth(entries: readonly TrailEntry[]): number {
  const lanes = Math.max(0, ...grouped(entries).map(group => spineOf(group.entries).lanes));
  return Math.max(48, LANE_X + LANE_GAP * lanes + 6);
}

/** How long the rail takes to slide in or out — the CSS animation's length. */
const RAIL_MS = 240;

/** The viewed canvas and its ancestry, as far as the trail still holds it. */
function lineageOf(trail: TrailState, viewedId: string | null): Set<string> {
  const lineage = new Set<string>();
  let at = viewedId;
  while (at !== null && !lineage.has(at)) {
    lineage.add(at);
    at = entryOf(trail, at)?.parent ?? null;
  }
  return lineage;
}

/** The entries under their day headers, newest first. */
function grouped(entries: readonly TrailEntry[]): Array<{day: string; entries: TrailEntry[]}> {
  const groups: Array<{day: string; entries: TrailEntry[]}> = [];
  for (const entry of newestFirst(entries)) {
    const day = dayOf(entry.askedAt);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.entries.push(entry);
    else groups.push({day, entries: [entry]});
  }
  return groups;
}

export function TrailChrome({
  trail,
  open,
  onToggle,
  onView,
  onReturnToLive,
  onClose,
  onAskAgain,
  runtimeOf,
}: TrailChromeProps) {
  const viewedId = viewedCanvasId(trail);
  /**
   * The rail slides in and out (240ms): it stays mounted through its exit, so a close is not a
   * pop. `shown` lags `open` on the way out.
   */
  const [wasOpen, setWasOpen] = useState(open);
  const [closing, setClosing] = useState(false);
  // Derived from the prop's change, during render: a close starts the exit.
  if (wasOpen !== open) {
    setWasOpen(open);
    if (!open) setClosing(true);
  }
  useEffect(() => {
    if (!closing) return;
    const timer = setTimeout(() => setClosing(false), RAIL_MS);
    return () => clearTimeout(timer);
  }, [closing]);
  const shown = open || closing;
  const exiting = closing && !open;
  const viewed = entryOf(trail, viewedId);
  const live = entryOf(trail, trail.live);
  const past = trail.viewing !== null && viewed !== undefined;
  const back = backTarget(trail);
  /** The entry under the pointer or focus, and where its row sits — its preview's place. */
  const [previewing, setPreviewing] = useState<{id: string; top: number} | null>(null);
  /** The parent a hovered "from" mark points at: its row lit while the pointer is on the mark. */
  const [litParent, setLitParent] = useState<string | null>(null);
  /** The entry under the pointer: its node fills, as its row does. */
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const lineage = lineageOf(trail, viewedId);
  const previewRuntime =
    previewing && previewing.id !== viewedId ? runtimeOf(previewing.id) : undefined;
  const previewEntry = previewing ? entryOf(trail, previewing.id) : undefined;

  // A closed rail previews nothing: an entry picked closes it under the pointer, which never
  // leaves the row, so the next opening would show that entry's preview unasked. Reset as the
  // rail closes, during render.
  const [previewsOpen, setPreviewsOpen] = useState(open);
  if (open !== previewsOpen) {
    setPreviewsOpen(open);
    if (!open) {
      setPreviewing(null);
      setLitParent(null);
      setHoveredId(null);
    }
  }

  // Escape closes the rail wherever focus is, as it dismisses the palette.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onToggle();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onToggle]);

  const show = (id: string, element: HTMLElement) =>
    setPreviewing({id, top: element.getBoundingClientRect().top});
  const hide = (id: string) => setPreviewing(current => (current?.id === id ? null : current));

  return (
    <>
      {!open && (
        <div className="canvas-gutter" data-testid="canvas-gutter">
          <button
            type="button"
            className="canvas-iconbtn canvas-back"
            aria-label="Back"
            title={back ? `Back to ${entryLabel(back)}` : undefined}
            disabled={!back}
            onClick={() => back && onView(back.id)}
          >
            <BackIcon />
          </button>
          <button
            type="button"
            className="canvas-iconbtn canvas-trail-toggle"
            aria-label="Trail"
            title="Trail"
            aria-expanded={open}
            aria-controls="canvas-trail"
            disabled={trail.entries.length === 0}
            onClick={onToggle}
          >
            <TrailIcon />
          </button>
        </div>
      )}
      {shown && (
        // The scrim: the page behind the drawer, a click on it closing the drawer and landing
        // nowhere else.
        <div
          className={
            exiting ? 'canvas-trail-scrim canvas-trail-scrim--closing' : 'canvas-trail-scrim'
          }
          data-testid="canvas-trail-scrim"
          aria-hidden="true"
          onClick={() => {
            if (open) onToggle();
          }}
        />
      )}
      {shown && (
        <nav
          id="canvas-trail"
          className={exiting ? 'canvas-trail canvas-trail--closing' : 'canvas-trail'}
          style={{'--a2v-trail-col': `${nodeColumnWidth(trail.entries)}px`} as CSSProperties}
          aria-label="Trail of past canvases"
          aria-hidden={exiting || undefined}
          inert={exiting || undefined}
        >
          <div className="canvas-trail-top">
            <button
              type="button"
              className="canvas-iconbtn"
              aria-label="Close the trail"
              title="Trail"
              onClick={onToggle}
            >
              <CloseIcon />
            </button>
            <span className="canvas-trail-title">Trail</span>
          </div>
          {grouped(trail.entries).map(group => (
            <div key={group.day}>
              <div className="canvas-trail-group">{group.day}</div>
              <ul className="canvas-trail-entries">
                <TrailSpine
                  entries={group.entries}
                  liveId={trail.live}
                  viewedId={viewedId}
                  lineage={lineage}
                  hoveredId={hoveredId}
                />
                {group.entries.map(entry => {
                  const label = entryLabel(entry);
                  const isViewing = entry.id === viewedId;
                  const isLive = entry.id === trail.live;
                  const branch = isBranch(trail, entry);
                  const parent = branch ? entryOf(trail, entry.parent ?? null) : undefined;
                  return (
                    <li
                      key={entry.id}
                      className={
                        isViewing
                          ? 'canvas-trail-entry canvas-trail-entry--viewing'
                          : entry.id === litParent
                            ? 'canvas-trail-entry canvas-trail-entry--lit'
                            : 'canvas-trail-entry'
                      }
                      data-testid="canvas-trail-entry"
                      data-live={isLive || undefined}
                      data-viewing={isViewing || undefined}
                      data-loading={entry.loading || undefined}
                      data-branch={branch || undefined}
                      onMouseEnter={() => setHoveredId(entry.id)}
                      onMouseLeave={() =>
                        setHoveredId(current => (current === entry.id ? null : current))
                      }
                    >
                      <button
                        type="button"
                        className="canvas-trail-pick"
                        data-testid="canvas-trail-pick"
                        title={entry.question}
                        aria-current={isViewing ? 'true' : undefined}
                        onClick={() => onView(entry.id)}
                        onMouseEnter={e => show(entry.id, e.currentTarget)}
                        onMouseLeave={() => hide(entry.id)}
                        onFocus={e => show(entry.id, e.currentTarget)}
                        onBlur={() => hide(entry.id)}
                      >
                        <span />
                        <span className="canvas-trail-text">
                          <span
                            key={entry.title ?? ''}
                            className="canvas-trail-label"
                            data-testid="canvas-trail-label"
                          >
                            {label}
                          </span>
                          <span className="canvas-trail-meta">
                            <span>{timeOf(entry.askedAt)}</span>
                            {isLive && <span className="canvas-trail-live">Live</span>}
                            {isViewing && <span className="canvas-trail-viewing">Viewing</span>}
                            {entry.loading && (
                              <span className="canvas-trail-loading" title="Still loading">
                                <LoadingMark />
                              </span>
                            )}
                            {branch &&
                              entry.parent &&
                              (parent ? (
                                <span
                                  className="canvas-trail-from"
                                  role="img"
                                  title={`Asked from ${entryLabel(parent)}`}
                                  aria-label={`Asked from ${entryLabel(parent)}`}
                                  onMouseEnter={() => setLitParent(parent.id)}
                                  onMouseLeave={() => setLitParent(null)}
                                >
                                  <BranchIcon />
                                </span>
                              ) : (
                                <span
                                  className="canvas-trail-from"
                                  role="img"
                                  title="Asked from a canvas since closed"
                                  aria-label="Asked from a canvas since closed"
                                >
                                  <BranchIcon />
                                </span>
                              ))}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        className="canvas-iconbtn canvas-trail-close"
                        aria-label={`Close ${label}`}
                        title="Close this canvas"
                        onClick={() => onClose(entry.id)}
                      >
                        <CloseIcon />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      )}
      {open && previewRuntime && previewEntry && (
        <TrailPreview
          runtime={previewRuntime}
          label={entryLabel(previewEntry)}
          top={previewing?.top ?? 0}
          railColumn={nodeColumnWidth(trail.entries)}
        />
      )}
      {past && viewed && (
        <div className="canvas-band" data-testid="canvas-band" aria-label="Parked view">
          <span className="canvas-band-note">
            <ParkedIcon />
            <b>Parked</b> · asked at {timeOf(viewed.askedAt)}
          </span>
          {/* The condensed question and progress fold in here once the head has scrolled away. */}
          <div className="canvas-band-middle" id={BAND_MIDDLE_ID} />
          <button type="button" className="canvas-band-primary" onClick={onAskAgain}>
            <AgainIcon />
            Ask this again now
          </button>
          {live && (
            <button type="button" className="canvas-band-tolive" onClick={onReturnToLive}>
              <span className="canvas-band-tolive-label">Return to live</span>
              <span className="canvas-band-tolive-dest">{live.question}</span>
              <ForwardIcon />
            </button>
          )}
        </div>
      )}
    </>
  );
}
