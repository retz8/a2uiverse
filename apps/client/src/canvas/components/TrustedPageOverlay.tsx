/**
 * The trusted-page layer: the Store or the App Library, opened over the canvas by a shell
 * action (SPEC §7, §9.3). The pages are an overlay, not a route — the canvas stays mounted
 * beneath, so Phase 14's resume after an install finds the composition that raised the gap.
 * Until Phase 13 builds them this is the placeholder: the page's name, the query it was opened
 * with, and a way back. Two actions, one component: the page is a value, not a second layer.
 *
 * Distinct from `CanvasOverlay`, which mounts a pending question surface.
 */
import {Button, Heading, Text} from '@radix-ui/themes';
import type {TrustedPageState} from '../canvasStore';

export interface TrustedPageOverlayProps {
  page: TrustedPageState | null;
  onClose: () => void;
}

const PAGE_TITLES = {store: 'Store', appLibrary: 'App Library'} as const;

export function TrustedPageOverlay({page, onClose}: TrustedPageOverlayProps) {
  if (!page) return null;
  const title = PAGE_TITLES[page.page];
  return (
    <div
      className="canvas-trusted-page"
      data-testid="trusted-page-overlay"
      data-page={page.page}
      data-query={page.query}
      role="dialog"
      aria-modal="false"
      aria-label={title}
    >
      <div className="canvas-trusted-page__panel">
        <Heading as="h2" size="5">
          {title}
        </Heading>
        {page.query !== undefined && (
          <Text as="p" size="2" color="gray" data-testid="trusted-page-query">
            Searching for “{page.query}”
          </Text>
        )}
        <Text as="p" size="2" color="gray">
          Not built yet.
        </Text>
        <Button variant="soft" size="2" onClick={onClose}>
          Back to the canvas
        </Button>
      </div>
    </div>
  );
}
