/**
 * The pressed fragment holds its place while its step runs (task-9.9 decision 19): a change above
 * it is absorbed by scrolling until the step ends or the reader scrolls. jsdom has no layout, so
 * the row's position and the scroller's offset are stubbed.
 */
import {act, render} from '@testing-library/react';
import {useRef} from 'react';
import {describe, expect, it} from 'vitest';
import {useStepHold} from './useStepHold';

function Page({stepping}: {stepping: boolean}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useStepHold(scrollRef, stepping);
  return (
    <div data-testid="scroller" ref={scrollRef}>
      <div data-testid="merged" />
      <div data-attribution="Google Calendar" data-testid="row">
        <button type="button" data-way="back" aria-label="Back" />
      </div>
      <button type="button" data-testid="elsewhere" />
    </div>
  );
}

/** The row sits at `top` on screen; the scroller's offset is a plain number. */
function stub(container: HTMLElement) {
  const scroller = container.querySelector<HTMLElement>('[data-testid="scroller"]')!;
  const row = container.querySelector<HTMLElement>('[data-testid="row"]')!;
  const layout = {top: 400, scrollTop: 600};
  Object.defineProperty(scroller, 'scrollTop', {
    get: () => layout.scrollTop,
    set: (value: number) => {
      // Scrolling moves the row the other way.
      layout.top -= value - layout.scrollTop;
      layout.scrollTop = value;
    },
  });
  row.getBoundingClientRect = () => ({top: layout.top}) as DOMRect;
  const grow = async (by: number) => {
    // Something above the row changes size: the row moves by as much.
    layout.top += by;
    container.querySelector('[data-testid="merged"]')!.textContent = `${by}`;
    await act(async () => {});
  };
  return {layout, grow, scroller};
}

describe('the pressed fragment holds its place (task-9.9 decision 19)', () => {
  it('a change above the pressed row is absorbed by scrolling while the step runs', async () => {
    const {container, rerender, getByLabelText} = render(<Page stepping={false} />);
    const {layout, grow} = stub(container);
    getByLabelText('Back').click();
    rerender(<Page stepping />);
    await grow(-280);
    expect(layout.top).toBe(400);
    expect(layout.scrollTop).toBe(320);
    await grow(32);
    expect(layout.top).toBe(400);
  });

  it('lets go when the step ends: later changes move the page as they would', async () => {
    const {container, rerender, getByLabelText} = render(<Page stepping={false} />);
    const {layout, grow} = stub(container);
    getByLabelText('Back').click();
    rerender(<Page stepping />);
    rerender(<Page stepping={false} />);
    await grow(-280);
    expect(layout.top).toBe(120);
  });

  it('the reader scrolling lets go; a click that is no way back holds nothing', async () => {
    const {container, rerender, getByLabelText, getByTestId} = render(<Page stepping={false} />);
    const {layout, grow, scroller} = stub(container);
    getByLabelText('Back').click();
    rerender(<Page stepping />);
    scroller.dispatchEvent(new WheelEvent('wheel'));
    await grow(-280);
    expect(layout.top).toBe(120);

    rerender(<Page stepping={false} />);
    getByTestId('elsewhere').click();
    rerender(<Page stepping />);
    await grow(50);
    expect(layout.top).toBe(170);
  });
});
