/**
 * The question as the canvas's header: display size on one line, a fixed four-line box past it,
 * "Show all" past four lines opening the whole question over the page, and the header as the way
 * back into the palette.
 */
import {afterEach, describe, it, expect, vi} from 'vitest';
import {fireEvent, screen} from '@testing-library/react';
import {renderWithShell} from '../../../tests/helpers';
import {QuestionHeader} from './QuestionHeader';

const SHORT = {
  text: "what's the status of what I'm working on?",
  askedAt: Date.UTC(2026, 8, 21, 9, 41),
};
const PARAGRAPH = {
  text: "I'm wrapping up Phase 7 before Friday's demo. A few of my Linear issues already have pull requests open, and I think a CI run failed over the weekend, but I've lost track of which is which. I also want to know whether any of those pull requests is still waiting on a review, and whether the issue about the shell-action report hanging through the tunnel ever got a branch pushed. What's the status of what I'm working on, and is anything blocked?",
  askedAt: Date.UTC(2026, 8, 21, 9, 41),
};

/**
 * jsdom lays nothing out: stand in for the browser's measure. At display size the question is
 * `displayHeight` tall; at body size, `longLines` lines of 28px inside the header's 4px padding.
 */
function layOut({displayHeight, longLines}: {displayHeight: number; longLines: number}) {
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    if (this.dataset.testid !== 'canvas-question') return 0;
    return this.dataset.register === 'long' ? longLines * 28 + 8 : displayHeight;
  });
}

afterEach(() => vi.restoreAllMocks());

describe('QuestionHeader', () => {
  it('a question that fits one line is set at display size, verbatim, with nothing to show', () => {
    layOut({displayHeight: 44, longLines: 1});
    renderWithShell(<QuestionHeader question={SHORT} onEdit={() => {}} />);
    const header = screen.getByTestId('canvas-question');
    expect(header).toHaveTextContent(SHORT.text);
    expect(header).toHaveAttribute('data-register', 'display');
    expect(screen.queryByRole('button', {name: /Show the whole question/})).toBeNull();
  });

  it('a paragraph within four lines is set at body size, whole, with nothing to show', () => {
    layOut({displayHeight: 180, longLines: 4});
    renderWithShell(<QuestionHeader question={PARAGRAPH} onEdit={() => {}} />);
    expect(screen.getByTestId('canvas-question')).toHaveAttribute('data-register', 'long');
    expect(screen.queryByRole('button', {name: /Show the whole question/})).toBeNull();
  });

  it('past four lines the header is clipped and "Show all" says how much is hidden', () => {
    layOut({displayHeight: 260, longLines: 6});
    renderWithShell(<QuestionHeader question={PARAGRAPH} onEdit={() => {}} />);
    expect(screen.getByTestId('canvas-question')).toHaveClass('canvas-question--clipped');
    const showAll = screen.getByRole('button', {name: 'Show the whole question, 2 more lines'});
    expect(showAll).toHaveTextContent('Show all+2 lines');
  });

  it('"Show all" opens the whole question over the page; Esc and the close control close it', () => {
    layOut({displayHeight: 260, longLines: 6});
    renderWithShell(<QuestionHeader question={PARAGRAPH} onEdit={() => {}} />);
    fireEvent.click(screen.getByRole('button', {name: /Show the whole question/}));
    const overlay = screen.getByRole('dialog', {name: 'Your question'});
    expect(overlay).toHaveTextContent(
      "What's the status of what I'm working on, and is anything blocked?",
    );
    expect(overlay).toHaveTextContent(/Asked at/);

    fireEvent.keyDown(window, {key: 'Escape'});
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(screen.getByRole('button', {name: /Show the whole question/}));
    fireEvent.click(screen.getByRole('button', {name: 'Close (Esc)'}));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('the header, and "Edit and ask again", open the palette holding the question', () => {
    layOut({displayHeight: 260, longLines: 6});
    const onEdit = vi.fn();
    renderWithShell(<QuestionHeader question={PARAGRAPH} onEdit={onEdit} />);
    fireEvent.click(screen.getByTestId('canvas-question'));
    expect(onEdit).toHaveBeenLastCalledWith(PARAGRAPH.text);

    fireEvent.click(screen.getByRole('button', {name: /Show the whole question/}));
    fireEvent.click(screen.getByRole('button', {name: 'Edit and ask again'}));
    expect(onEdit).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
