import {bodyCellStyle} from './table';
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

/* ── Task 8.2: the reserved column ───────────────────────────────────────────── */

import {SlotStateContext, type SlotStateResolver} from '../../slot-state';
import {TableApi} from './table.schema';

const RESERVED_TREE = [
  {
    id: 'root',
    component: 'Table',
    columns: ['Issue', 'Pull request', 'CI build'],
    columnSources: ['linear', 'github', 'circleci'],
    children: ['r1'],
  },
  {id: 'r1', component: 'TableRow', children: ['a1', 'a2', 'a3']},
  {id: 'a1', component: 'Text', text: 'Fix login'},
  {id: 'a2', component: 'Text', text: '#6'},
  {id: 'a3', component: 'Text', text: '—'},
];

const withStates =
  (states: Record<string, ReturnType<SlotStateResolver>>) => (node: React.ReactNode) => (
    <SlotStateContext.Provider value={source => states[source]}>{node}</SlotStateContext.Provider>
  );

test('schema takes columnSources, a source or null per column', () => {
  const table = (extra: Record<string, unknown>) =>
    TableApi.schema.safeParse({columns: ['Issue', 'CI build'], children: ['r'], ...extra}).success;
  expect(table({columnSources: ['linear', 'circleci']})).toBe(true);
  expect(table({columnSources: [null, 'circleci']})).toBe(true);
  expect(table({columnSources: ['linear', 2]})).toBe(false);
});

test('a columnSources shorter than the columns marks only the columns it covers', () => {
  const {container} = renderTree(
    [{...RESERVED_TREE[0]!, columnSources: ['linear']}, ...RESERVED_TREE.slice(1)],
    {wrap: withStates({linear: 'pending', circleci: 'pending'})},
  );
  const headings = [...container.querySelectorAll('thead th')].map(th =>
    th.textContent?.replace(/\s+/g, ' '),
  );
  expect(headings).toEqual(['Issue · loading', 'Pull request', 'CI build']);
  expect(container.querySelectorAll('tbody td')[2]!.textContent).toBe('—');
  expect(consoleError.mock.calls).toEqual([]);
});

test('a column whose source is pending draws skeleton bars in place of its cells and says so in the heading', () => {
  const {container} = renderTree(RESERVED_TREE, {
    wrap: withStates({linear: 'filled', github: 'filled', circleci: 'pending'}),
  });
  const headings = [...container.querySelectorAll('thead th')].map(th =>
    th.textContent?.replace(/\s+/g, ' '),
  );
  expect(headings).toEqual(['Issue', 'Pull request', 'CI build · loading']);
  const cells = [...container.querySelectorAll('tbody td')];
  expect(cells[0]!.textContent).toBe('Fix login');
  expect(cells[2]!.textContent).toBe('');
  expect(cells[2]!.querySelector('[data-skeleton-bar]')).not.toBeNull();
  expect(cells[2]!).toHaveAttribute('data-column-reserved', 'pending');
  expect(consoleError.mock.calls).toEqual([]);
});

test('a column whose source failed draws the empty dash and says unavailable', () => {
  const {container} = renderTree(RESERVED_TREE, {
    wrap: withStates({linear: 'filled', github: 'filled', circleci: 'failed'}),
  });
  const headings = [...container.querySelectorAll('thead th')].map(th =>
    th.textContent?.replace(/\s+/g, ' '),
  );
  expect(headings[2]).toBe('CI build · unavailable');
  const cell = container.querySelectorAll('tbody td')[2]!;
  expect(cell.textContent).toBe('—');
  expect(cell).toHaveAttribute('data-column-reserved', 'failed');
  expect(consoleError.mock.calls).toEqual([]);
});

test('a filled source, or one the host says nothing about, leaves the authored cell and heading alone', () => {
  const filled = renderTree(RESERVED_TREE, {
    wrap: withStates({linear: 'filled', github: 'filled', circleci: 'filled'}),
  });
  expect(filled.container.querySelectorAll('tbody td')[2]!.textContent).toBe('—');
  expect(filled.container.querySelectorAll('thead th')[2]!.textContent).toBe('CI build');
  filled.unmount();
  const silent = renderTree(RESERVED_TREE);
  expect(silent.container.querySelectorAll('tbody td')[2]!.textContent).toBe('—');
  expect(silent.container.querySelectorAll('thead th')[2]!.textContent).toBe('CI build');
  expect(silent.container.querySelector('[data-column-reserved]')).toBeNull();
  expect(consoleError.mock.calls).toEqual([]);
});

test('a column whose source waits for Include keeps its authored dashes and says not included', () => {
  const {container} = renderTree(RESERVED_TREE, {
    wrap: withStates({linear: 'filled', github: 'filled', circleci: 'late'}),
  });
  const headings = [...container.querySelectorAll('thead th')].map(th =>
    th.textContent?.replace(/\s+/g, ' '),
  );
  expect(headings[2]).toBe('CI build · not included');
  const cell = container.querySelectorAll('tbody td')[2]!;
  expect(cell.textContent).toBe('—');
  expect(cell.querySelector('[data-skeleton-bar]')).toBeNull();
  expect(cell).toHaveAttribute('data-column-reserved', 'late');
  expect(consoleError.mock.calls).toEqual([]);
});

test('the first column reads on one line, the others wrap under a cap; the table scrolls sideways when it cannot fit (task-8.7 decision 29)', () => {
  expect(bodyCellStyle(0)).toMatchObject({whiteSpace: 'nowrap'});
  expect(bodyCellStyle(0)).not.toHaveProperty('maxWidth');
  expect(bodyCellStyle(1)).toMatchObject({maxWidth: '56ch', overflowWrap: 'anywhere'});
  expect(bodyCellStyle(1)).not.toHaveProperty('whiteSpace');
});
