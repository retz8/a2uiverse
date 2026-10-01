import type {ReactElement} from 'react';
import {render, type RenderResult} from '@testing-library/react';
import {CatalogProvider} from '../src/catalogs/CatalogContext';
import {Providers} from '../src/providers';
import {snapshotCatalogs} from './snapshot';

/** Every catalog of the registry snapshot, loaded through the loader (task-11.5 decision 11). */
export const CATALOGS = await snapshotCatalogs();

/** Render inside the shell's providers with every catalog of the snapshot loaded. */
export function renderWithShell(ui: ReactElement): RenderResult {
  return render(
    <Providers>
      <CatalogProvider catalogs={CATALOGS}>{ui}</CatalogProvider>
    </Providers>,
  );
}
