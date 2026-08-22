import {render, screen} from '@testing-library/react';
import {expect, test} from 'vitest';
import {App} from '../src/App';

test('renders the placeholder', () => {
  render(<App />);
  expect(screen.getByText(/scaffold only/)).toBeInTheDocument();
});
