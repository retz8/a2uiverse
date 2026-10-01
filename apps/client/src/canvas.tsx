import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {CanvasApp} from './canvas/CanvasApp';
import {createHostRelay} from './canvas/hostRelay';
import {clientCatalogs} from './catalogs/clientCatalogs';
import {registerHost} from './catalogs/host';
import {createCatalogLoader} from './catalogs/loader';
import {agentUrl, registryUrl} from './orchestratorApi';
import {Providers} from './providers';

// The host-module interface first: every artifact reads it as its entry evaluates.
registerHost();
// The shell catalog is built here, before the canvas exists; the relay is what the canvas binds.
const hostRelay = createHostRelay();
const catalogs = createCatalogLoader({
  registry: registryUrl(),
  defaults: clientCatalogs(hostRelay.host),
});
// The preload runs beside the first render, never ahead of it (task-11.5 decision 1).
void catalogs.preload();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <CanvasApp serverUrl={agentUrl()} catalogs={catalogs} hostRelay={hostRelay} />
    </Providers>
  </StrictMode>,
);
