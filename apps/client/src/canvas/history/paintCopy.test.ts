import {describe, expect, it} from 'vitest';
import {ComponentModel} from '@a2ui/web_core/v0_9';
import {capturePaint, rebuildMessages, type CopySource} from './paintCopy';

/** A live surface of real component models, as the processor holds them. */
function sourceOf(components: ComponentModel[]): CopySource {
  const surface = {
    catalog: {id: 'https://example.test/catalog.json'},
    sendDataModel: false,
    componentsModel: {
      get entries() {
        return new Map(components.map(c => [c.id, c] as const)).entries();
      },
    },
    dataModel: {get: () => ({issues: [{status: 'In Review', statusType: 'started'}]})},
  };
  return {model: {getSurface: id => (id === 'linear:linear-1' ? surface : undefined)}};
}

describe('a paint copy', () => {
  it('keeps a component whose own prop is named type as the component it is', () => {
    // web_core's componentTree spreads the properties over the type, so this prop replaced the
    // component's name and the restored status icon drew as an unknown component.
    const icon = new ComponentModel('row-status', 'StatusIcon', {
      status: {path: 'status'},
      type: {path: 'statusType'},
    });
    const copy = capturePaint(sourceOf([icon]), 'linear:linear-1')!;
    const [, update] = rebuildMessages(copy) as unknown as [
      unknown,
      {updateComponents: {components: unknown[]}},
    ];
    expect(update.updateComponents.components).toEqual([
      {
        id: 'row-status',
        component: 'StatusIcon',
        status: {path: 'status'},
        type: {path: 'statusType'},
      },
    ]);
  });

  it('is detached from the live models it was taken from', () => {
    const text = new ComponentModel('title', 'Text', {text: {path: 'title'}});
    const copy = capturePaint(sourceOf([text]), 'linear:linear-1')!;
    text.properties = {text: 'changed'};
    expect(copy.tree['title']).toEqual({id: 'title', component: 'Text', text: {path: 'title'}});
  });
});
