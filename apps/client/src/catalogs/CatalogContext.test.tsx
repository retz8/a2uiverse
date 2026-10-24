/**
 * `SurfaceFrame`'s mark: a loaded build's surface carries its build (task-14.11 decision 39) — the
 * build the surface was drawn in, whichever build of its catalog is held beside it (task 15.6).
 */
import {describe, expect, it} from 'vitest';
import {render, waitFor} from '@testing-library/react';
import {Catalog, MessageProcessor} from '@a2ui/web_core/v0_9';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import {basicCatalog} from '@a2ui/web_core/v0_9/basic_catalog';
import type {ReactCatalogComponent} from '@a2ui/react/v0_9';
import {CatalogProvider, SurfaceFrame} from './CatalogContext';
import {resolveCatalog} from './clientCatalogs';

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;

/** A build of the basic catalog: a catalog object of its own, as each artifact's module holds. */
const buildOf = (artifact: string) =>
  resolveCatalog(
    new Catalog<ReactCatalogComponent>(
      basicCatalog.id,
      basicCatalog.protocolVersion,
      [...basicCatalog.components.values()],
      [...basicCatalog.functions.values()],
    ),
    undefined,
    artifact,
  );

function surface(catalog: Catalog<ReactCatalogComponent> = basicCatalog, text = 'Hello') {
  const processor = new MessageProcessor<ReactCatalogComponent>([catalog]);
  processor.processMessages([
    msg({createSurface: {surfaceId: 's', catalogId: catalog.id}}),
    msg({
      updateComponents: {
        surfaceId: 's',
        components: [{id: 'root', component: 'Text', text}],
      },
    }),
  ]);
  return processor.model.surfacesMap.get('s')!;
}

describe('SurfaceFrame', () => {
  it('marks a loaded build’s surface with its build, the root its sheets are scoped to', async () => {
    const built = buildOf('sha256-built');
    const {container} = render(
      <CatalogProvider catalogs={[built]}>
        <SurfaceFrame surface={surface(built.catalog)} />
      </CatalogProvider>,
    );
    const mark = container.querySelector('[data-catalog-build="sha256-built"]') as HTMLElement;
    await waitFor(() => expect(mark).toHaveTextContent('Hello'));
    expect(mark.style.display).toBe('contents');
  });

  it('leaves a catalog the client provides unmarked', async () => {
    const {container} = render(
      <CatalogProvider catalogs={[resolveCatalog(basicCatalog)]}>
        <SurfaceFrame surface={surface()} />
      </CatalogProvider>,
    );
    await waitFor(() => expect(container).toHaveTextContent('Hello'));
    expect(container.querySelector('[data-catalog-build]')).toBeNull();
  });

  it('frames a surface in the build it was drawn in, whichever build of its catalog is held', async () => {
    const first = buildOf('sha256-first');
    const second = buildOf('sha256-second');
    const {container} = render(
      <CatalogProvider catalogs={[second]}>
        <SurfaceFrame surface={surface(first.catalog)} />
      </CatalogProvider>,
    );
    const mark = container.querySelector('[data-catalog-build]') as HTMLElement;
    expect(mark.getAttribute('data-catalog-build')).toBe('sha256-first');
    await waitFor(() => expect(mark).toHaveTextContent('Hello'));
  });

  it('draws a body text’s Markdown, a link as its text', async () => {
    const {findByText, container} = render(
      <CatalogProvider catalogs={[resolveCatalog(basicCatalog)]}>
        <SurfaceFrame
          surface={surface(basicCatalog, '**Free** shipping, [see the shop](https://shop.example)')}
        />
      </CatalogProvider>,
    );
    expect((await findByText('Free')).tagName).toBe('STRONG');
    expect(await findByText(/see the shop/)).toBeInTheDocument();
    expect(container.querySelector('a')).toBeNull();
  });
});
