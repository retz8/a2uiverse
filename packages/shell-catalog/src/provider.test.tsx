import {render} from '@testing-library/react';
import {expect, test} from 'vitest';
import {Provider, SHELL_TOKENS} from './provider';

test('tokens are written on the wrapper element, never the document root', () => {
  const {container} = render(
    <Provider>
      <span>content</span>
    </Provider>,
  );
  const wrapper = container.querySelector('.a2uiverse-shell-catalog') as HTMLElement;
  expect(wrapper).not.toBeNull();
  for (const [token, value] of Object.entries(SHELL_TOKENS)) {
    expect(wrapper.style.getPropertyValue(token)).toBe(value);
    expect(document.documentElement.style.getPropertyValue(token)).toBe('');
  }
});

test('every bound value reads a Radix variable with an explicit fallback', () => {
  for (const value of Object.values(SHELL_TOKENS)) {
    expect(value).toMatch(/^var\(--[a-z0-9-]+, .+\)$/);
  }
});

test('the wrapper stays out of layout', () => {
  const {container} = render(
    <Provider>
      <span>content</span>
    </Provider>,
  );
  const wrapper = container.querySelector('.a2uiverse-shell-catalog') as HTMLElement;
  expect(wrapper.style.display).toBe('contents');
});
