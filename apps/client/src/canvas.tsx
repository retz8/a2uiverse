import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {CanvasApp} from './canvas/CanvasApp';
import {resolveCatalogs} from './catalogs/resolver';
import {agentUrl, listCatalogs} from './orchestratorApi';
import {Providers} from './providers';

const catalogs = resolveCatalogs(await listCatalogs());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <CanvasApp serverUrl={agentUrl()} catalogs={catalogs} />
    </Providers>
  </StrictMode>,
);
