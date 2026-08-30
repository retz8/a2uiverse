/**
 * The two local patches to `@a2ui/react`'s v0_9 bundle (`patches/@a2ui__react@0.10.2.patch`).
 * Both are renderer defects that only bite under composition, which is why they are pinned here
 * rather than in the vendor's own suite: two surfaces on one canvas is the precondition for the
 * first, and a fragment carrying a component this client does not have is the precondition for
 * the second.
 */
import {describe, it, expect} from 'vitest';
import {render, within} from '@testing-library/react';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import {CATALOG as SHELL_CATALOG, CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog';
import {CatalogProvider, SurfaceFrame} from '../../catalogs/CatalogContext';
import {resolveCatalogs} from '../../catalogs/resolver';
import {listCatalogs} from '../../orchestratorApi';

const CATALOGS = resolveCatalogs(await listCatalogs());

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;

/** Two surfaces whose pickers share a component id — the spec guarantees ids are surface-scoped. */
function twoPickers() {
  const processor = new MessageProcessor<ReactComponentImplementation>([SHELL_CATALOG]);
  for (const surfaceId of ['github:a', 'github:b']) {
    processor.processMessages([
      msg({createSurface: {surfaceId, catalogId: SHELL_CATALOG_ID}}),
      msg({
        updateComponents: {
          surfaceId,
          components: [
            {
              id: 'picker',
              component: 'ChoicePicker',
              label: 'Pick',
              variant: 'mutuallyExclusive',
              value: {path: '/picked'},
              options: [
                {label: 'A', value: 'a'},
                {label: 'B', value: 'b'},
              ],
            },
          ],
        },
      }),
      msg({
        updateComponents: {
          surfaceId,
          components: [{id: 'root', component: 'Column', children: ['picker']}],
        },
      }),
    ]);
  }
  return processor;
}

describe('ChoicePicker radio groups (upstream #2447)', () => {
  it('two surfaces sharing a component id do not join one document-wide radio group', () => {
    const processor = twoPickers();
    const {container} = render(
      <CatalogProvider catalogs={CATALOGS}>
        <div data-testid="a">
          <SurfaceFrame surface={processor.model.surfacesMap.get('github:a')!} />
        </div>
        <div data-testid="b">
          <SurfaceFrame surface={processor.model.surfacesMap.get('github:b')!} />
        </div>
      </CatalogProvider>,
    );

    const namesIn = (testId: string) =>
      new Set(
        within(container.querySelector(`[data-testid="${testId}"]`) as HTMLElement)
          .getAllByRole('radio')
          .map(r => (r as HTMLInputElement).name),
      );

    const a = namesIn('a');
    const b = namesIn('b');
    // Each picker is one group…
    expect(a.size).toBe(1);
    expect(b.size).toBe(1);
    // …and the two are different groups, so selecting in one cannot clear the other.
    expect([...a][0]).not.toBe([...b][0]);
  });
});

describe('unknown-component fallback', () => {
  it('degrades at the node, quietly, leaving the rest of the fragment standing', () => {
    const processor = new MessageProcessor<ReactComponentImplementation>([SHELL_CATALOG]);
    processor.processMessages([
      msg({createSurface: {surfaceId: 'github:mixed', catalogId: SHELL_CATALOG_ID}}),
      msg({
        updateComponents: {
          surfaceId: 'github:mixed',
          components: [
            {id: 'root', component: 'Column', children: ['known', 'alien']},
            {id: 'known', component: 'Text', text: 'Pull requests'},
            {id: 'alien', component: 'HolographicTable'},
          ],
        },
      }),
    ]);

    const {container} = render(
      <CatalogProvider catalogs={CATALOGS}>
        <SurfaceFrame surface={processor.model.surfacesMap.get('github:mixed')!} />
      </CatalogProvider>,
    );

    // The fragment stays up: the known half rendered.
    expect(container.textContent).toContain('Pull requests');

    const placeholder = container.querySelector('[data-a2ui-placeholder="unknown"]');
    expect(placeholder).not.toBeNull();
    expect(placeholder!.getAttribute('data-a2ui-component')).toBe('HolographicTable');
    // Quiet: it names the component on hover rather than shouting it in red.
    expect(placeholder!.textContent).not.toContain('HolographicTable');
    expect((placeholder as HTMLElement).style.color).not.toBe('red');
  });
});
