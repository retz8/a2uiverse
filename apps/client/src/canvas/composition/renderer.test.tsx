/**
 * What the client takes from `@a2ui/react`'s renderer where a fragment holds what it cannot draw
 * — a child still on its way, a type the catalog does not have, a child reference the renderer
 * cannot resolve: nothing is drawn there, the rest of the fragment stands, and the surface's
 * errors reach the console (task-21.5 decisions 4, 5). Beside it, the radio groups of two pickers
 * sharing a component id, which upstream fixed (#2447): two surfaces on one canvas is the
 * precondition for both, which is why they are pinned here rather than in a vendor's own suite.
 */
import {afterEach, beforeEach, describe, it, expect, vi, type MockInstance} from 'vitest';
import {z} from 'zod';
import {act, fireEvent, render, waitFor, within} from '@testing-library/react';
import {Catalog, componentId, MessageProcessor} from '@a2ui/web_core/v1_0';
import type {AgentToRendererMessage} from '@a2ui/web_core/v1_0';
import {basicCatalog} from '@a2ui/web_core/catalogs/basic/v1';
import {createComponentImplementation, type ReactCatalogComponent} from '@a2ui/react';
import {CATALOG_ID as SHELL_CATALOG_ID, createCatalog} from '@a2uiverse/shell-catalog';
import {logSurfaceErrors} from '../../a2ui/surfaceErrors';
import {CatalogProvider, SurfaceFrame} from '../../catalogs/CatalogContext';
import {clientCatalogs} from '../../catalogs/clientCatalogs';

const SHELL_CATALOG = createCatalog({onShellAction: () => {}});

const CATALOGS = clientCatalogs();

const msg = (m: Record<string, unknown>): AgentToRendererMessage =>
  ({version: '1.0', ...m}) as unknown as AgentToRendererMessage;

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
  {name: 'LooseHolder', schema: z.object({target: z.string()})},
  ({props, buildChild}) => <section>{buildChild(props.target)}</section>,
);
const Label = createComponentImplementation(
  {name: 'Label', schema: z.object({text: z.string()})},
  ({props}) => <p>{props.text}</p>,
);
const Stack = createComponentImplementation(
  {name: 'Stack', schema: z.object({children: z.array(componentId())})},
  ({props, buildChild}) => <div>{props.children.map(child => buildChild(child))}</div>,
);
const UNDRAWABLE = new Catalog<ReactCatalogComponent>(
  'urn:catalog:undrawable',
  '1.0',
  [Holder, LooseHolder, Label, Stack],
  [],
);

/** A fragment beside each of the three things the renderer cannot draw. */
function undrawable() {
  const processor = new MessageProcessor<ReactCatalogComponent>([UNDRAWABLE]);
  logSurfaceErrors(processor);
  processor.processMessages([
    msg({createSurface: {surfaceId: 'github:mixed', catalogId: UNDRAWABLE.id}}),
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
          {id: 'loose', component: 'LooseHolder', target: 'known'},
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

describe('where the renderer cannot draw a component (task-21.5 decisions 4, 5)', () => {
  let logged: MockInstance<typeof console.error>;
  beforeEach(() => {
    logged = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    logged.mockRestore();
  });
  /** What the client wrote to the console for the surface, by its error code. */
  const surfaceErrors = () =>
    logged.mock.calls
      .filter(([tag]) => tag === '[A2UI:surface]')
      .map(([, error]) => error as {code: string; message: string; surfaceId?: string});

  it('draws nothing in all three places, the rest of the fragment standing', () => {
    const {container} = undrawable();

    // The fragment stays up: the known part drawn, and nothing beside it a person would read.
    expect(container.textContent).toBe('Pull requests');
    expect(container.querySelectorAll('p')).toHaveLength(1);
    // The pending child and the unresolved reference leave their holders empty; the unknown type
    // leaves no element at all.
    const holders = container.querySelectorAll('section');
    expect(holders).toHaveLength(2);
    for (const holder of holders) expect(holder.childNodes).toHaveLength(0);
  });

  it('writes the unknown type and the unresolved reference to the console, not the pending child', async () => {
    undrawable();
    await waitFor(() => expect(surfaceErrors()).toHaveLength(2));
    const [unknown, unresolved] = [...surfaceErrors()].sort((a, b) => a.code.localeCompare(b.code));
    expect(unknown).toMatchObject({code: 'UNKNOWN_COMPONENT_TYPE', surfaceId: 'github:mixed'});
    expect(unknown!.message).toContain('HolographicTable');
    expect(unresolved).toMatchObject({
      code: 'UNRESOLVED_CHILD_REFERENCE',
      surfaceId: 'github:mixed',
    });
    expect(unresolved!.message).toContain("'known'");
  });

  it('draws a pending child once it arrives', async () => {
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
    expect(container.textContent).toBe('');

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
    expect(container.textContent).toBe('Here now');
  });
});
