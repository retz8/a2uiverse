import {render, screen, waitFor} from '@testing-library/react';
import {expect, test} from 'vitest';
import {A2uiSurface, MarkdownContext} from '@a2ui/react/v0_9';
import {Provider} from '../../provider';
import {renderTree, surfaceFor} from '../../testing/render';

test('headings render as Radix Heading on the element the variant names', () => {
  for (const [variant, tag] of [
    ['h1', 'H1'],
    ['h2', 'H2'],
    ['h3', 'H3'],
    ['h4', 'H4'],
    ['h5', 'H5'],
  ] as const) {
    const {container, unmount} = renderTree([
      {id: 'root', component: 'Text', text: 'Title', variant},
    ]);
    const heading = screen.getByRole('heading', {name: 'Title'});
    expect(heading.tagName).toBe(tag);
    expect(heading.className).toMatch(/rt-Heading/);
    expect(container.querySelector('.rt-Text')).toBeNull();
    unmount();
  }
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
});

test('headings and captions never go through the markdown renderer', async () => {
  const {surface} = surfaceFor([
    {id: 'root', component: 'Column', children: ['h', 'c']},
    {id: 'h', component: 'Text', text: '*Title*', variant: 'h2'},
    {id: 'c', component: 'Text', text: '*note*', variant: 'caption'},
  ]);
  const renderer = async () => '<p><em>rendered</em></p>';
  render(
    <MarkdownContext.Provider value={renderer}>
      <Provider>
        <A2uiSurface surface={surface} />
      </Provider>
    </MarkdownContext.Provider>,
  );
  await new Promise(resolve => setTimeout(resolve, 0));
  expect(screen.getByRole('heading')).toHaveTextContent('*Title*');
  expect(screen.getByText('*note*')).toBeInTheDocument();
  expect(screen.queryByText('rendered')).toBeNull();
});
