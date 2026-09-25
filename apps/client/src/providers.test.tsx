import {render} from '@testing-library/react';
import {expect, test} from 'vitest';
import {Providers} from './providers';

test('a button of the shell shows the pointer: the Theme sets Radix’s button cursor', () => {
  const {container} = render(
    <Providers>
      <span>content</span>
    </Providers>,
  );
  const theme = container.querySelector('.radix-themes') as HTMLElement;
  expect(theme.style.getPropertyValue('--cursor-button')).toBe('pointer');
});
