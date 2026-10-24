/**
 * The local patch to `@a2ui/react` 0.14.0's renderer (`patches/@a2ui__react@0.14.0.patch`; task-16.7
 * decision 1): where a component cannot be drawn — a child still on its way, a type the catalog
 * does not have, a child reference the renderer cannot resolve — it draws a quiet stand-in, never
 * the developer text upstream draws. Beside it, the radio groups of two pickers sharing a
 * component id, which upstream fixed (#2447): two surfaces on one canvas is the precondition for
 * both, which is why they are pinned here rather than in a vendor's own suite.
 */
import {describe, it, expect} from 'vitest';
import {z} from 'zod';
import {act, fireEvent, render, waitFor, within} from '@testing-library/react';
import {Catalog, componentId, MessageProcessor} from '@a2ui/web_core/v0_9';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';
import {basicCatalog} from '@a2ui/web_core/v0_9/basic_catalog';
import {createComponentImplementation, type ReactCatalogComponent} from '@a2ui/react/v0_9';
import {CATALOG_ID as SHELL_CATALOG_ID, createCatalog} from '@a2uiverse/shell-catalog';
import {CatalogProvider, SurfaceFrame} from '../../catalogs/CatalogContext';
import {clientCatalogs} from '../../catalogs/clientCatalogs';

const SHELL_CATALOG = createCatalog({onShellAction: () => {}});

const CATALOGS = clientCatalogs();

const msg = (m: Record<string, unknown>): A2uiMessage =>
  ({version: 'v0.9', ...m}) as unknown as A2uiMessage;

/** Two surfaces whose pickers share a component id — the spec guarantees ids are surface-scoped. */
function twoPickers(catalog: Catalog<ReactCatalogComponent>, app: string) {
  const processor = new MessageProcessor<ReactCatalogComponent>([catalog]);
  for (const surfaceId of [`${app}:a`, `${app}:b`]) {
    processor.processMessages([
      msg({createSurface: {surfaceId, catalogId: catalog.id}}),
      msg({
        updateComponents: {
          surfaceId,
          components: [
            {
              id: 'picker',
              component: 'ChoicePicker',
              label: 'Pick',
              variant: 'mutuallyExclusive',
              value: {path: '/picked'},
              options: [
                {label: 'A', value: 'a'},
                {label: 'B', value: 'b'},
              ],
            },
          ],
        },
      }),
      msg({
        updateComponents: {
          surfaceId,
          components: [{id: 'root', component: 'Column', children: ['picker']}],
        },
      }),
    ]);
  }
  return processor;
}

describe('ChoicePicker radio groups (upstream #2447)', () => {
  it('two surfaces sharing a component id do not join one document-wide radio group', async () => {
    const processor = twoPickers(basicCatalog, 'basic');
    const {container} = render(
      <CatalogProvider catalogs={CATALOGS}>
        <div data-testid="a">
          <SurfaceFrame surface={processor.model.surfacesMap.get('basic:a')!} />
        </div>
        <div data-testid="b">
          <SurfaceFrame surface={processor.model.surfacesMap.get('basic:b')!} />
        </div>
      </CatalogProvider>,
    );

    const namesIn = (testId: string) =>
      new Set(
        within(container.querySelector(`[data-testid="${testId}"]`) as HTMLElement)
          .getAllByRole('radio')
          .map(r => (r as HTMLInputElement).name),
      );

    // Upstream's basic catalog is custom elements, which draw after they are connected.
    await waitFor(() => expect(namesIn('b').size).toBe(1));
    const a = namesIn('a');
    const b = namesIn('b');
    // Each picker is one group…
    expect(a.size).toBe(1);
    // …and the two are different groups, so selecting in one cannot clear the other.
    expect([...a][0]).not.toBe([...b][0]);
  });

  it('the shell catalog keeps two surfaces apart too: a choice in one leaves the other alone', () => {
    const processor = twoPickers(SHELL_CATALOG, 'shell');
    const a = processor.model.surfacesMap.get('shell:a')!;
    const b = processor.model.surfacesMap.get('shell:b')!;
    a.dataModel.set('/picked', ['a']);
    b.dataModel.set('/picked', ['a']);
    const {container} = render(
      <CatalogProvider catalogs={CATALOGS}>
        <div data-testid="a">
          <SurfaceFrame surface={a} />
        </div>
        <div data-testid="b">
          <SurfaceFrame surface={b} />
        </div>
      </CatalogProvider>,
    );
    const inB = within(container.querySelector('[data-testid="b"]') as HTMLElement);
    fireEvent.click(inB.getByRole('radio', {name: 'B'}));
    expect(b.dataModel.get('/picked')).toEqual(['b']);
    expect(a.dataModel.get('/picked')).toEqual(['a']);
    const inA = within(container.querySelector('[data-testid="a"]') as HTMLElement);
    expect(inA.getByRole('radio', {name: 'A'})).toHaveAttribute('data-state', 'checked');
  });
});

/** A component holding one child, by a reference its schema marks or by a plain string. */
const Holder = createComponentImplementation(
  {name: 'Holder', schema: z.object({child: componentId()})},
  ({props, buildChild}) => <section>{buildChild(props.child)}</section>,
);
const LooseHolder = createComponentImplementation(
  {name: 'LooseHolder', schema: z.object({child: z.string()})},
  ({props, buildChild}) => <section>{buildChild(props.child)}</section>,
);
const Label = createComponentImplementation(
  {name: 'Label', schema: z.object({text: z.string()})},
  ({props}) => <p>{props.text}</p>,
);
const Stack = createComponentImplementation(
  {name: 'Stack', schema: z.object({children: z.array(componentId())})},
  ({props, buildChild}) => (
    <div>
      {props.children.map(child =>
        typeof child === 'string' ? buildChild(child) : buildChild(child.id, child.basePath),
      )}
    </div>
  ),
);
const STAND_INS = new Catalog<ReactCatalogComponent>(
  'urn:catalog:stand-ins',
  'v0.9.1',
  [Holder, LooseHolder, Label, Stack],
  [],
);

/** A fragment beside each of the three things the renderer cannot draw. */
function standIns() {
  const processor = new MessageProcessor<ReactCatalogComponent>([STAND_INS]);
  processor.processMessages([
    msg({createSurface: {surfaceId: 'github:mixed', catalogId: STAND_INS.id}}),
    msg({
      updateComponents: {
        surfaceId: 'github:mixed',
        components: [
          {id: 'root', component: 'Stack', children: ['known', 'pending', 'alien', 'loose']},
          {id: 'known', component: 'Label', text: 'Pull requests'},
          // Its child has not arrived.
          {id: 'pending', component: 'Holder', child: 'later'},
          {id: 'alien', component: 'HolographicTable'},
          // Its child exists, but nothing marks the prop as a component id.
          {id: 'loose', component: 'LooseHolder', child: 'known'},
        ],
      },
    }),
  ]);
  return render(
    <CatalogProvider catalogs={CATALOGS}>
      <SurfaceFrame surface={processor.model.surfacesMap.get('github:mixed')!} />
    </CatalogProvider>,
  );
}

describe('the stand-ins (task-16.7 decision 1)', () => {
  it('draw quiet in all three places, the rest of the fragment standing', () => {
    const {container} = standIns();

    // The fragment stays up: the known part rendered.
    expect(container.textContent).toContain('Pull requests');
    for (const kind of ['loading', 'unknown', 'unresolved']) {
      const standIn = container.querySelector<HTMLElement>(`[data-a2ui-placeholder="${kind}"]`);
      expect(standIn, kind).not.toBeNull();
      expect(standIn!.style.color, kind).not.toBe('red');
    }
    // Nothing a person would read: no component id, no developer message.
    for (const words of [
      '[Loading',
      'later',
      'Unknown component',
      'HolographicTable',
      'Unresolved',
    ])
      expect(container.textContent).not.toContain(words);
  });

  it('name the unknown type on the element and on hover', () => {
    const {container} = standIns();
    const unknown = container.querySelector('[data-a2ui-placeholder="unknown"]')!;
    expect(unknown.getAttribute('data-a2ui-component')).toBe('HolographicTable');
    expect(unknown.getAttribute('title')).toBe('Unknown component: HolographicTable');
  });

  it('stand in for a pending child until it arrives', async () => {
    const processor = new MessageProcessor<ReactCatalogComponent>([SHELL_CATALOG]);
    processor.processMessages([
      msg({createSurface: {surfaceId: 'shell:late', catalogId: SHELL_CATALOG_ID}}),
      msg({
        updateComponents: {
          surfaceId: 'shell:late',
          components: [{id: 'root', component: 'Column', children: ['later']}],
        },
      }),
    ]);
    const {container} = render(
      <CatalogProvider catalogs={CATALOGS}>
        <SurfaceFrame surface={processor.model.surfacesMap.get('shell:late')!} />
      </CatalogProvider>,
    );
    expect(container.querySelector('[data-a2ui-placeholder="loading"]')).not.toBeNull();
    expect(container.textContent).not.toContain('[Loading');

    await act(async () =>
      processor.processMessages([
        msg({
          updateComponents: {
            surfaceId: 'shell:late',
            components: [{id: 'later', component: 'Text', text: 'Here now'}],
          },
        }),
      ]),
    );
    expect(container.querySelector('[data-a2ui-placeholder]')).toBeNull();
    expect(container.textContent).toContain('Here now');
  });
});
