/**
 * `Table` and `TableRow`: a merged list with columns that align (task 5.7, the merged-view
 * finding). Rows are `TableRow`s, cells their children; a row rendered on its own falls back to
 * a plain flex row rather than a `<tr>` outside a table.
 */
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {renderTree} from '../../testing/render';

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => consoleError.mockRestore());

test('a Table is a real table: headings across the top, one row per child, one cell per row child', () => {
  const {container} = renderTree([
    {id: 'root', component: 'Table', columns: ['Camera', 'Price'], children: ['r1', 'r2']},
    {id: 'r1', component: 'TableRow', children: ['a1', 'a2']},
    {id: 'r2', component: 'TableRow', children: ['b1', 'b2']},
    {id: 'a1', component: 'Text', text: 'Lumen X100'},
    {id: 'a2', component: 'Text', text: '1,299'},
    {id: 'b1', component: 'Text', text: 'Verity A7'},
    {id: 'b2', component: 'Text', text: '1,799'},
  ]);
  const table = container.querySelector('table')!;
  expect(table).not.toBeNull();
  expect([...table.querySelectorAll('thead th')].map(th => th.textContent)).toEqual([
    'Camera',
    'Price',
  ]);
  const rows = [...table.querySelectorAll('tbody tr')];
  expect(rows).toHaveLength(2);
  expect([...rows[0]!.querySelectorAll('td')].map(td => td.textContent)).toEqual([
    'Lumen X100',
    '1,299',
  ]);
  expect(consoleError.mock.calls).toEqual([]);
});

test('a template child list expands one row per element, each cell in the element’s scope', () => {
  const {container} = renderTree(
    [
      {
        id: 'root',
        component: 'Table',
        columns: ['What', 'When'],
        children: {path: '/rows', componentId: 'row'},
      },
      {id: 'row', component: 'TableRow', children: ['what', 'when']},
      {id: 'what', component: 'Text', text: {path: 'what'}},
      {id: 'when', component: 'Text', text: {path: 'when'}},
    ],
    {
      data: {
        rows: [
          {what: 'one', when: '1'},
          {what: 'two', when: '2'},
          {what: 'three', when: '3'},
        ],
      },
    },
  );
  expect([...container.querySelectorAll('tbody tr')].map(tr => tr.textContent)).toEqual([
    'one1',
    'two2',
    'three3',
  ]);
  expect(consoleError.mock.calls).toEqual([]);
});

test('a TableRow outside a Table draws as a row, not as a stray table row', () => {
  const {container} = renderTree([
    {id: 'root', component: 'TableRow', children: ['a', 'b']},
    {id: 'a', component: 'Text', text: 'A'},
    {id: 'b', component: 'Text', text: 'B'},
  ]);
  expect(container.querySelector('tr')).toBeNull();
  expect(container.textContent).toContain('AB');
  expect(consoleError.mock.calls).toEqual([]);
});
