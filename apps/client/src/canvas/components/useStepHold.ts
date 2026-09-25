/**
 * The fragment whose way back was pressed holds its place on screen while the step is in flight
 * (task-9.9 decision 19). A step changes what sits above the fragment — the merged view restored
 * over another combination, the late row the orchestrator's repaint adds or takes away — and the
 * browser's own scroll anchoring cannot help, the fragment's surface being replaced. So from the
 * press on, every change is absorbed by scrolling: the pressed row, and the arrow under the
 * pointer, stay where they were. The hold ends when the step does, or when the reader scrolls.
 */
import {useEffect, useRef, type RefObject} from 'react';

/** Keys that scroll the page: the reader moving it ends the hold. */
const SCROLL_KEYS = new Set(['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown']);

/** How long a press that started no step holds before letting go. */
const UNCLAIMED_MS = 1000;

interface Hold {
  row: Element;
  top: number;
}

export function useStepHold(scrollRef: RefObject<HTMLElement | null>, stepping: boolean): void {
  const hold = useRef<Hold | null>(null);
  const release = useRef<() => void>(() => {});
  /** The step the hold waits on has begun: its end lets go. */
  const claimed = useRef(false);

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    let unclaimed: ReturnType<typeof setTimeout> | undefined;
    const letGo = () => {
      hold.current = null;
      clearTimeout(unclaimed);
      scroller.style.removeProperty('overflow-anchor');
    };
    release.current = letGo;
    const keep = () => {
      const held = hold.current;
      if (!held) return;
      if (!held.row.isConnected) return letGo();
      const drift = held.row.getBoundingClientRect().top - held.top;
      if (drift !== 0) scroller.scrollTop += drift;
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const row = target?.closest('[data-way]')?.closest('[data-attribution]');
      if (!row) return;
      hold.current = {row, top: row.getBoundingClientRect().top};
      claimed.current = false;
      // The browser's anchoring would move the page too: the hold is the one that does.
      scroller.style.setProperty('overflow-anchor', 'none');
      clearTimeout(unclaimed);
      unclaimed = setTimeout(() => {
        if (!claimed.current) letGo();
      }, UNCLAIMED_MS);
    };
    const onKey = (event: KeyboardEvent) => {
      if (SCROLL_KEYS.has(event.key)) letGo();
    };
    const mutations = new MutationObserver(keep);
    mutations.observe(scroller, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    const sizes = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(keep);
    for (const child of scroller.children) sizes?.observe(child);
    scroller.addEventListener('click', onClick, true);
    scroller.addEventListener('wheel', letGo, {passive: true});
    scroller.addEventListener('touchmove', letGo, {passive: true});
    scroller.addEventListener('keydown', onKey);
    return () => {
      letGo();
      mutations.disconnect();
      sizes?.disconnect();
      scroller.removeEventListener('click', onClick, true);
      scroller.removeEventListener('wheel', letGo);
      scroller.removeEventListener('touchmove', letGo);
      scroller.removeEventListener('keydown', onKey);
    };
  }, [scrollRef]);

  // The step ran and ended: what it changed has been absorbed, so the page is the reader's again.
  useEffect(() => {
    if (stepping) {
      if (hold.current) claimed.current = true;
    } else if (claimed.current) {
      claimed.current = false;
      release.current();
    }
  }, [stepping]);
}
