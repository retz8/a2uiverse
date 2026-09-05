import {render} from '@testing-library/react';
import {expect, test} from 'vitest';
import {Theme} from '@radix-ui/themes';
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

test('the Provider is a scoped Radix Theme: the wrapper carries the radix-themes class', () => {
  const {container} = render(
    <Provider>
      <span>content</span>
    </Provider>,
  );
  const wrapper = container.querySelector('.a2uiverse-shell-catalog') as HTMLElement;
  expect(wrapper.classList.contains('radix-themes')).toBe(true);
  expect(document.documentElement.classList.contains('radix-themes')).toBe(false);
  expect(document.body.classList.contains('radix-themes')).toBe(false);
});

test('the Provider paints no background of its own over the fragment', () => {
  const {container} = render(
    <Provider>
      <span>content</span>
    </Provider>,
  );
  const wrapper = container.querySelector('.a2uiverse-shell-catalog') as HTMLElement;
  expect(wrapper.dataset.hasBackground).toBe('false');
});

test('the Provider sets the host appearance on its own wrapper, light when there is no host', () => {
  const standalone = render(
    <Provider>
      <span>content</span>
    </Provider>,
  );
  expect(
    (standalone.container.querySelector('.a2uiverse-shell-catalog') as HTMLElement).classList,
  ).toContain('light');
  standalone.unmount();
  const hosted = render(
    <Theme appearance="dark">
      <Provider>
        <span>content</span>
      </Provider>
    </Theme>,
  );
  expect(
    (hosted.container.querySelector('.a2uiverse-shell-catalog') as HTMLElement).classList,
  ).toContain('dark');
});

test('the Provider anchors a portal root inside its wrapper, after the content', () => {
  const {container} = render(
    <Provider>
      <span>content</span>
    </Provider>,
  );
  const wrapper = container.querySelector('.a2uiverse-shell-catalog') as HTMLElement;
  const anchor = wrapper.querySelector('[data-a2uiverse-portal-root]') as HTMLElement;
  expect(anchor).not.toBeNull();
  expect(anchor.previousElementSibling?.textContent).toBe('content');
});
