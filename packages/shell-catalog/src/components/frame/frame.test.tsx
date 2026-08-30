import {render} from '@testing-library/react';
import {expect, test} from 'vitest';
import {FrameView} from './frame';
import {FrameApi} from './frame.schema';

const child = (id: string) => <span data-child={id}>{id}</span>;

test('a row makes its children share the axis equally', () => {
  // Equal shares, not proportional to content: `flex-basis: 0` is what stops the wordier
  // fragment claiming the wider column, and is the whole reason this component exists.
  const {container} = render(
    <FrameView direction="row" children={['a', 'b']} buildChild={child} />,
  );
  const items = [...container.querySelectorAll('[data-frame] > div')];
  expect(items).toHaveLength(2);
  for (const item of items) {
    const {flexGrow, flexBasis} = (item as HTMLElement).style;
    expect({flexGrow, flexBasis}).toEqual({flexGrow: '1', flexBasis: '0px'});
  }
});

test('a column leaves its children at their natural size', () => {
  const {container} = render(<FrameView direction="column" children={['a']} buildChild={child} />);
  const item = container.querySelector('[data-frame] > div') as HTMLElement;
  // Growing down a column would stretch a short fragment to fill the viewport.
  expect({grow: item.style.flexGrow, basis: item.style.flexBasis}).toEqual({
    grow: '0',
    basis: 'auto',
  });
});

test('children are built in the order given', () => {
  const {container} = render(
    <FrameView direction="row" children={['first', 'second']} buildChild={child} />,
  );
  expect(
    [...container.querySelectorAll('[data-child]')].map(e => e.getAttribute('data-child')),
  ).toEqual(['first', 'second']);
});

test('schema accepts the painted shape and rejects extras', () => {
  expect(FrameApi.schema.safeParse({direction: 'row', children: ['a']}).success).toBe(true);
  expect(FrameApi.schema.safeParse({direction: 'diagonal', children: []}).success).toBe(false);
  expect(FrameApi.schema.safeParse({direction: 'row', children: ['a'], gap: 4}).success).toBe(
    false,
  );
});
