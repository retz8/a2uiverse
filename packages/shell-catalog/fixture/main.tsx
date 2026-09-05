/**
 * Design-check fixture (task-5.9 decision 6): the whole catalog — every component in every
 * value of every enum prop, generated from `catalog.json` and rendered through the real renderer
 * from A2UI trees — under Radix light · Radix dark · no host Theme; the task 5.11 timeline
 * example as one merged view; the Slot/Attribution states; and the scoping proof (two Providers
 * under different host Themes, one document).
 */
import {StrictMode, useEffect, useMemo, useState, type ReactNode} from 'react';
import {createRoot} from 'react-dom/client';
import {Theme} from '@radix-ui/themes';
import {A2uiSurface, type ReactComponentImplementation} from '@a2ui/react/v0_9';
import {MessageProcessor, type SurfaceModel} from '@a2ui/web_core/v0_9';
import {
  resolvePointer,
  TODAY_TIMELINE,
  type SortDeclaration,
  type SynthesisExample,
} from '@a2uiverse/sdk';
import {
  AttributionView,
  CATALOG,
  CATALOG_ID,
  Provider,
  SlotContentContext,
  SlotView,
} from '../src/index.js';
import schema from '../catalogs/v0.9.1/catalog.json';
import {componentNames, sweep, type CatalogSchema, type TreeComponent} from './matrix.js';

const SCHEMA = schema as unknown as CatalogSchema;

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
function evaluateExample(example: SynthesisExample): Record<string, unknown> {
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
      components: example.output.tree.components as TreeComponent[],
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
        <SlotView name="slot-pending" label="Gmail" />
      </div>
      <div>
        <AttributionView displayName="Calendar" account={null} />
        <SlotContentContext.Provider value={() => <Fragment label="filled fragment" />}>
          <SlotView name="slot-filled" />
        </SlotContentContext.Provider>
      </div>
      <div>
        <AttributionView displayName="GitHub" account={null} />
        <SlotView name="slot-failed" state="failed" label="GitHub" />
      </div>
      <div>
        <SlotView name="slot-shell" content="shell" label="Synthesis" />
      </div>
      <div>
        collapsed (nothing should render between the rules):
        <hr />
        <SlotView name="slot-collapsed" state="collapsed" />
        <hr />
      </div>
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
      <SlotMatrix />
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
