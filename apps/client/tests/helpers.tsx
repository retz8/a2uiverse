import type {ReactElement} from 'react';
import {render, type RenderResult} from '@testing-library/react';
import {CatalogProvider} from '../src/catalogs/CatalogContext';
import {resolveCatalogs} from '../src/catalogs/resolver';
import {listCatalogs} from '../src/orchestratorApi';
import {Providers} from '../src/providers';

/** The Phase 1 catalog set, as the entry resolves it. */
export const CATALOGS = resolveCatalogs(await listCatalogs());

/** Render inside the shell's providers with every installed catalog resolved. */
export function renderWithShell(ui: ReactElement): RenderResult {
  return render(
    <Providers>
      <CatalogProvider catalogs={CATALOGS}>{ui}</CatalogProvider>
    </Providers>,
  );
}
