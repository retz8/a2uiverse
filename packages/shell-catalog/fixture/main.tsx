/**
 * Design-check fixture (task-5.9 decision 6): the whole catalog — every component in every
 * value of every enum prop, generated from `catalog.json` and rendered through the real renderer
 * from A2UI trees — under Radix light · Radix dark · no host Theme; the task 5.11 timeline
 * example as one merged view; the Slot/Attribution states; the failure tile, the reserved column
 * and the reader's presses (tasks 8.2–8.5); the DerivedValue join states (task 7.5); and the
 * scoping proof (two Providers under different host Themes, one document).
 */
import {StrictMode, useEffect, useMemo, useState, type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import {Theme} from '@radix-ui/themes';
import {A2uiSurface, type ReactComponentImplementation} from '@a2ui/react/v0_9';
import {MessageProcessor, type SurfaceModel} from '@a2ui/web_core/v0_9';
import {resolvePointer, type SortDeclaration} from '@a2uiverse/sdk';
import {
  AttributionView,
  CATALOG_ID,
  type CellObject,
  createCatalog,
  type EvaluatedRelation,
  type PressRecord,
  PressStateContext,
  Provider,
  SlotContentContext,
  SlotStateContext,
  SlotView,
} from '../src/index.js';
import schema from '../catalogs/v0.9.1/catalog.json';
import {componentNames, sweep, type CatalogSchema, type TreeComponent} from './matrix.js';
import {TODAY_TIMELINE, type TimelineExample} from './timeline-example.js';

const SCHEMA = schema as unknown as CatalogSchema;

const APP_NAMES: Record<string, string> = {
  github: 'GitHub',
  linear: 'Linear',
  circleci: 'CircleCI',
  gmail: 'Gmail',
};

const CATALOG = createCatalog({
  onShellAction: action => console.log('[fixture shell action]', action),
  onPress: press => console.log('[fixture press]', press),
  onNavigate: target => console.log('[fixture navigate]', target),
  appDisplayName: appId => APP_NAMES[appId],
});

/** A surface holding one tree, painted by the real renderer. */
function surfaceFor(
  components: TreeComponent[],
  data: Record<string, unknown>,
): SurfaceModel<ReactComponentImplementation> {
  const processor = new MessageProcessor<ReactComponentImplementation>([CATALOG], action =>
    console.log('[fixture action]', action),
  );
  const id = 'fixture';
  processor.processMessages([
    {version: 'v0.9', createSurface: {surfaceId: id, catalogId: CATALOG_ID}},
    {version: 'v0.9', updateDataModel: {surfaceId: id, path: '/', value: data}},
    {version: 'v0.9', updateComponents: {surfaceId: id, components}},
  ] as never);
  return processor.model.surfacesMap.get(id)!;
}

function Tree({
  components,
  data,
  onSurface,
}: {
  components: TreeComponent[];
  data: Record<string, unknown>;
  onSurface?: (surface: SurfaceModel<ReactComponentImplementation>) => void | (() => void);
}) {
  const surface = useMemo(() => surfaceFor(components, data), [components, data]);
  useEffect(() => onSurface?.(surface), [surface, onSurface]);
  return <A2uiSurface surface={surface} />;
}

/** One cell of the matrix: the varied prop and value as a caption, the tree under it. */
function Cell({label, children}: {label: string; children: ReactNode}) {
  return (
    <div style={{display: 'grid', gap: 4, minWidth: 0}}>
      <code style={{fontSize: 10, opacity: 0.6}}>{label}</code>
      <div style={{minWidth: 0}}>{children}</div>
    </div>
  );
}

function ComponentSweep({name}: {name: string}) {
  const cases = useMemo(() => sweep(SCHEMA, name), [name]);
  const wide = name === 'Icon';
  return (
    <section style={{display: 'grid', gap: 8}}>
      <h3 style={{font: '600 12px sans-serif', opacity: 0.8, margin: '12px 0 0'}}>{name}</h3>
      <div
        style={{
          display: 'grid',
          gap: wide ? 8 : 12,
          gridTemplateColumns: wide ? 'repeat(auto-fill, minmax(96px, 1fr))' : '1fr',
        }}
      >
        {cases.map(c => (
          <Cell key={c.label} label={c.label}>
            <Tree components={c.sample.components} data={c.sample.data} />
          </Cell>
        ))}
      </div>
    </section>
  );
}

function CatalogMatrix() {
  return (
    <SlotContentContext.Provider value={() => null}>
      {componentNames(SCHEMA).map(name => (
        <ComponentSweep key={name} name={name} />
      ))}
    </SlotContentContext.Provider>
  );
}

/* ── The task 5.11 timeline example as one merged view ─────────────────────── */

interface Cell {
  value: unknown;
  contributed: number;
  of: number;
  absent: string[];
}

/**
 * Evaluates the example's derived data model the way the client's evaluator would for a
 * `value` formula: resolve the ref into the recorded source, wrap it as a cell with its
 * contributor state. Enough for the example, which uses `value` alone.
 */
function evaluateExample(example: TimelineExample): Record<string, unknown> {
  const sources = new Map(example.sources.map(s => [s.surface, s.data]));
  const evaluate = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(evaluate);
    if (node && typeof node === 'object') {
      const record = node as Record<string, unknown>;
      if (typeof record.op === 'string' && Array.isArray(record.args)) {
        const ref = record.args[0] as {surface: string; pointer: string};
        const found = resolvePointer(sources.get(ref.surface), ref.pointer);
        return found.found
          ? ({value: found.value, contributed: 1, of: 1, absent: []} satisfies Cell)
          : ({value: undefined, contributed: 0, of: 1, absent: [ref.surface]} satisfies Cell);
      }
      return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, evaluate(v)]));
    }
    return node;
  };
  return evaluate(example.output.dataModel) as Record<string, unknown>;
}

function sorted(rows: Record<string, Cell>[], sort: SortDeclaration): Record<string, Cell>[] {
  const field = sort.key.replace(/^\//, '');
  const sign = sort.direction === 'desc' ? -1 : 1;
  return [...rows].sort((a, b) => {
    const x = String(a[field]?.value ?? '');
    const y = String(b[field]?.value ?? '');
    return sign * (x < y ? -1 : x > y ? 1 : 0);
  });
}

function Timeline() {
  const example = TODAY_TIMELINE;
  const {components, data} = useMemo(() => {
    const model = evaluateExample(example);
    const sort = example.output.sorts[0];
    const timeline = sorted(model.timeline as Record<string, Cell>[], sort);
    return {
      components: example.output.tree.components,
      data: {...model, timeline, sorts: [sort]},
    };
  }, [example]);
  // The sort control writes the declaration back to /sorts/0; re-order the array on the write,
  // as the client's evaluator does.
  const onSurface = (surface: SurfaceModel<ReactComponentImplementation>) => {
    const sub = surface.dataModel.subscribe<SortDeclaration>('/sorts/0', sort => {
      if (!sort) return;
      surface.dataModel.set('/timeline', sorted(data.timeline as Record<string, Cell>[], sort));
    });
    return () => sub.unsubscribe();
  };
  return (
    <section>
      <h3 style={{font: '600 12px sans-serif', opacity: 0.8, margin: '12px 0 8px'}}>
        task 5.11 — “{example.intent}” as one merged view
      </h3>
      <Tree components={components} data={data} onSurface={onSurface} />
    </section>
  );
}

/* ── Slot and Attribution states, as the composed screen paints them ─────────── */

function Fragment({label}: {label: string}) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 'var(--radius-3)',
        background: 'var(--color-panel-solid)',
        color: 'var(--gray-12)',
        border: '1px solid var(--gray-6)',
      }}
    >
      {label}
    </div>
  );
}

function SlotMatrix() {
  return (
    <section style={{display: 'grid', gap: 12}}>
      <h3 style={{font: '600 12px sans-serif', opacity: 0.8, margin: '12px 0 0'}}>
        Slot · Attribution
      </h3>
      <div>
        <AttributionView displayName="Gmail" account="work" />
        <SlotView source="gmail" label="Gmail" />
      </div>
      <div>
        the paint's time (task-9.9 decision 13), out of sight until hover or focus:
        <AttributionView displayName="Gmail" account="work" history={{time: '10:17'}} />
        <AttributionView displayName="GitHub" account={null} history={{time: '10:17'}} />
      </div>
      <div>
        <AttributionView displayName="Calendar" account={null} />
        <SlotContentContext.Provider value={() => <Fragment label="filled fragment" />}>
          <SlotView source="calendar" />
        </SlotContentContext.Provider>
      </div>
      <div>
        <AttributionView displayName="GitHub" account={null} />
        <SlotView source="github" state="failed" label="GitHub" />
      </div>
      <div>
        the way back (task 9.5): a back arrow with somewhere to go, back and forward after a back, a
        neighbour the agent did not name, and disabled where no press can be made:
        <AttributionView
          displayName="GitHub"
          appId="github"
          history={{back: {step: 0, title: 'Open pull requests'}}}
          onPress={logPress}
        />
        <AttributionView
          displayName="GitHub"
          appId="github"
          history={{
            back: {step: 0, title: 'Open pull requests'},
            forward: {step: 2, title: 'PR #42'},
          }}
          onPress={logPress}
        />
        <AttributionView
          displayName="Linear"
          appId="linear"
          history={{back: {step: 0}, forward: {step: 2}}}
          onPress={logPress}
        />
        <PressStateContext.Provider value={{enabled: false, presses: []}}>
          <AttributionView
            displayName="GitHub"
            appId="github"
            history={{back: {step: 0, title: 'Open pull requests'}}}
            onPress={logPress}
          />
        </PressStateContext.Provider>
      </div>
      <div>
        <SlotView source="shell" content="shell" label="Synthesis" />
      </div>
      <div>
        reserved with columns marked to their sources (Linear filled · GitHub loading · CircleCI
        failed):
        <SlotStateContext.Provider value={source => RESERVED_STATES[source]}>
          <SlotView
            source="shell"
            content="shell"
            label="Synthesis"
            columns={['Issue', 'Status', 'Pull request', 'CI build']}
            columnSources={['linear', 'linear', 'github', 'circleci']}
          />
        </SlotStateContext.Provider>
      </div>
      <div>
        declined (one line where the label would have sat):
        <hr />
        <SlotView
          source="shell"
          content="shell"
          state="collapsed"
          declined={{reason: 'Nothing to join: no GitHub PR names a Linear issue.'}}
        />
        <hr />
      </div>
      <div>
        the other collapses (the shell’s words, the same row):
        <hr />
        <SlotView
          source="shell"
          content="shell"
          state="collapsed"
          collapse={{cause: 'home', home: 'Linear issues'}}
        />
        <hr />
        <SlotView
          source="shell"
          content="shell"
          state="collapsed"
          collapse={{cause: 'few', answered: ['GitHub']}}
        />
        <hr />
        <SlotView source="shell" content="shell" state="collapsed" collapse={{cause: 'unmade'}} />
        <hr />
      </div>
      <div>
        <SlotView
          gap="flight booking"
          onSearchStore={query => console.log('[fixture capability tile]', query)}
        />
      </div>
      <div>
        collapsed (nothing should render between the rules):
        <hr />
        <SlotView source="gmail" state="collapsed" />
        <hr />
      </div>
    </section>
  );
}

/* ── The failure tile (task 8.2, the design canvas's F6), per cause ─────────── */

const RESERVED_STATES: Record<string, 'pending' | 'filled' | 'failed'> = {
  linear: 'filled',
  github: 'pending',
  circleci: 'failed',
};

const FAILURES: {label: string; props: Parameters<typeof SlotView>[0]}[] = [
  {
    label: 'vendor, with its message',
    props: {
      source: 'circleci',
      label: 'CircleCI',
      noun: 'CircleCI runs',
      failure: {cause: 'vendor', message: 'Project not found: retz8/a2uiverse'},
    },
  },
  {
    label: 'vendor, no message',
    props: {
      source: 'circleci',
      label: 'CircleCI',
      noun: 'CircleCI runs',
      failure: {cause: 'vendor'},
    },
  },
  {
    label: 'unreachable',
    props: {
      source: 'github',
      label: 'GitHub',
      noun: 'pull requests',
      failure: {cause: 'unreachable'},
    },
  },
  {
    label: 'timeout, the hard cap',
    props: {
      source: 'circleci',
      label: 'CircleCI',
      noun: 'CircleCI runs',
      failure: {cause: 'timeout'},
    },
  },
  {
    label: 'invalid paint, no noun',
    props: {source: 'gmail', label: 'Gmail', failure: {cause: 'invalid'}},
  },
];

function FailureMatrix() {
  return (
    <section style={{display: 'grid', gap: 12}}>
      <h3 style={{font: '600 12px sans-serif', opacity: 0.8, margin: '12px 0 0'}}>
        Slot · the failure tile
      </h3>
      {FAILURES.map(({label, props}) => (
        <Cell key={label} label={label}>
          <AttributionView displayName={props.label ?? ''} account={null} />
          <SlotView
            {...props}
            state="failed"
            onPress={operation => console.log('[fixture press]', operation)}
          />
        </Cell>
      ))}
      <Cell label="Retry pressed, before the paint catches up: the pending line">
        <PressStateContext.Provider
          value={{enabled: true, presses: [press('retry', ['circleci'], 'sent')]}}
        >
          <AttributionView displayName="CircleCI" account={null} />
          <SlotView {...PRESS_TILE} state="failed" onPress={logPress} />
        </PressStateContext.Provider>
      </Cell>
      <Cell label="Retry never reached A2UIVerse">
        <PressStateContext.Provider
          value={{enabled: true, presses: [press('retry', ['circleci'], 'unreached')]}}
        >
          <SlotView {...PRESS_TILE} state="failed" onPress={logPress} />
        </PressStateContext.Provider>
      </Cell>
      <Cell label="Retry’s stream broke after it answered">
        <PressStateContext.Provider
          value={{enabled: true, presses: [press('retry', ['circleci'], 'lost')]}}
        >
          <SlotView {...PRESS_TILE} onPress={logPress} />
        </PressStateContext.Provider>
      </Cell>
      <Cell label="no press possible here (parked, or a newer question sent): Retry disabled">
        <PressStateContext.Provider value={{enabled: false, presses: []}}>
          <SlotView {...PRESS_TILE} state="failed" onPress={logPress} />
        </PressStateContext.Provider>
      </Cell>
      <Cell label="no press handler: the tile stands without Retry">
        <SlotView source="circleci" label="CircleCI" state="failed" failure={{cause: 'timeout'}} />
      </Cell>
    </section>
  );
}

/* ── A landed table with a column reserved for its source ───────────────────── */

const RESERVED_TABLE: TreeComponent[] = [
  {id: 'root', component: 'Column', children: ['label', 'table']},
  {id: 'label', component: 'Text', variant: 'h5', text: 'Active work status'},
  {
    id: 'table',
    component: 'Table',
    columns: ['Issue', 'Status', 'Pull request', 'CI build'],
    columnSources: ['linear', 'linear', 'github', 'circleci'],
    children: {path: '/rows', componentId: 'row'},
  },
  {id: 'row', component: 'TableRow', children: ['c-issue', 'c-status', 'c-pr', 'c-ci']},
  {id: 'c-issue', component: 'Text', text: {path: 'issue'}},
  {id: 'c-status', component: 'Text', text: {path: 'status'}},
  {id: 'c-pr', component: 'Text', text: {path: 'pr'}},
  {id: 'c-ci', component: 'Text', text: '—'},
];
const RESERVED_ROWS = {
  rows: [
    {issue: 'Give the Synthesizer more thinking effort', status: 'In Progress', pr: '#8'},
    {issue: 'Say on the canvas when an utterance fails', status: 'In Progress', pr: '#6'},
    {issue: 'Name the workflow, not its id', status: 'In Progress', pr: '#7'},
  ],
};

function ReservedColumnMatrix() {
  return (
    <section style={{display: 'grid', gap: 12}}>
      <h3 style={{font: '600 12px sans-serif', opacity: 0.8, margin: '12px 0 0'}}>
        Table · a column reserved for its source
      </h3>
      {(['pending', 'failed', 'late', 'filled'] as const).map(state => (
        <Cell key={state} label={`CircleCI ${state}`}>
          <SlotStateContext.Provider value={source => (source === 'circleci' ? state : 'filled')}>
            <Tree components={RESERVED_TABLE} data={RESERVED_ROWS} />
          </SlotStateContext.Provider>
        </Cell>
      ))}
    </section>
  );
}

/* ── The reader's presses on the merged view (task 8.5) ─────────────────────── */

const logPress = (operation: unknown) => console.log('[fixture press]', operation);
const press = (
  kind: 'retry' | 'include' | 'tryAgain',
  sources: string[],
  status: PressRecord['status'],
): PressRecord => ({operation: {kind, sources}, status});
const PRESS_TILE = {
  source: 'circleci',
  label: 'CircleCI',
  noun: 'CircleCI runs',
  failure: {cause: 'timeout' as const},
};
const nameOf = (appId: string) => APP_NAMES[appId] ?? appId;

const LANDED_PRESSES: {label: string; props: Record<string, unknown>; presses?: PressRecord[]}[] = [
  {label: 'a late source waits', props: {late: ['circleci']}},
  {label: 'two late sources, one Include', props: {late: ['circleci', 'gmail']}},
  {label: 'including (painted)', props: {working: {sources: ['circleci']}}},
  {
    label: 'Include pressed, before the paint catches up',
    props: {late: ['circleci']},
    presses: [press('include', ['circleci'], 'sent')],
  },
  {label: 'updating (Try again)', props: {working: {sources: []}}},
  {
    label: 'couldn’t include',
    props: {late: ['circleci'], callFailed: {kind: 'include', sources: ['circleci']}},
  },
  {
    label: 'couldn’t include, and a newer source waits',
    props: {late: ['circleci', 'gmail'], callFailed: {kind: 'include', sources: ['circleci']}},
  },
  {
    label: 'couldn’t be updated, and a late source waits: two rows',
    props: {callFailed: {kind: 'update', sources: []}, late: ['gmail']},
  },
  {
    label: 'Include never reached A2UIVerse',
    props: {late: ['circleci']},
    presses: [press('include', ['circleci'], 'unreached')],
  },
  {
    label: 'Include’s stream broke after it answered',
    props: {working: {sources: ['circleci']}},
    presses: [press('include', ['circleci'], 'lost')],
  },
];

const COLLAPSED_PRESSES: {
  label: string;
  props: Record<string, unknown>;
  presses?: PressRecord[];
}[] = [
  {
    label: 'declined, a late source waits: Include under the line',
    props: {
      declined: {reason: 'Nothing to join: no GitHub PR names a Linear issue.'},
      late: ['circleci'],
    },
  },
  {label: 'couldn’t be made: Try again inline', props: {collapse: {cause: 'unmade'}}},
  {
    label: 'a Retry that could bring it back runs: waiting',
    props: {collapse: {cause: 'home', home: 'Linear issues'}, retrying: ['linear']},
  },
  {
    label: 'a press makes it: working',
    props: {collapse: {cause: 'unmade'}, working: {sources: []}},
  },
  {
    label: 'Try again pressed, before the paint catches up',
    props: {collapse: {cause: 'unmade'}},
    presses: [press('tryAgain', [], 'sent')],
  },
];

function PressMatrix() {
  return (
    <section style={{display: 'grid', gap: 12}}>
      <h3 style={{font: '600 12px sans-serif', opacity: 0.8, margin: '12px 0 0'}}>
        Slot · the reader’s presses on the merged view
      </h3>
      {LANDED_PRESSES.map(({label, props, presses = []}) => (
        <Cell key={label} label={`landed · ${label}`}>
          <PressStateContext.Provider value={{enabled: true, presses}}>
            <SlotStateContext.Provider
              value={source => (source === 'circleci' ? 'late' : 'filled')}
            >
              <SlotContentContext.Provider
                value={() => <Tree components={RESERVED_TABLE} data={RESERVED_ROWS} />}
              >
                <SlotView
                  source="shell"
                  content="shell"
                  label="Synthesis"
                  {...props}
                  nameOf={nameOf}
                  onPress={logPress}
                />
              </SlotContentContext.Provider>
            </SlotStateContext.Provider>
          </PressStateContext.Provider>
        </Cell>
      ))}
      {COLLAPSED_PRESSES.map(({label, props, presses = []}) => (
        <Cell key={label} label={`collapsed · ${label}`}>
          <PressStateContext.Provider value={{enabled: true, presses}}>
            <hr />
            <SlotView
              source="shell"
              content="shell"
              state="collapsed"
              {...props}
              nameOf={nameOf}
              onPress={logPress}
            />
            <hr />
          </PressStateContext.Provider>
        </Cell>
      ))}
    </section>
  );
}

/* ── DerivedValue's join on the values, cells built by hand (task 7.5) ───────── */

const side = (app: string, pointer: string, value: unknown) => ({
  app,
  ref: {surface: `${app}:list`, pointer},
  value,
});
const SAME_PR: EvaluatedRelation = {
  name: 'same pull request',
  kind: 'fact',
  op: 'equal',
  state: 'holds',
  sides: [
    side('github', '/prs[number=6]/number', 6),
    side('linear', '/issues[id="A2U-5"]/pr', '#6'),
  ],
};
const SAME_ISSUE: EvaluatedRelation = {
  name: 'same issue',
  kind: 'judged',
  op: 'judged',
  state: 'holds',
  sides: [
    side('github', '/prs[number=6]/title', 'Fix login'),
    side('gmail', '/threads[id="t1"]/subject', 'Login page broken again'),
  ],
};
const SAME_BRANCH: EvaluatedRelation = {
  name: 'same branch',
  kind: 'fact',
  op: 'equal',
  state: 'fails',
  sides: [
    side('linear', '/issues[id="A2U-5"]/branch', 'fix-login'),
    side('circleci', '/runs[id="r1"]/branch', 'main'),
  ],
};
const target = (app: string) => ({app, surface: `${app}:list`, pointer: '/entries[id="1"]'});
const cell = (value: unknown, rest: Partial<CellObject> = {}): CellObject => ({
  value,
  contributed: 1,
  of: 1,
  absent: [],
  ...rest,
});
const JOIN_CELLS: Record<string, CellObject> = {
  plain: cell(899, {target: target('github')}),
  partial: cell(1299, {
    contributed: 2,
    of: 3,
    absent: ['github:list'],
    target: target('github'),
  }),
  confirmed: cell('In Progress', {
    join: {mark: 'none', apps: ['linear'], evidence: [SAME_PR]},
    target: target('linear'),
  }),
  guessed: cell('Login page broken again', {
    join: {mark: 'guessed', apps: ['gmail'], evidence: [SAME_ISSUE]},
    target: target('gmail'),
  }),
  broken: cell('failed', {
    join: {mark: 'broken', apps: ['circleci'], evidence: [SAME_BRANCH]},
    target: target('circleci'),
  }),
  partialGuessed: cell('2026-09-18T14:05:00Z', {
    contributed: 1,
    of: 2,
    absent: ['github:list'],
    join: {mark: 'guessed', apps: ['github', 'gmail'], evidence: [SAME_ISSUE]},
    target: target('gmail'),
  }),
  absent: cell(undefined, {
    contributed: 0,
    of: 1,
    absent: ['linear:list'],
    join: {mark: 'none', apps: ['linear'], evidence: [{...SAME_PR, state: 'absent'}]},
    target: target('linear'),
  }),
  noTarget: cell(undefined, {
    contributed: 0,
    of: 0,
    join: {mark: 'none', apps: [], evidence: []},
  }),
  failed: cell('Failed', {target: target('circleci')}),
  failedGuessed: cell('Failed', {
    join: {mark: 'guessed', apps: ['circleci'], evidence: [SAME_ISSUE]},
    target: target('circleci'),
  }),
  handle: cell(8, {target: target('github')}),
};
const JOIN_LABELS: Record<string, string> = {
  plain: 'no match claim',
  partial: 'partial, 2 of 3',
  confirmed: 'confirmed',
  guessed: 'guessed',
  broken: 'broken',
  partialGuessed: 'partial + guessed',
  absent: 'absent, claimed',
  noTarget: 'the empty cell (0 of 0)',
  failed: 'danger, confirmed',
  failedGuessed: 'danger, guessed',
  handle: 'a handle, prefix #',
};
/** Per cell, what the Synthesizer would have written beside `cell` (task 7.16). */
const JOIN_PROPS: Record<string, Record<string, unknown>> = {
  partialGuessed: {format: {kind: 'datetime'}},
  broken: {danger: ['Failed']},
  failed: {danger: ['Failed']},
  failedGuessed: {danger: ['Failed']},
  handle: {format: {kind: 'text', prefix: '#'}},
};
const JOIN_TREE: TreeComponent[] = [
  {id: 'root', component: 'DataList', children: Object.keys(JOIN_CELLS).map(k => `i-${k}`)},
  ...Object.keys(JOIN_CELLS).flatMap(key => [
    {id: `i-${key}`, component: 'DataListItem', label: JOIN_LABELS[key]!, child: `v-${key}`},
    {
      id: `v-${key}`,
      component: 'DerivedValue',
      cell: {path: `/cells/${key}`},
      ...JOIN_PROPS[key],
    },
  ]),
];
const JOIN_DATA = {cells: JOIN_CELLS};

function JoinMatrix() {
  return (
    <section style={{display: 'grid', gap: 12}}>
      <h3 style={{font: '600 12px sans-serif', opacity: 0.8, margin: '12px 0 0'}}>
        DerivedValue · join
      </h3>
      <Tree components={JOIN_TREE} data={JOIN_DATA} />
    </section>
  );
}

/* ── Columns and the scoping proof ──────────────────────────────────────────── */

function Column({title, children}: {title: string; children: ReactNode}) {
  return (
    <section style={{flex: 1, minWidth: 360, padding: 16}}>
      <h2 style={{font: '600 14px sans-serif', opacity: 0.7}}>{title}</h2>
      {children}
    </section>
  );
}

function Everything() {
  return (
    <div style={{display: 'grid', gap: 16}}>
      <Timeline />
      <JoinMatrix />
      <SlotMatrix />
      <FailureMatrix />
      <ReservedColumnMatrix />
      <PressMatrix />
      <CatalogMatrix />
    </div>
  );
}

const PROOF: TreeComponent[] = [
  {id: 'root', component: 'Card', child: 'col'},
  {id: 'col', component: 'Column', children: ['h', 'p', 'b']},
  {id: 'h', component: 'Text', variant: 'h4', text: 'Same tree, two hosts'},
  {
    id: 'p',
    component: 'Text',
    text: 'Each Provider reads its own host Theme through its own scoped sheet.',
  },
  {id: 'b', component: 'Button', variant: 'primary', child: 'bl', action: {event: {name: 'go'}}},
  {id: 'bl', component: 'Text', text: 'Primary'},
];

/** Two Providers under two host Themes in one document: different accent, different appearance, no leakage either way. */
function ScopingProof() {
  return (
    <section style={{padding: 16}}>
      <h2 style={{font: '600 14px sans-serif', opacity: 0.7}}>
        scoping proof — one document, two host Themes, each Provider follows its own
      </h2>
      <div style={{display: 'flex', gap: 16}}>
        <Theme appearance="light" accentColor="tomato" style={{flex: 1}}>
          <Provider>
            <Tree components={PROOF} data={{}} />
          </Provider>
        </Theme>
        <Theme appearance="dark" accentColor="grass" style={{flex: 1, padding: 12}}>
          <Provider>
            <Tree components={PROOF} data={{}} />
          </Provider>
        </Theme>
      </div>
    </section>
  );
}

function App() {
  const [show, setShow] = useState<'all' | 'light' | 'dark' | 'bare'>('all');
  const columns = {
    light: (
      <Theme appearance="light" accentColor="indigo" style={{flex: 1}}>
        <Column title="Radix light">
          <Provider>
            <Everything />
          </Provider>
        </Column>
      </Theme>
    ),
    dark: (
      <Theme appearance="dark" accentColor="indigo" style={{flex: 1}}>
        <Column title="Radix dark">
          <Provider>
            <Everything />
          </Provider>
        </Column>
      </Theme>
    ),
    bare: (
      <div style={{flex: 1, background: '#fff', color: '#111'}}>
        <Column title="no host Theme — the Provider's own">
          <Provider>
            <Everything />
          </Provider>
        </Column>
      </div>
    ),
  };
  return (
    <>
      <nav style={{padding: '8px 16px', display: 'flex', gap: 8, font: '12px sans-serif'}}>
        {(['all', 'light', 'dark', 'bare'] as const).map(key => (
          <button key={key} onClick={() => setShow(key)} disabled={show === key}>
            {key}
          </button>
        ))}
      </nav>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          fontFamily: 'sans-serif',
          alignItems: 'flex-start',
        }}
      >
        {(show === 'all' || show === 'light') && columns.light}
        {(show === 'all' || show === 'dark') && columns.dark}
        {(show === 'all' || show === 'bare') && columns.bare}
      </div>
      <ScopingProof />
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
