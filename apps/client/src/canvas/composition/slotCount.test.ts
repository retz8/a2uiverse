/**
 * Adaptive weight's input: how many slots the plan laid out. It must not change as fragments
 * arrive, or a composition would visibly re-weight itself mid-turn.
 */
import {describe, it, expect} from 'vitest';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import type {ReactComponentImplementation} from '@a2ui/react/v0_9';
import {CATALOG as SHELL_CATALOG, CATALOG_ID as SHELL_CATALOG_ID} from '@a2uiverse/shell-catalog';
import {slotCountOf} from './slotCount';

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;

function shell(slots: string[]) {
  const processor = new MessageProcessor<ReactComponentImplementation>([SHELL_CATALOG]);
  processor.processMessages([
    msg({createSurface: {surfaceId: 'shell:main', catalogId: SHELL_CATALOG_ID}}),
    msg({
      updateComponents: {
        surfaceId: 'shell:main',
        components: [
          {id: 'root', component: 'Column', children: slots},
          ...slots.map(name => ({id: name, component: 'Slot', name, state: 'pending'})),
        ],
      },
    }),
  ]);
  return processor.model.surfacesMap.get('shell:main')!;
}

describe('slotCountOf', () => {
  it('counts the slots a shell surface lays out', () => {
    expect(slotCountOf(shell(['slot-github']))).toBe(1);
    expect(slotCountOf(shell(['slot-github', 'slot-gmail', 'slot-calendar']))).toBe(3);
  });

  it('is zero for an uncomposed paint and for no surface at all', () => {
    const processor = new MessageProcessor<ReactComponentImplementation>([SHELL_CATALOG]);
    processor.processMessages([
      msg({createSurface: {surfaceId: 'plain', catalogId: SHELL_CATALOG_ID}}),
      msg({
        updateComponents: {
          surfaceId: 'plain',
          components: [{id: 'root', component: 'Text', text: 'hello'}],
        },
      }),
    ]);
    expect(slotCountOf(processor.model.surfacesMap.get('plain')!)).toBe(0);
    expect(slotCountOf(undefined)).toBe(0);
  });

  it('does not change as a slot fills — weight is set by the plan, not by arrivals', () => {
    // A filled slot is still a Slot component in the shell tree; only its content changed.
    const surface = shell(['slot-github', 'slot-gmail']);
    expect(slotCountOf(surface)).toBe(2);
  });
});
