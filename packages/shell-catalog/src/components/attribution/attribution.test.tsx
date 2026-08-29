import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, test} from 'vitest';
import {AttributionView} from './attribution';
import {AttributionApi} from './attribution.schema';

test('at rest shows only the display name, with full detail as the accessible name', () => {
  render(<AttributionView displayName="Gmail" account="work" />);
  const marker = screen.getByLabelText('Painted by Gmail · work');
  expect(marker).toHaveTextContent('Gmail');
  expect(marker).not.toHaveTextContent('Painted by');
});

test('keyboard focus expands to the full detail', async () => {
  const user = userEvent.setup();
  render(<AttributionView displayName="Gmail" account="work" />);
  await user.tab();
  expect(screen.getByLabelText('Painted by Gmail · work')).toHaveTextContent(
    'Painted by Gmail · work',
  );
});

test('single-account apps omit the account clause', () => {
  render(<AttributionView displayName="GitHub" account={null} />);
  expect(screen.getByLabelText('Painted by GitHub')).toBeInTheDocument();
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
