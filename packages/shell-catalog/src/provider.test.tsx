import {render} from '@testing-library/react';
import {expect, test} from 'vitest';
import {Theme} from '@radix-ui/themes';
import {Provider} from './provider';

const wrapperOf = (container: HTMLElement) =>
  container.querySelector('.a2uiverse-shell-catalog') as HTMLElement;

test('the wrapper carries no token bindings of its own — Radix Themes is the whole design system', () => {
  const {container} = render(
    <Provider>
      <span>content</span>
    </Provider>,
  );
  const wrapper = wrapperOf(container);
  expect(wrapper).not.toBeNull();
  const custom = [...wrapper.style].filter(name => name.startsWith('--'));
  expect(custom).toEqual([]);
  expect([...document.documentElement.style].filter(name => name.startsWith('--'))).toEqual([]);
});

test('the wrapper stays out of layout', () => {
  const {container} = render(
    <Provider>
      <span>content</span>
    </Provider>,
  );
  expect(wrapperOf(container).style.display).toBe('contents');
});

test('the Provider is a scoped Radix Theme: the wrapper carries the radix-themes class', () => {
  const {container} = render(
    <Provider>
      <span>content</span>
    </Provider>,
  );
  expect(wrapperOf(container).classList.contains('radix-themes')).toBe(true);
  expect(document.documentElement.classList.contains('radix-themes')).toBe(false);
  expect(document.body.classList.contains('radix-themes')).toBe(false);
});

test('the Provider paints no background of its own over the fragment', () => {
  const {container} = render(
    <Provider>
      <span>content</span>
    </Provider>,
  );
  expect(wrapperOf(container).dataset.hasBackground).toBe('false');
});

test('the Provider sets the host appearance on its own wrapper, light when there is no host', () => {
  const standalone = render(
    <Provider>
      <span>content</span>
    </Provider>,
  );
  expect(wrapperOf(standalone.container).classList).toContain('light');
  standalone.unmount();
  const hosted = render(
    <Theme appearance="dark">
      <Provider>
        <span>content</span>
      </Provider>
    </Theme>,
  );
  expect(wrapperOf(hosted.container).classList).toContain('dark');
});

test('with no host the Provider fixes its own accent and gray; under a host it inherits them', () => {
  const standalone = render(
    <Provider>
      <span>content</span>
    </Provider>,
  );
  expect(wrapperOf(standalone.container).dataset.accentColor).toBe('indigo');
  expect(wrapperOf(standalone.container).dataset.grayColor).toBe('slate');
  standalone.unmount();
  const hosted = render(
    <Theme accentColor="tomato" grayColor="sand">
      <Provider>
        <span>content</span>
      </Provider>
    </Theme>,
  );
  expect(wrapperOf(hosted.container).dataset.accentColor).toBe('tomato');
  expect(wrapperOf(hosted.container).dataset.grayColor).toBe('sand');
});

test('the Provider anchors a portal root inside its wrapper, after the content', () => {
  const {container} = render(
    <Provider>
      <span>content</span>
    </Provider>,
  );
  const anchor = wrapperOf(container).querySelector('[data-a2uiverse-portal-root]') as HTMLElement;
  expect(anchor).not.toBeNull();
  expect(anchor.previousElementSibling?.textContent).toBe('content');
});
