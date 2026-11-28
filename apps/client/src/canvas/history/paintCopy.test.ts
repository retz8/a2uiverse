import {describe, expect, it} from 'vitest';
import {Catalog, ComponentModel, MessageProcessor} from '@a2ui/web_core/v1_0';
import {basicCatalog} from '@a2ui/web_core/catalogs/basic/v1';
import {BASIC_CATALOG_SCHEMA, createSchemaFormCheck} from '@a2uiverse/sdk';
import {capturePaint, rebuildMessages, type CopySource} from './paintCopy';

/** The catalog the surface's components were drawn in. */
const CATALOG = new Catalog('https://example.test/catalog.json', '1.0', [], []);

/** A live surface of real component models, as the processor holds them. */
function sourceOf(components: ComponentModel[]): CopySource {
  const surface = {
    defaultCatalog: CATALOG,
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
    const icon = new ComponentModel(
      'row-status',
      'StatusIcon',
      {status: {'@path': 'status'}, type: {'@path': 'statusType'}},
      CATALOG,
    );
    const copy = capturePaint(sourceOf([icon]), 'linear:linear-1')!;
    const [, update] = rebuildMessages(copy) as unknown as [
      unknown,
      {updateComponents: {components: unknown[]}},
    ];
    expect(update.updateComponents.components).toEqual([
      {
        id: 'row-status',
        component: 'StatusIcon',
        status: {'@path': 'status'},
        type: {'@path': 'statusType'},
      },
    ]);
  });

  it('is detached from the live models it was taken from', () => {
    const text = new ComponentModel('title', 'Text', {text: {'@path': 'title'}}, CATALOG);
    const copy = capturePaint(sourceOf([text]), 'linear:linear-1')!;
    text.properties = {text: 'changed'};
    expect(copy.tree['title']).toEqual({
      id: 'title',
      component: 'Text',
      text: {'@path': 'title'},
    });
  });

  it('is rebuilt in v1.0’s forms: its three messages hold to the schema-form check (task-21.14 decision 13)', () => {
    const processor = new MessageProcessor([basicCatalog], undefined, {version: '1.0'});
    processor.processMessages([
      {
        version: '1.0',
        createSurface: {surfaceId: 's', catalogId: basicCatalog.id, sendDataModel: true},
      },
      {
        version: '1.0',
        updateComponents: {
          surfaceId: 's',
          components: [
            {id: 'root', component: 'Column', children: ['title', 'more']},
            {id: 'title', component: 'Text', text: {'@path': '/title'}},
            {
              id: 'more',
              component: 'Text',
              text: 'more',
              '@catalogId': basicCatalog.id,
              '@accessibility': {label: 'More'},
            },
          ],
        },
      },
      {version: '1.0', updateDataModel: {surfaceId: 's', value: {title: 'Issues'}}},
    ]);
    const messages = rebuildMessages(capturePaint(processor, 's')!);
    const check = createSchemaFormCheck({catalog: BASIC_CATALOG_SCHEMA});
    expect(check.agentToRenderer(messages)).toEqual([]);
  });
});
