import {render, screen} from '@testing-library/react';
import {expect, test} from 'vitest';
import {SlotContentContext} from '../../slot-content';
import {SlotView} from './slot';
import {SlotApi} from './slot.schema';

test('pending renders a placeholder naming the awaited content', () => {
  render(<SlotView source="gmail" label="Gmail" />);
  const slot = screen.getByText(/Gmail…/);
  expect(slot).toBeInTheDocument();
  expect(slot.closest('[data-slot="gmail"]')).toHaveAttribute('data-slot-state', 'pending');
});

test('host-resolved content fills the slot', () => {
  render(
    <SlotContentContext.Provider value={source => (source === 'gmail' ? <em>inbox</em> : null)}>
      <SlotView source="gmail" />
    </SlotContentContext.Provider>,
  );
  expect(screen.getByText('inbox').closest('[data-slot="gmail"]')).toHaveAttribute(
    'data-slot-state',
    'filled',
  );
});

test('failed renders the failure panel even when content exists', () => {
  render(
    <SlotContentContext.Provider value={() => <em>stale</em>}>
      <SlotView source="gmail" state="failed" label="Gmail" />
    </SlotContentContext.Provider>,
  );
  expect(screen.queryByText('stale')).not.toBeInTheDocument();
  expect(screen.getByText(/Gmail didn’t load/)).toBeInTheDocument();
});

test('collapsed renders nothing when the host has nothing to rest it on', () => {
  const {container} = render(
    <SlotContentContext.Provider value={() => null}>
      <SlotView source="gmail" state="collapsed" />
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
      <SlotView source="gmail" state="collapsed" />
    </SlotContentContext.Provider>,
  );
  expect(screen.getByText('nothing to add').closest('[data-slot="gmail"]')).toHaveAttribute(
    'data-slot-state',
    'collapsed',
  );
});

test('schema accepts the painted shape and rejects extras', () => {
  expect(
    SlotApi.schema.safeParse({source: 'gmail', state: 'pending', label: 'Gmail'}).success,
  ).toBe(true);
  expect(SlotApi.schema.safeParse({source: 'gmail', surfaceId: 'x'}).success).toBe(false);
  expect(SlotApi.schema.safeParse({state: 'pending'}).success).toBe(false);
  expect(SlotApi.schema.safeParse({name: 'slot-gmail'}).success).toBe(false);
});

test('shell content pending is one quiet line beside a spinner, no tile and no label', () => {
  const {container} = render(<SlotView source="shell" label="Synthesis" content="shell" />);
  const slot = container.querySelector('[data-slot="shell"]')!;
  expect(slot).toHaveAttribute('data-slot-state', 'pending');
  expect(slot).toHaveAttribute('data-slot-content', 'shell');
  expect(slot.textContent).toBe('Painting…');
  expect(slot.textContent).not.toContain('Synthesis');
  expect((slot as HTMLElement).style.border).toBe('');
  expect((slot as HTMLElement).style.minHeight).toBe('');
});

test('shell content failed is a quiet line in the same register', () => {
  render(
    <SlotContentContext.Provider value={() => <em>stale</em>}>
      <SlotView source="shell" state="failed" content="shell" />
    </SlotContentContext.Provider>,
  );
  expect(screen.queryByText('stale')).not.toBeInTheDocument();
  expect(screen.getByText('Couldn’t paint this.')).toBeInTheDocument();
});

test('shell content fills with no reserved floor', () => {
  const {container} = render(
    <SlotContentContext.Provider value={() => <em>the view</em>}>
      <SlotView source="shell" content="shell" />
    </SlotContentContext.Provider>,
  );
  const slot = container.querySelector('[data-slot="shell"]') as HTMLElement;
  expect(slot).toHaveAttribute('data-slot-state', 'filled');
  expect(slot).toHaveAttribute('data-slot-content', 'shell');
  expect(slot.style.minHeight).toBe('');
});

test('schema accepts content and refuses other values', () => {
  expect(SlotApi.schema.safeParse({source: 'shell', content: 'shell'}).success).toBe(true);
  expect(SlotApi.schema.safeParse({source: 'shell', content: 'vendor'}).success).toBe(false);
});

test('schema holds exactly one of source or gap, and a numeric weight', () => {
  expect(SlotApi.schema.safeParse({gap: 'flight booking'}).success).toBe(true);
  expect(SlotApi.schema.safeParse({source: 'gmail', gap: 'flight booking'}).success).toBe(false);
  expect(SlotApi.schema.safeParse({}).success).toBe(false);
  expect(SlotApi.schema.safeParse({source: 'gmail', weight: 2}).success).toBe(true);
  expect(SlotApi.schema.safeParse({source: 'gmail', weight: 'wide'}).success).toBe(false);
  expect(SlotApi.schema.safeParse({gap: 'x', state: 'gap'}).success).toBe(false);
});

test('weight is the region’s flex share, as the basic layout components apply it', () => {
  const {container} = render(<SlotView source="gmail" label="Gmail" weight={2} />);
  expect((container.querySelector('[data-slot="gmail"]') as HTMLElement).style.flexGrow).toBe('2');
});

test('a gap slot is the capability tile, resolving no content', () => {
  const {container} = render(
    <SlotContentContext.Provider value={() => <em>content</em>}>
      <SlotView gap="flight booking" />
    </SlotContentContext.Provider>,
  );
  const tile = container.querySelector('[data-slot-gap="flight booking"]')!;
  expect(tile).toHaveAttribute('data-slot-state', 'gap');
  expect(screen.queryByText('content')).not.toBeInTheDocument();
});
