import {useEffect, useState} from 'react';
import type {ComponentApi, MessageProcessor} from '@a2ui/web_core/v0_9';

/** The processor's current surfaces, re-read whenever one is created or deleted. */
export function useSurfaces<T extends ComponentApi>(processor: MessageProcessor<T>) {
  const [surfaces, setSurfaces] = useState(() => Array.from(processor.model.surfacesMap.values()));
  useEffect(() => {
    const sync = () => setSurfaces(Array.from(processor.model.surfacesMap.values()));
    // Catch surfaces that arrived between the initial render and the subscription.
    sync();
    const created = processor.onSurfaceCreated(sync);
    const deleted = processor.onSurfaceDeleted(sync);
    return () => {
      created.unsubscribe();
      deleted.unsubscribe();
    };
  }, [processor]);
  return surfaces;
}
