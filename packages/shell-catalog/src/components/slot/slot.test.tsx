import {render, screen} from '@testing-library/react';
import {expect, test} from 'vitest';
import {SlotContentContext} from '../../slot-content';
import {SlotView} from './slot';
import {SlotApi} from './slot.schema';

test('pending renders a placeholder naming the awaited content', () => {
  render(<SlotView name="slot-gmail" label="Gmail" />);
  const slot = screen.getByText(/Gmail…/);
  expect(slot).toBeInTheDocument();
  expect(slot.closest('[data-slot="slot-gmail"]')).toHaveAttribute('data-slot-state', 'pending');
});

test('host-resolved content fills the slot', () => {
  render(
    <SlotContentContext.Provider value={name => (name === 'slot-gmail' ? <em>inbox</em> : null)}>
      <SlotView name="slot-gmail" />
    </SlotContentContext.Provider>,
  );
  expect(screen.getByText('inbox').closest('[data-slot="slot-gmail"]')).toHaveAttribute(
    'data-slot-state',
    'filled',
  );
});

test('failed renders the failure panel even when content exists', () => {
  render(
    <SlotContentContext.Provider value={() => <em>stale</em>}>
      <SlotView name="slot-gmail" state="failed" label="Gmail" />
    </SlotContentContext.Provider>,
  );
  expect(screen.queryByText('stale')).not.toBeInTheDocument();
  expect(screen.getByText(/Gmail didn’t load/)).toBeInTheDocument();
});

test('collapsed renders nothing when the host has nothing to rest it on', () => {
  const {container} = render(
    <SlotContentContext.Provider value={() => null}>
      <SlotView name="slot-gmail" state="collapsed" />
    </SlotContentContext.Provider>,
  );
  expect(container).toBeEmptyDOMElement();
});

test('collapsed rests on host content when there is some', () => {
  // A source that contributed no surface may still have said something. The slot does not
  // decide what that resting state is — it only decides that there may be one — because the
  // alternative is an attribution marker left naming a region that no longer exists.
  render(
    <SlotContentContext.Provider value={() => <em>nothing to add</em>}>
      <SlotView name="slot-gmail" state="collapsed" />
    </SlotContentContext.Provider>,
  );
  expect(screen.getByText('nothing to add').closest('[data-slot="slot-gmail"]')).toHaveAttribute(
    'data-slot-state',
    'collapsed',
  );
});

test('schema accepts the painted shape and rejects extras', () => {
  expect(
    SlotApi.schema.safeParse({name: 'slot-gmail', state: 'pending', label: 'Gmail'}).success,
  ).toBe(true);
  expect(SlotApi.schema.safeParse({name: 'slot-gmail', surfaceId: 'x'}).success).toBe(false);
  expect(SlotApi.schema.safeParse({state: 'pending'}).success).toBe(false);
});
