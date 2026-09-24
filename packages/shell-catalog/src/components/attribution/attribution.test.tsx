import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, test} from 'vitest';
import {AttributionView} from './attribution';
import {AttributionApi} from './attribution.schema';

test('at rest shows only the display name, with full detail as the accessible name', () => {
  render(<AttributionView displayName="Gmail" account="work" />);
  const marker = screen.getByLabelText('Gmail · work');
  expect(marker).toHaveTextContent('Gmail');
  expect(marker).not.toHaveTextContent('Painted by');
});

test('keyboard focus expands to the full detail', async () => {
  const user = userEvent.setup();
  render(<AttributionView displayName="Gmail" account="work" />);
  await user.tab();
  expect(screen.getByLabelText('Gmail · work')).toHaveTextContent('Gmail · work');
});

test('single-account apps omit the account clause', () => {
  render(<AttributionView displayName="GitHub" account={null} />);
  expect(screen.getByLabelText('GitHub')).toBeInTheDocument();
});

test('schema accepts the painted shape and rejects extras', () => {
  expect(
    AttributionApi.schema.safeParse({displayName: 'Gmail', appId: 'gmail', account: null}).success,
  ).toBe(true);
  expect(AttributionApi.schema.safeParse({displayName: 'Gmail', style: 'loud'}).success).toBe(
    false,
  );
  expect(AttributionApi.schema.safeParse({appId: 'gmail'}).success).toBe(false);
});

test('schema accepts the wrapper shape: a child id and a weight (task-6.4 decision 3)', () => {
  expect(
    AttributionApi.schema.safeParse({
      displayName: 'Gmail',
      appId: 'gmail',
      child: 'gmail-slot',
      weight: 2,
    }).success,
  ).toBe(true);
  expect(AttributionApi.schema.safeParse({displayName: 'Gmail', child: 3}).success).toBe(false);
});

test('wraps its child under the marker and carries the weight as its own flex share', () => {
  const {container} = render(
    <AttributionView displayName="Gmail" weight={2}>
      <div data-child="gmail-slot">the slot</div>
    </AttributionView>,
  );
  const wrapper = container.querySelector('[data-attribution]') as HTMLElement;
  expect(wrapper.style.flex).toBe('2 1 0%');
  const marker = screen.getByLabelText('Gmail');
  const child = container.querySelector('[data-child="gmail-slot"]')!;
  expect(wrapper.contains(marker)).toBe(true);
  expect(wrapper.contains(child)).toBe(true);
  // The marker comes first: provenance reads before the content it names.
  expect(marker.compareDocumentPosition(child) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('an unweighted wrapper takes one share: unweighted regions split their axis equally (task-6.4 decision 2)', () => {
  const {container} = render(
    <AttributionView displayName="Gmail">
      <div>the slot</div>
    </AttributionView>,
  );
  const wrapper = container.querySelector('[data-attribution]') as HTMLElement;
  expect(wrapper.style.flex).toBe('1 1 0%');
});

test('without a child it is the bare marker, no wrapper box', () => {
  const {container} = render(<AttributionView displayName="Gmail" />);
  expect(container.querySelector('[data-attribution]')).toBeNull();
  expect(screen.getByLabelText('Gmail')).toBeInTheDocument();
});
