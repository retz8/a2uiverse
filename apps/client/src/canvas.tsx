import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {CanvasApp} from './canvas/CanvasApp';
import {createShellActionRelay} from './canvas/shellActionRelay';
import {resolveCatalogs} from './catalogs/resolver';
import {agentUrl, listCatalogs} from './orchestratorApi';
import {Providers} from './providers';

// The shell catalog is built here, before the canvas exists; the relay is what the canvas binds.
const shellActions = createShellActionRelay();
const catalogs = resolveCatalogs(await listCatalogs(), {onShellAction: shellActions.handler});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <CanvasApp serverUrl={agentUrl()} catalogs={catalogs} shellActions={shellActions} />
    </Providers>
  </StrictMode>,
);
