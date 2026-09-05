import {expect, test} from 'vitest';
import {renderTree} from '../../testing/render';

const leaves = [
  {id: 'a', component: 'Text', text: 'A'},
  {id: 'b', component: 'Text', text: 'B'},
];

test('Row and Column are Radix Flex on their axis, justify and align translated', () => {
  const row = renderTree([
    {id: 'root', component: 'Row', children: ['a', 'b'], justify: 'spaceBetween', align: 'center'},
    ...leaves,
  ]);
  const flex = row.container.querySelector('.rt-Flex') as HTMLElement;
  expect(flex.className).toContain('rt-r-fd-row');
  expect(flex.className).toContain('rt-r-jc-space-between');
  expect(flex.className).toContain('rt-r-ai-center');
  row.unmount();

  const column = renderTree([
    {id: 'root', component: 'Column', children: ['a', 'b'], justify: 'spaceEvenly'},
    ...leaves,
  ]);
  const col = column.container.querySelector('.rt-Flex') as HTMLElement;
  expect(col.className).toContain('rt-r-fd-column');
  // A value Radix has no prop for is set as the CSS property on the same element.
  expect(col.style.justifyContent).toBe('space-evenly');
  expect(col.className).toContain('rt-r-ai-stretch');
});

test('a template child list expands one child per element, each in its own data scope', () => {
  const {container} = renderTree(
    [
      {id: 'root', component: 'Column', children: {path: '/rows', componentId: 'row'}},
      {id: 'row', component: 'Text', text: {path: 'name'}},
    ],
    {data: {rows: [{name: 'one'}, {name: 'two'}, {name: 'three'}]}},
  );
  expect([...container.querySelectorAll('.rt-Flex > .rt-Text')].map(el => el.textContent)).toEqual([
    'one',
    'two',
    'three',
  ]);
});

test('weight becomes the flex share, as upstream applies it', () => {
  const {container} = renderTree([
    {id: 'root', component: 'Row', children: ['a', 'b']},
    {id: 'a', component: 'Text', text: 'A', weight: 2},
    {id: 'b', component: 'Text', text: 'B', weight: 1},
  ]);
  const [a, b] = [...container.querySelectorAll('.rt-Flex > .rt-Text')] as HTMLElement[];
  expect(a.style.flexGrow).toBe('2');
  expect(b.style.flexGrow).toBe('1');
});

test('List scrolls along its axis; Card is a Radix Card; Divider a Radix Separator', () => {
  const {container} = renderTree([
    {id: 'root', component: 'Column', children: ['list', 'card', 'rule']},
    {id: 'list', component: 'List', children: ['a', 'b'], direction: 'horizontal'},
    {id: 'card', component: 'Card', child: 'c'},
    {id: 'c', component: 'Text', text: 'C'},
    {id: 'rule', component: 'Divider', axis: 'vertical'},
    ...leaves,
  ]);
  const list = [...container.querySelectorAll('.rt-Flex')].find(
    el => (el as HTMLElement).style.overflowX,
  ) as HTMLElement;
  expect(list.style.overflowX).toBe('auto');
  expect(list.className).toContain('rt-r-fd-row');
  expect(container.querySelector('.rt-Card')).toHaveTextContent('C');
  const rule = container.querySelector('.rt-Separator') as HTMLElement;
  expect(rule).not.toBeNull();
  expect(rule.className).toContain('rt-r-orientation-vertical');
});
