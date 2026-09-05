/**
 * Design-check matrix for the composition primitives: the sort control, every Slot
 * state and both Attribution states, under Radix light · Radix dark · no host Theme
 * (the Provider brings its own), plus the scoping proof (two wrappers, different token
 * values, side by side).
 */
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {Theme} from '@radix-ui/themes';

import {useState} from 'react';
import type {SortDeclaration} from '@a2uiverse/sdk';
import {
  Provider,
  SlotContentContext,
  SlotView,
  AttributionView,
  SortControlView,
} from '../src/index.js';

const SORT: SortDeclaration = {
  path: '/entries',
  options: [
    {key: '/when', label: 'Time'},
    {key: '/what', label: 'Title'},
    {key: '/source', label: 'Source'},
  ],
  key: '/when',
  direction: 'asc',
};

/** The sort control as the merged view places it: the criterion, user-changeable, live. */
function SortDemo() {
  const [sort, setSort] = useState<SortDeclaration>(SORT);
  return (
    <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
      <SortControlView sort={sort} onChange={setSort} />
      <code style={{fontSize: 11, opacity: 0.7}}>
        {sort.key} {sort.direction}
      </code>
    </div>
  );
}

function Fragment({label}: {label: string}) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 6,
        background: 'var(--a2ui-color-surface)',
        color: 'var(--a2ui-color-on-surface)',
        border: '1px solid var(--a2ui-color-border)',
      }}
    >
      {label} — surface over <code>--a2ui-color-primary</code>{' '}
      <span
        style={{
          background: 'var(--a2ui-color-primary)',
          color: 'var(--a2ui-color-on-primary)',
          borderRadius: 4,
          padding: '2px 8px',
        }}
      >
        primary
      </span>
    </div>
  );
}

function SlotMatrix() {
  return (
    <div style={{display: 'grid', gap: 12}}>
      <SortDemo />
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
        collapsed (nothing should render between the rules):
        <hr />
        <SlotView name="slot-collapsed" state="collapsed" />
        <hr />
      </div>
    </div>
  );
}

function Column({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <section style={{flex: 1, minWidth: 320, padding: 16}}>
      <h2 style={{font: '600 14px sans-serif', opacity: 0.7}}>{title}</h2>
      {children}
    </section>
  );
}

function ScopingProof() {
  return (
    <section style={{padding: 16}}>
      <h2 style={{font: '600 14px sans-serif', opacity: 0.7}}>
        scoping proof — same var names, different values, one document
      </h2>
      <div style={{display: 'flex', gap: 16}}>
        <div
          style={
            {'--a2ui-color-primary': '#ea4335', '--a2ui-color-on-primary': '#fff', flex: 1} as never
          }
        >
          <Fragment label="wrapper A (red primary)" />
        </div>
        <div
          style={
            {'--a2ui-color-primary': '#1a73e8', '--a2ui-color-on-primary': '#fff', flex: 1} as never
          }
        >
          <Fragment label="wrapper B (blue primary)" />
        </div>
      </div>
    </section>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div style={{display: 'flex', flexWrap: 'wrap', fontFamily: 'sans-serif'}}>
      <Theme appearance="light" accentColor="indigo" style={{flex: 1}}>
        <Column title="Radix light">
          <Provider>
            <SlotMatrix />
          </Provider>
        </Column>
      </Theme>
      <Theme appearance="dark" accentColor="indigo" style={{flex: 1}}>
        <Column title="Radix dark">
          <Provider>
            <SlotMatrix />
          </Provider>
        </Column>
      </Theme>
      <div style={{flex: 1, background: '#fff', color: '#111'}}>
        <Column title="no host Theme — the Provider's own">
          <Provider>
            <SlotMatrix />
          </Provider>
        </Column>
      </div>
    </div>
    <ScopingProof />
  </StrictMode>,
);
