import type {CSSProperties, ReactNode} from 'react';
import {createComponentImplementation} from '@a2ui/react/v0_9';
import {TabsApi} from '@a2ui/web_core/v0_9';
import {Tabs} from '@radix-ui/themes';
import {weightStyle} from '../shared/layout.js';

export interface TabEntry {
  title: string;
  content: ReactNode;
}

/**
 * `Tabs` on Radix `Tabs`: one trigger per entry, the first selected, each entry's child under its
 * own content panel — Radix mounts only the selected panel, as upstream renders only the active
 * child. Tabs are addressed by index: the schema names none.
 */
export function TabsView({tabs, style}: {tabs: TabEntry[]; style?: CSSProperties}) {
  if (tabs.length === 0) return null;
  return (
    <Tabs.Root defaultValue="0" style={style}>
      <Tabs.List>
        {tabs.map((tab, i) => (
          <Tabs.Trigger key={i} value={String(i)}>
            {tab.title}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {tabs.map((tab, i) => (
        <Tabs.Content key={i} value={String(i)} style={{paddingTop: 'var(--space-3)'}}>
          {tab.content}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}

/** Catalog entry: each tab's `title` arrives resolved; its `child` is a component id the renderer builds. */
export const TabsComponent = createComponentImplementation(TabsApi, ({props, buildChild}) => (
  <TabsView
    tabs={(props.tabs ?? []).map(tab => ({
      title: typeof tab.title === 'string' ? tab.title : String(tab.title ?? ''),
      content: buildChild(tab.child),
    }))}
    style={weightStyle(props.weight)}
  />
));
