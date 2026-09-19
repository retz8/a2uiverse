import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {CanvasApp} from './canvas/CanvasApp';
import {createHostRelay} from './canvas/hostRelay';
import {resolveCatalogs} from './catalogs/resolver';
import {agentUrl, listCatalogs} from './orchestratorApi';
import {Providers} from './providers';

// The shell catalog is built here, before the canvas exists; the relay is what the canvas binds.
const hostRelay = createHostRelay();
const catalogs = resolveCatalogs(await listCatalogs(), hostRelay.host);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <CanvasApp serverUrl={agentUrl()} catalogs={catalogs} hostRelay={hostRelay} />
    </Providers>
  </StrictMode>,
);
