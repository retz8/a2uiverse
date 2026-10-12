/**
 * An app's sample in the Store (phase-14 decision 3, task-14.2 decision 6): its captured preview —
 * the paint the Store or the publisher captured at publish — rendered live in the app's own look,
 * inside a labelled frame headed by the question it answered, a quiet line saying who made it and
 * when.
 *
 * The sample is drawn apart from every canvas (task-14.7 decision 1): a renderer of its own over
 * the client's own catalogs and the builds the listing names, each loaded from the marketplace's
 * artifacts through the orchestrator by its artifact id — so a canvas never meets a build it did not
 * load, and a build the registry already holds is loaded once for both. It is a picture of an
 * answer (decision 5): nothing in it takes focus or a press.
 */
import {useEffect, useMemo, useState} from 'react';
import {Button} from '@radix-ui/themes';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import {BASIC_CATALOG_ID, type PreviewDocument} from '@a2uiverse/sdk';
import {CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog/id';
import {applyA2uiMessages} from '../../../a2ui/applyMessages';
import {
  CatalogProvider,
  isLoader,
  SurfaceFrame,
  type PageCatalogs,
} from '../../../catalogs/CatalogContext';
import type {ResolvedCatalog} from '../../../catalogs/clientCatalogs';
import {marketplaceUrl, readStorePreview, type StoreListing} from '../../../orchestratorApi';
import {SurfaceErrorBoundary} from '../../../shared/SurfaceErrorBoundary';
import {sampleCaption} from '../appCard';

type Sample =
  | {status: 'loading'}
  | {status: 'failed'}
  | {
      status: 'ready';
      preview: PreviewDocument;
      catalogs: readonly ResolvedCatalog[];
      processor: MessageProcessor<ReactComponentImplementation>;
    };

/** The client's own catalogs, as the page holds them: what every sample may paint in beside its builds. */
function ownCatalogs(catalogs: PageCatalogs): ResolvedCatalog[] {
  const held = isLoader(catalogs) ? [...catalogs.resolved().values()] : catalogs;
  return held.filter(c => c.id === BASIC_CATALOG_ID || c.id === SHELL_CATALOG_ID);
}

/** The builds the listing names, each by its artifact id; a fixed set has only what it holds. */
async function buildsOf(
  listing: StoreListing,
  catalogs: PageCatalogs,
  orchestrator: string,
): Promise<ResolvedCatalog[]> {
  const named = Object.entries(listing.entry.catalogs);
  if (isLoader(catalogs)) {
    const from = marketplaceUrl(orchestrator);
    return Promise.all(
      named.map(([catalogId, artifactId]) => catalogs.loadBuild(catalogId, artifactId, from)),
    );
  }
  return named.map(([catalogId]) => {
    const held = catalogs.find(c => c.id === catalogId);
    if (!held) throw new Error(`the client holds no catalog ${catalogId}`);
    return held;
  });
}

function useSample(listing: StoreListing, catalogs: PageCatalogs, orchestrator: string) {
  const [attempt, setAttempt] = useState(0);
  const appId = listing.entry.appId;
  const builds = JSON.stringify(listing.entry.catalogs);
  // A sample is the app's and its builds'; a listing read again naming the same builds is the same.
  const key = `${orchestrator}|${appId}|${builds}|${attempt}`;
  const [sample, setSample] = useState<{key: string; value: Sample}>({
    key: '',
    value: {status: 'loading'},
  });
  useEffect(() => {
    let current = true;
    void (async () => {
      let value: Sample;
      try {
        const [read, loaded] = await Promise.all([
          readStorePreview(orchestrator, appId),
          buildsOf(listing, catalogs, orchestrator),
        ]);
        if (!read.ok) throw new Error(`the preview could not be read: ${read.reason}`);
        const held = [...ownCatalogs(catalogs), ...loaded];
        const processor = new MessageProcessor(held.map(c => c.catalog));
        let failed = false;
        applyA2uiMessages(processor, read.value.messages as unknown as A2uiMessage[], {
          onMessageError: () => (failed = true),
        });
        if (failed || processor.model.surfacesMap.size === 0) throw new Error('nothing to draw');
        value = {status: 'ready', preview: read.value, catalogs: held, processor};
      } catch (err) {
        console.warn(`[A2UI:store] the sample of ${appId} could not be shown`, err);
        value = {status: 'failed'};
      }
      if (current) setSample({key, value});
    })();
    return () => {
      current = false;
    };
    // `key` names the app, its builds and the attempt; the listing object itself may be new.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, catalogs]);
  const value: Sample = sample.key === key ? sample.value : {status: 'loading'};
  return {sample: value, retry: () => setAttempt(n => n + 1)};
}

export interface SampleFrameProps {
  listing: StoreListing;
  catalogs: PageCatalogs;
  orchestrator: string;
}

export function SampleFrame({listing, catalogs, orchestrator}: SampleFrameProps) {
  const {sample, retry} = useSample(listing, catalogs, orchestrator);
  const name = listing.entry.card.name;
  const surfaces = useMemo(
    () => (sample.status === 'ready' ? [...sample.processor.model.surfacesMap.values()] : []),
    [sample],
  );
  return (
    <figure
      className="store-sample"
      aria-label={`Sample answer from ${name}`}
      data-testid="store-sample"
      data-status={sample.status}
    >
      <div className="store-sample__head">
        <span className="store-sample__kicker">Sample answer</span>
        {sample.status === 'ready' && (
          <span className="store-sample__question">“{sample.preview.words}”</span>
        )}
      </div>
      <div className="store-sample__body">
        {sample.status === 'loading' && (
          <div className="store-skeleton" aria-hidden="true">
            <span className="store-sk" style={{width: '40%'}} />
            <span className="store-sk" />
            <span className="store-sk" style={{width: '85%'}} />
            <span className="store-sk" style={{width: '70%'}} />
          </div>
        )}
        {sample.status === 'failed' && (
          <div className="store-sample__failed">
            <p>This sample couldn’t be shown.</p>
            <Button size="1" variant="soft" color="gray" onClick={retry}>
              Try again
            </Button>
          </div>
        )}
        {sample.status === 'ready' && (
          // A picture of an answer (task-14.7 decision 5): nothing in it takes focus or a press.
          <div className="store-sample__paint" inert>
            <CatalogProvider catalogs={sample.catalogs}>
              {surfaces.map(surface => (
                <SurfaceErrorBoundary key={surface.id} surfaceId={surface.id}>
                  <SurfaceFrame surface={surface} />
                </SurfaceErrorBoundary>
              ))}
            </CatalogProvider>
          </div>
        )}
      </div>
      {sample.status === 'ready' && (
        <figcaption className="store-sample__foot">
          {sampleCaption(sample.preview, name)}
        </figcaption>
      )}
    </figure>
  );
}
