import type {ComponentApi, MessageProcessor, Subscription} from '@a2ui/web_core/v0_9';

/**
 * Writes what each of the processor's surfaces reports through its `onError` to the browser
 * console, from the surface's creation on (task-21.5 decision 5). Where the renderer cannot draw a
 * component it draws nothing, and an unknown component type and a child reference it cannot
 * resolve are reported there alone. A surface's listeners go with it when it is deleted.
 */
export function logSurfaceErrors<T extends ComponentApi>(
  processor: MessageProcessor<T>,
): Subscription {
  return processor.onSurfaceCreated(surface => {
    surface.onError.subscribe(error => console.error('[A2UI:surface]', error));
  });
}
