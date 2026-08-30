/**
 * Slot mounting end to end: the orchestrator's shell surface renders, its `Slot` asks the client
 * for content, and the placed fragment comes back wrapped in its boundary and its own catalog's
 * provider — a second design system inside the first surface.
 */
import {describe, it, expect} from 'vitest';
import {render, screen} from '@testing-library/react';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import {CATALOG, CATALOG_ID} from 'github-catalog';
import {
  CATALOG as SHELL_CATALOG,
  CATALOG_ID as SHELL_CATALOG_ID,
  SlotContentContext,
} from '@a2uiverse/shell-catalog';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import {CatalogProvider, SurfaceFrame} from '../../catalogs/CatalogContext';
import {resolveCatalogs} from '../../catalogs/resolver';
import {listCatalogs} from '../../orchestratorApi';
import type {PlacedFragment} from '../canvasStore';
import {FRAGMENT_BOUNDARY_ATTR} from './FragmentBoundary';
import {renderSlotContent} from './slotContent';

const CATALOGS = resolveCatalogs(await listCatalogs());

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;

/** The shell as the orchestrator paints it: one slot, plus the attribution beside it. */
function composedProcessor(slotState: 'pending' | 'failed' = 'pending') {
  const processor = new MessageProcessor<ReactComponentImplementation>([CATALOG, SHELL_CATALOG]);
  processor.processMessages([
    msg({createSurface: {surfaceId: 'shell:main', catalogId: SHELL_CATALOG_ID}}),
    msg({
      updateComponents: {
        surfaceId: 'shell:main',
        components: [
          {id: 'root', component: 'Column', children: ['attr-slot-github', 'slot-github']},
          {
            id: 'attr-slot-github',
            component: 'Attribution',
            displayName: 'GitHub',
            appId: 'github',
          },
          {
            id: 'slot-github',
            component: 'Slot',
            name: 'slot-github',
            state: slotState,
            label: 'GitHub',
          },
        ],
      },
    }),
    msg({createSurface: {surfaceId: 'github:prs', catalogId: CATALOG_ID}}),
    msg({
      updateComponents: {
        surfaceId: 'github:prs',
        components: [{id: 'root', component: 'Heading', text: 'Pull requests'}],
      },
    }),
  ]);
  return processor;
}

function renderComposed(
  processor: ReturnType<typeof composedProcessor>,
  placement: Map<string, PlacedFragment>,
) {
  const resolve = (slot: string) => renderSlotContent(processor, placement.get(slot), 0);
  const shell = processor.model.surfacesMap.get('shell:main')!;
  return render(
    <CatalogProvider catalogs={CATALOGS}>
      <SlotContentContext.Provider value={resolve}>
        <SurfaceFrame surface={shell} />
      </SlotContentContext.Provider>
    </CatalogProvider>,
  );
}

const PLACED = new Map<string, PlacedFragment>([
  ['slot-github', {surfaceId: 'github:prs', source: 'github'}],
]);

describe('slot mounting', () => {
  it('mounts the placed fragment inside its slot, wrapped in a boundary', () => {
    const {container} = renderComposed(composedProcessor(), PLACED);

    const slot = container.querySelector('[data-slot="slot-github"]');
    expect(slot).not.toBeNull();
    expect(slot!.getAttribute('data-slot-state')).toBe('filled');

    const boundary = slot!.querySelector(`[${FRAGMENT_BOUNDARY_ATTR}="github"]`);
    expect(boundary).not.toBeNull();
    expect(boundary!.getAttribute('data-surface')).toBe('github:prs');
    // The boundary must be a real element for @scope and a portal root to anchor to.
    expect(getComputedStyle(boundary as HTMLElement).display).not.toBe('contents');
    expect(boundary!.textContent).toContain('Pull requests');
  });

  it('names the region for its source without repeating the attribution marker', () => {
    renderComposed(composedProcessor(), PLACED);
    expect(screen.getByRole('group', {name: 'github'})).toBeInTheDocument();
    // The orchestrator-painted marker is a sibling of the slot, outside the fragment's reach —
    // and says something different, so the two do not read as a stutter.
    expect(screen.getByLabelText('Painted by GitHub')).toBeInTheDocument();
  });

  it('an unclaimed slot renders its own pending state and no boundary', () => {
    const {container} = renderComposed(composedProcessor(), new Map());
    const slot = container.querySelector('[data-slot="slot-github"]');
    expect(slot!.getAttribute('data-slot-state')).toBe('pending');
    expect(container.querySelector(`[${FRAGMENT_BOUNDARY_ATTR}]`)).toBeNull();
  });

  it('a failed slot keeps its failure even when a fragment is placed', () => {
    const {container} = renderComposed(composedProcessor('failed'), PLACED);
    const slot = container.querySelector('[data-slot="slot-github"]');
    expect(slot!.getAttribute('data-slot-state')).toBe('failed');
    expect(container.querySelector(`[${FRAGMENT_BOUNDARY_ATTR}]`)).toBeNull();
  });

  it('resolves nothing for a slot whose surface has left the registry', () => {
    const processor = composedProcessor();
    processor.model.deleteSurface('github:prs');
    const {container} = renderComposed(processor, PLACED);
    expect(container.querySelector('[data-slot-state="filled"]')).toBeNull();
  });
});
