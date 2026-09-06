/**
 * `DataList` and `DataListItem`: the labelled values of one thing (task 5.7, the merged-view
 * finding). Items are label beside value; an item on its own falls back to a labelled row.
 */
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {renderTree} from '../../testing/render';

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => consoleError.mockRestore());

test('a DataList is a definition list: each item a label and its one child as the value', () => {
  const {container} = renderTree([
    {id: 'root', component: 'DataList', children: ['i1', 'i2']},
    {id: 'i1', component: 'DataListItem', label: 'Source', child: 'v1'},
    {id: 'i2', component: 'DataListItem', label: 'When', child: 'v2'},
    {id: 'v1', component: 'Text', text: 'gmail'},
    {id: 'v2', component: 'Text', text: '2026-09-05 01:24 UTC'},
  ]);
  const dl = container.querySelector('dl')!;
  expect(dl).not.toBeNull();
  expect([...dl.querySelectorAll('dt')].map(dt => dt.textContent)).toEqual(['Source', 'When']);
  expect([...dl.querySelectorAll('dd')].map(dd => dd.textContent)).toEqual([
    'gmail',
    '2026-09-05 01:24 UTC',
  ]);
  expect(consoleError.mock.calls).toEqual([]);
});

test('orientation lays the list out in a column or side by side, and a bound label resolves', () => {
  const {container} = renderTree(
    [
      {id: 'root', component: 'DataList', orientation: 'vertical', children: ['i1']},
      {id: 'i1', component: 'DataListItem', label: {path: '/label'}, child: 'v1'},
      {id: 'v1', component: 'Text', text: 'x'},
    ],
    {data: {label: 'Bound label'}},
  );
  const dl = container.querySelector('dl') as HTMLElement;
  expect(dl.className).toContain('rt-r-orientation-vertical');
  expect(dl.querySelector('dt')!.textContent).toBe('Bound label');
  expect(consoleError.mock.calls).toEqual([]);
});

test('a DataListItem outside a DataList draws as a labelled row', () => {
  const {container} = renderTree([
    {id: 'root', component: 'DataListItem', label: 'Source', child: 'v'},
    {id: 'v', component: 'Text', text: 'github'},
  ]);
  expect(container.querySelector('dt')).toBeNull();
  expect(container.textContent).toContain('Source');
  expect(container.textContent).toContain('github');
  expect(consoleError.mock.calls).toEqual([]);
});
