import type {ComponentModel} from '@a2ui/web_core/v0_9';
import {useCallback, useSyncExternalStore} from 'react';

/**
 * A component's props as its own model holds them, read again on every update of the model
 * (task-16.6 decision 5). Upstream's binder merges each repaint over the last, keeping a prop the
 * repaint dropped, and a repaint that only drops props hands the component nothing new to render
 * (`_dev/a2ui-findings.md` §9); the model holds exactly what was last painted.
 */
export function useModelProperties<T>(model: ComponentModel): T {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const subscription = model.onUpdated.subscribe(() => onChange());
      return () => subscription.unsubscribe();
    },
    [model],
  );
  return useSyncExternalStore(subscribe, () => model.properties) as T;
}
