import {fireEvent, render as renderBare, screen, within} from '@testing-library/react';
import type {ReactElement} from 'react';
import userEvent from '@testing-library/user-event';
import {describe, expect, test, vi} from 'vitest';
import {DerivedValueView} from './derived-value';
import {type CellObject, DerivedValueApi} from './derived-value.schema';
import type {EvaluatedRelation} from './join';
import {renderTree} from '../../testing/render';
import {Provider} from '../../provider';

/** The view under the bundle's Provider: its detail floats in a tooltip, which needs the Theme. */
const render = (ui: ReactElement) => renderBare(<Provider>{ui}</Provider>);

const usd = {kind: 'currency', currency: 'USD'} as const;

test('a complete value renders bare and formatted, with its source count as the accessible name', () => {
  render(<DerivedValueView cell={{value: 899, contributed: 2, of: 2, absent: []}} format={usd} />);
  const cell = screen.getByLabelText('$899.00 · 2 of 2 sources');
  expect(cell).toHaveAttribute('data-state', 'complete');
  expect(cell).toHaveTextContent('$899.00');
  expect(cell.querySelector('[data-marker]')).toBeNull();
});

test('a partial value carries a marker at rest and names the missing source on focus', async () => {
  const user = userEvent.setup();
  render(
    <DerivedValueView
      cell={{value: 899, contributed: 1, of: 2, absent: ['shop-b:list']}}
      format={usd}
    />,
  );
  const cell = screen.getByLabelText('$899.00 · 1 of 2 sources · shop-b not showing this');
  expect(cell).toHaveAttribute('data-state', 'partial');
  expect(cell.querySelector('[data-marker="partial"]')).not.toBeNull();
  expect(cell).not.toHaveTextContent('1 of 2');
  await user.tab();
  expect(await screen.findByRole('tooltip')).toHaveTextContent(
    '1 of 2 sources · shop-b not showing this',
  );
  expect(cell).not.toHaveTextContent('1 of 2');
});

test('an absent value renders a dash in place of the value', () => {
  render(
    <DerivedValueView
      cell={{value: undefined, contributed: 0, of: 2, absent: ['shop-a:list', 'shop-b:list']}}
    />,
  );
  const cell = screen.getByLabelText('— · no source is showing this');
  expect(cell).toHaveAttribute('data-state', 'absent');
  expect(cell).toHaveTextContent('—');
  expect(cell.querySelector('[data-marker="absent"]')).not.toBeNull();
});

test('format is fixed configuration: number groups, text stringifies, default is text', () => {
  const {rerender} = render(
    <DerivedValueView
      cell={{value: 12345.5, contributed: 1, of: 1, absent: []}}
      format={{kind: 'number'}}
    />,
  );
  expect(screen.getByText('12,345.5')).toBeInTheDocument();
  rerender(<DerivedValueView cell={{value: 'X100', contributed: 1, of: 1, absent: []}} />);
  expect(screen.getByText('X100')).toBeInTheDocument();
});

test('datetime format renders any spelling of a date-and-time in one human form, and a value it cannot read as painted (task 5.7)', () => {
  const human = 'Sep 5, 2026, 8:20 PM';
  const iso = render(
    <DerivedValueView
      cell={{value: '2026-09-06T00:20:00Z', contributed: 1, of: 1, absent: []}}
      format={{kind: 'datetime'}}
    />,
  );
  expect(iso.container.textContent).toContain(human);
  iso.unmount();
  const prose = render(
    <DerivedValueView
      cell={{value: 'Sep 6, 2026 · 00:20 UTC', contributed: 1, of: 1, absent: []}}
      format={{kind: 'datetime'}}
    />,
  );
  expect(prose.container.textContent).toContain(human);
  prose.unmount();
  const range = render(
    <DerivedValueView
      cell={{value: '11:00 – 12:00', contributed: 1, of: 1, absent: []}}
      format={{kind: 'datetime'}}
    />,
  );
  expect(range.container.textContent).toContain('11:00 – 12:00');
  expect(
    DerivedValueApi.schema.safeParse({cell: {path: 'when'}, format: {kind: 'datetime'}}).success,
  ).toBe(true);
});

test('cell is binding-only: a path or a call, never a literal', () => {
  expect(DerivedValueApi.schema.safeParse({cell: 899}).success).toBe(false);
  expect(DerivedValueApi.schema.safeParse({cell: 'best'}).success).toBe(false);
  expect(
    DerivedValueApi.schema.safeParse({cell: {call: 'value', args: {values: [1]}}}).success,
  ).toBe(true);
});

test('schema binds cell as a dynamic value and keeps format plain', () => {
  const ok = DerivedValueApi.schema.safeParse({cell: {path: 'best'}, format: usd});
  expect(ok.success).toBe(true);
  expect(DerivedValueApi.schema.safeParse({cell: {path: 'best'}}).success).toBe(true);
  expect(DerivedValueApi.schema.safeParse({format: usd}).success).toBe(false);
  expect(DerivedValueApi.schema.safeParse({cell: {path: 'best'}, style: 'loud'}).success).toBe(
    false,
  );
  expect(
    DerivedValueApi.schema.safeParse({cell: {path: 'best'}, format: {kind: 'currency'}}).success,
  ).toBe(false);
});

// The join on the values (task-7.5 decisions 7–13): cells built by hand, as the evaluator writes them.
const ref = (surface: string, pointer: string) => ({surface, pointer});
const samePr: EvaluatedRelation = {
  name: 'same pull request',
  kind: 'fact',
  op: 'equal',
  state: 'holds',
  sides: [
    {app: 'github', ref: ref('github:prs', '/prs[number=6]/number'), value: 6},
    {app: 'linear', ref: ref('linear:issues', '/issues[id="A2U-5"]/pr'), value: '#6'},
  ],
};
const sameIssue: EvaluatedRelation = {
  name: 'same issue',
  kind: 'judged',
  op: 'judged',
  state: 'holds',
  sides: [
    {app: 'github', ref: ref('github:prs', '/prs[number=6]/title'), value: 'Fix login'},
    {app: 'linear', ref: ref('linear:issues', '/issues[id="A2U-5"]/title'), value: 'Login broken'},
  ],
};
const sameBranch: EvaluatedRelation = {
  name: 'same branch',
  kind: 'fact',
  op: 'equal',
  state: 'fails',
  sides: [
    {app: 'linear', ref: ref('linear:issues', '/issues[id="A2U-5"]/branch'), value: 'fix-login'},
    {app: 'circleci', ref: ref('circleci:runs', '/runs[id="r1"]/branch'), value: 'main'},
  ],
};
const target = {app: 'linear', surface: 'linear:issues', pointer: '/issues[id="A2U-5"]/state'};
const names: Record<string, string> = {github: 'GitHub', linear: 'Linear', circleci: 'CircleCI'};
const appDisplayName = (appId: string) => names[appId];

const joined = (join: CellObject['join'], rest: Partial<CellObject> = {}): CellObject => ({
  value: 'In Progress',
  contributed: 1,
  of: 1,
  absent: [],
  join,
  target,
  ...rest,
});

test('a confirmed value carries no join mark and says where it came from and what matched on focus', async () => {
  const user = userEvent.setup();
  render(
    <DerivedValueView
      cell={joined({mark: 'none', apps: ['linear'], evidence: [samePr]})}
      appDisplayName={appDisplayName}
    />,
  );
  const cell = screen.getByLabelText(
    'In Progress · 1 of 1 sources · From Linear · same pull request',
  );
  expect(cell).toHaveAttribute('data-join', 'none');
  expect(cell.querySelector('[data-join-marker]')).toBeNull();
  expect(cell).not.toHaveTextContent('From Linear');
  await user.tab();
  expect(await screen.findByRole('tooltip')).toHaveTextContent('From Linear · same pull request');
  expect(cell).not.toHaveTextContent('From Linear');
});

test('a guessed value is underlined dotted with a small question mark, and its detail gives both values', async () => {
  const user = userEvent.setup();
  render(
    <DerivedValueView
      cell={joined({mark: 'guessed', apps: ['linear'], evidence: [sameIssue]})}
      appDisplayName={appDisplayName}
    />,
  );
  const detail = 'From Linear · same issue: “Fix login” / “Login broken”';
  const cell = screen.getByLabelText(`In Progress · 1 of 1 sources · guessed match · ${detail}`);
  expect(cell).toHaveAttribute('data-join', 'guessed');
  expect(cell.querySelector('[data-join-marker="guessed"]')).toHaveTextContent('?');
  expect(cell.querySelector('[data-value]')).toHaveStyle({textDecorationStyle: 'dotted'});
  await user.tab();
  expect(await screen.findByRole('tooltip')).toHaveTextContent(detail);
});

test('a broken value carries an amber warning and its detail gives both values', () => {
  render(
    <DerivedValueView
      cell={joined(
        {mark: 'broken', apps: ['circleci'], evidence: [sameBranch]},
        {value: 'failed', target: {...target, app: 'circleci', surface: 'circleci:runs'}},
      )}
      appDisplayName={appDisplayName}
    />,
  );
  const cell = screen.getByLabelText(
    'failed · 1 of 1 sources · broken match · From CircleCI · same branch: “fix-login” / “main”',
  );
  expect(cell).toHaveAttribute('data-join', 'broken');
  expect(cell.querySelector('[data-join-marker="broken"]')).toHaveTextContent('⚠');
});

test('the join marks are a second family: a value can be partial and guessed at once', () => {
  render(
    <DerivedValueView
      cell={joined(
        {mark: 'guessed', apps: ['github', 'linear'], evidence: [sameIssue]},
        {contributed: 1, of: 2, absent: ['github:prs']},
      )}
      appDisplayName={appDisplayName}
    />,
  );
  const cell = screen.getByLabelText(
    'In Progress · 1 of 2 sources · GitHub not showing this · guessed match · From GitHub and Linear · same issue: “Fix login” / “Login broken”',
  );
  expect(cell.querySelector('[data-marker="partial"]')).not.toBeNull();
  expect(cell.querySelector('[data-join-marker="guessed"]')).not.toBeNull();
});

test('an absent value from a claimed object keeps its absence and adds no join mark', () => {
  render(
    <DerivedValueView
      cell={joined(
        {mark: 'none', apps: ['linear'], evidence: [{...samePr, state: 'absent'}]},
        {value: undefined, contributed: 0, of: 1, absent: ['linear:issues']},
      )}
      appDisplayName={appDisplayName}
    />,
  );
  const cell = screen.getByLabelText(
    '— · no source is showing this · From Linear · same pull request',
  );
  expect(cell.querySelector('[data-marker="absent"]')).not.toBeNull();
  expect(cell.querySelector('[data-join-marker]')).toBeNull();
});

test('the host names the apps; without a name the app id stands in', () => {
  const cell = {value: 899, contributed: 1, of: 2, absent: ['shop-b:list']};
  const {unmount} = render(
    <DerivedValueView
      cell={cell}
      appDisplayName={id => (id === 'shop-b' ? 'Shop B' : undefined)}
    />,
  );
  expect(
    screen.getByLabelText('899 · 1 of 2 sources · Shop B not showing this'),
  ).toBeInTheDocument();
  unmount();
  render(<DerivedValueView cell={cell} appDisplayName={() => undefined} />);
  expect(
    screen.getByLabelText('899 · 1 of 2 sources · shop-b not showing this'),
  ).toBeInTheDocument();
});

describe('the value is the button (decision 13)', () => {
  test('a cell with a target raises the host’s handler with it on click and on Enter', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <DerivedValueView
        cell={joined({mark: 'guessed', apps: ['linear'], evidence: [sameIssue]})}
        appDisplayName={appDisplayName}
        onNavigate={onNavigate}
      />,
    );
    const button = screen.getByRole('button', {name: /^In Progress/});
    expect(button).toHaveStyle({cursor: 'pointer'});
    await user.tab();
    await user.keyboard('{Enter}');
    expect(onNavigate).toHaveBeenLastCalledWith(target);
    await user.click(button);
    expect(onNavigate).toHaveBeenCalledTimes(2);
    expect(onNavigate).toHaveBeenLastCalledWith(target);
  });

  test('the detail floats beside the cell and is text: nothing in it navigates', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <DerivedValueView
        cell={joined({mark: 'guessed', apps: ['linear'], evidence: [sameIssue]})}
        appDisplayName={appDisplayName}
        onNavigate={onNavigate}
      />,
    );
    const button = screen.getByRole('button');
    const before = button.textContent;
    await user.tab();
    const tooltip = await screen.findByRole('tooltip');
    expect(button.textContent).toBe(before);
    expect(within(tooltip).queryAllByRole('button')).toEqual([]);
    expect(within(tooltip).queryAllByRole('link')).toEqual([]);
    fireEvent.click(tooltip);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  test('an absent cell with a target still navigates', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <DerivedValueView
        cell={{value: undefined, contributed: 0, of: 1, absent: ['linear:issues'], target}}
        onNavigate={onNavigate}
      />,
    );
    await user.click(screen.getByRole('button'));
    expect(onNavigate).toHaveBeenCalledWith(target);
  });

  test('without a handler, or without a target, a cell is not interactive', () => {
    const {unmount} = render(
      <DerivedValueView cell={{value: 899, contributed: 1, of: 1, absent: [], target}} />,
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByLabelText('899 · 1 of 1 sources')).not.toHaveAttribute('tabindex');
    unmount();
    render(
      <DerivedValueView
        cell={{value: 899, contributed: 1, of: 1, absent: []}}
        onNavigate={vi.fn()}
      />,
    );
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('built for a host (decisions 11, 13)', () => {
  const tree = [{id: 'root', component: 'DerivedValue', cell: {path: '/status'}}];
  const status = joined(
    {mark: 'guessed', apps: ['linear'], evidence: [sameIssue]},
    {contributed: 1, of: 2, absent: ['github:prs']},
  );

  test('createCatalog’s navigation handler receives the cell’s target, and its lookup names the apps', async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    renderTree(tree, {data: {status}, onNavigate, appDisplayName});
    const button = screen.getByRole('button', {
      name: 'In Progress · 1 of 2 sources · GitHub not showing this · guessed match · From Linear · same issue: “Fix login” / “Login broken”',
    });
    await user.click(button);
    expect(onNavigate).toHaveBeenCalledWith(target);
  });

  test('a catalog built without them draws the join with app ids and does not navigate', () => {
    renderTree(tree, {data: {status}});
    expect(screen.queryByRole('button')).toBeNull();
    expect(
      screen.getByLabelText(
        'In Progress · 1 of 2 sources · github not showing this · guessed match · From linear · same issue: “Fix login” / “Login broken”',
      ),
    ).toBeInTheDocument();
  });
});
