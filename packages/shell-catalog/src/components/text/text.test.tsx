import {render, screen, waitFor} from '@testing-library/react';
import {expect, test} from 'vitest';
import {A2uiSurface, MarkdownContext} from '@a2ui/react';
import {Provider} from '../../provider';
import {renderTree, surfaceFor} from '../../testing/render';

const LEVELS = [
  {markers: '#', tag: 'H1', size: 'rt-r-size-7'},
  {markers: '##', tag: 'H2', size: 'rt-r-size-6'},
  {markers: '###', tag: 'H3', size: 'rt-r-size-5'},
  {markers: '####', tag: 'H4', size: 'rt-r-size-4'},
] as const;

/** A tree of one text, drawn under a host markdown renderer that marks what it renders. */
function underRenderer(text: string, variant?: string) {
  const {surface} = surfaceFor([{id: 'root', component: 'Text', text, ...(variant && {variant})}]);
  const renderer = async () => '<p><em>rendered</em></p>';
  return render(
    <MarkdownContext.Provider value={renderer}>
      <Provider>
        <A2uiSurface surface={surface} />
      </Provider>
    </MarkdownContext.Provider>,
  );
}

test('a one-line text of one to four markers is Radix Heading on the element and at the size the level names, its words plain (task-21.12 decision 4)', () => {
  for (const {markers, tag, size} of LEVELS) {
    for (const variant of [undefined, 'body'] as const) {
      const {container, unmount} = renderTree([
        {id: 'root', component: 'Text', text: `${markers} Title`, ...(variant && {variant})},
      ]);
      const heading = screen.getByRole('heading', {name: 'Title'});
      expect(heading.tagName).toBe(tag);
      expect(heading.className).toMatch(/rt-Heading/);
      expect(heading).toHaveClass(size);
      expect(heading.textContent).toBe('Title');
      expect(container.querySelector('.rt-Text')).toBeNull();
      unmount();
    }
  }
});

test("five markers are the merged view's label: a heading drawn at 13px semibold in the second ink (task 7.16)", () => {
  renderTree([{id: 'root', component: 'Text', text: '##### Active work status'}]);
  const label = screen.getByRole('heading', {name: 'Active work status'});
  expect(label.tagName).toBe('H5');
  expect(label).toHaveStyle({fontSize: '13px', lineHeight: '20px', fontWeight: '600'});
  expect(label.style.color).toBe('var(--a2v-ink-2, var(--gray-12))');
  expect(label.title).toBe('Active work status');
});

test('a heading line is drawn in the first frame under a markdown renderer too, never through it', async () => {
  for (const {markers, tag} of [...LEVELS, {markers: '#####', tag: 'H5'}]) {
    const {unmount} = underRenderer(`${markers} *Title*`);
    // Synchronously, before any renderer could answer.
    const heading = screen.getByRole('heading', {name: '*Title*'});
    expect(heading.tagName).toBe(tag);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(screen.getByRole('heading', {name: '*Title*'})).toBe(heading);
    expect(screen.queryByText('rendered')).toBeNull();
    unmount();
  }
});

test('anything but one heading line is body text: no space, six markers, a second line (task-21.12 decision 5)', () => {
  for (const text of [
    '#Title',
    '###### Title',
    '# ',
    '# Title\nA second line',
    'Title # not one',
  ]) {
    const {container, unmount} = renderTree([{id: 'root', component: 'Text', text}]);
    expect(screen.queryByRole('heading')).toBeNull();
    expect(container.querySelector('.rt-Text')?.tagName).toBe('DIV');
    unmount();
  }
});

test('a heading inside a longer text goes through the host markdown renderer (task-21.12 decision 5)', async () => {
  underRenderer('## Title\nA paragraph under it.');
  await waitFor(() => expect(screen.getByText('rendered').tagName).toBe('EM'));
  expect(screen.queryByRole('heading')).toBeNull();
});

test('a caption is drawn literally, whatever it starts with (task-21.12 decision 5)', async () => {
  underRenderer('### not a heading', 'caption');
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(screen.getByText('### not a heading').tagName).toBe('SPAN');
  expect(screen.queryByRole('heading')).toBeNull();
  expect(screen.queryByText('rendered')).toBeNull();
});

test('a caption is inline Radix Text in gray; body is a Radix Text block', () => {
  const caption = renderTree([{id: 'root', component: 'Text', text: 'note', variant: 'caption'}]);
  const captionEl = screen.getByText('note');
  expect(captionEl.tagName).toBe('SPAN');
  expect(captionEl.className).toMatch(/rt-Text/);
  expect(captionEl.getAttribute('data-accent-color')).toBe('gray');
  caption.unmount();
  renderTree([{id: 'root', component: 'Text', text: 'para'}]);
  const body = screen.getByText('para');
  expect(body.tagName).toBe('DIV');
  expect(body.className).toMatch(/rt-Text/);
});

test('body text is plain when no host installs a markdown renderer, and no warning is logged', () => {
  renderTree([{id: 'root', component: 'Text', text: 'plain *text*'}]);
  expect(screen.getByText('plain *text*')).toBeInTheDocument();
  expect(screen.queryByRole('emphasis')).toBeNull();
});

test('body text renders through the host markdown renderer when one is installed (decision 4)', async () => {
  const {surface} = surfaceFor([{id: 'root', component: 'Text', text: 'plain *text*'}]);
  const renderer = async (markdown: string) =>
    `<p>${markdown.replace(/\*(.+)\*/, '<em>$1</em>')}</p>`;
  render(
    <MarkdownContext.Provider value={renderer}>
      <Provider>
        <A2uiSurface surface={surface} />
      </Provider>
    </MarkdownContext.Provider>,
  );
  await waitFor(() => expect(screen.getByText('text').tagName).toBe('EM'));
  expect(screen.getByText('text').closest('.rt-Text')).toHaveClass('a2uiverse-shell-markdown');
});
