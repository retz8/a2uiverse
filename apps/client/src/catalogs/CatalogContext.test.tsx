/**
 * `SurfaceFrame`'s mark: a loaded build's surface carries its build (task-14.11 decision 39) — the
 * build the surface was drawn in, whichever build of its catalog is held beside it (task 15.6).
 */
import {describe, expect, it} from 'vitest';
import {render} from '@testing-library/react';
import {MessageProcessor, type Catalog} from '@a2ui/web_core/v0_9';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import {basicCatalog, type ReactComponentImplementation} from '@a2ui/react/v0_9';
import {CatalogProvider, SurfaceFrame} from './CatalogContext';
import {resolveCatalog} from './clientCatalogs';

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;

function surface(catalog: Catalog<ReactComponentImplementation> = basicCatalog) {
  const processor = new MessageProcessor<ReactComponentImplementation>([catalog]);
  processor.processMessages([
    msg({createSurface: {surfaceId: 's', catalogId: catalog.id}}),
    msg({
      updateComponents: {
        surfaceId: 's',
        components: [{id: 'root', component: 'Text', text: 'Hello'}],
      },
    }),
  ]);
  return processor.model.surfacesMap.get('s')!;
}

describe('SurfaceFrame', () => {
  it('marks a loaded build’s surface with its build, the root its sheets are scoped to', () => {
    const {container, getByText} = render(
      <CatalogProvider catalogs={[resolveCatalog(basicCatalog, undefined, 'sha256-built')]}>
        <SurfaceFrame surface={surface()} />
      </CatalogProvider>,
    );
    const mark = container.querySelector('[data-catalog-build="sha256-built"]') as HTMLElement;
    expect(mark).toContainElement(getByText('Hello'));
    expect(mark.style.display).toBe('contents');
  });

  it('leaves a catalog the client provides unmarked', () => {
    const {container, getByText} = render(
      <CatalogProvider catalogs={[resolveCatalog(basicCatalog)]}>
        <SurfaceFrame surface={surface()} />
      </CatalogProvider>,
    );
    expect(getByText('Hello')).toBeInTheDocument();
    expect(container.querySelector('[data-catalog-build]')).toBeNull();
  });

  it('frames a surface in the build it was drawn in, whichever build of its catalog is held', () => {
    const first = resolveCatalog(basicCatalog, undefined, 'sha256-first');
    const second = resolveCatalog(basicCatalog, undefined, 'sha256-second');
    const {container, getByText} = render(
      <CatalogProvider catalogs={[second]}>
        <SurfaceFrame surface={surface(first.catalog)} />
      </CatalogProvider>,
    );
    const mark = container.querySelector('[data-catalog-build]') as HTMLElement;
    expect(mark.getAttribute('data-catalog-build')).toBe('sha256-first');
    expect(mark).toContainElement(getByText('Hello'));
  });
});
