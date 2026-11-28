/**
 * A surface that mixes catalogs, drawn (task-21.14 decisions 1, 2, 12): each component inside its
 * own catalog's Provider and mark wherever it sits in the tree, a frame at every change of
 * catalog, the basic catalog's a mark and no Provider, a run of one catalog sharing one frame; a
 * surface naming no default catalog drawn in the catalogs its components name; a create carrying
 * its components and data inline drawn.
 */
import {describe, expect, it} from 'vitest';
import {z} from 'zod';
import {render, waitFor} from '@testing-library/react';
import type {ReactNode} from 'react';
import {Catalog, componentId, MessageProcessor} from '@a2ui/web_core/v1_0';
import type {AgentToRendererMessage} from '@a2ui/web_core/v1_0';
import {basicCatalog} from '@a2ui/web_core/catalogs/basic/v1';
import {createComponentImplementation, type ReactCatalogComponent} from '@a2ui/react';
import {CatalogProvider, SurfaceFrame} from './CatalogContext';
import {resolveCatalog, type ResolvedCatalog} from './clientCatalogs';
import {BUILD_ATTRIBUTE, FRAME_ATTRIBUTE} from './host';

const msg = (m: Record<string, unknown>): AgentToRendererMessage =>
  ({version: '1.0', ...m}) as unknown as AgentToRendererMessage;

/** A test catalog of a box holding children and a label, each drawn in React. */
function testCatalog(id: string): Catalog<ReactCatalogComponent> {
  const Box = createComponentImplementation(
    {name: 'Box', schema: z.object({children: z.array(componentId())})},
    ({props, buildChild}) => (
      <div data-box={id}>{props.children.map(child => buildChild(child))}</div>
    ),
  );
  const Label = createComponentImplementation(
    {name: 'Label', schema: z.object({text: z.string()})},
    ({props}) => <span data-label={id}>{props.text}</span>,
  );
  return new Catalog<ReactCatalogComponent>(id, '1.0', [Box, Label], []);
}

/** A build of a test catalog, its Provider marking what it wraps. */
function build(id: string, artifact: string): ResolvedCatalog {
  const Provider = ({children}: {children: ReactNode}) => (
    <section data-provider={id}>{children}</section>
  );
  return resolveCatalog(testCatalog(id), Provider, artifact);
}

const A = build('urn:catalog:a', 'sha256-a');
const B = build('urn:catalog:b', 'sha256-b');
const BASIC = resolveCatalog(basicCatalog);

function drawn(messages: AgentToRendererMessage[], surfaceId = 's') {
  const processor = new MessageProcessor<ReactCatalogComponent>(
    [A.catalog, B.catalog, basicCatalog],
    undefined,
    {version: '1.0'},
  );
  processor.processMessages(messages);
  const surface = processor.model.getSurface(surfaceId)!;
  return render(
    <CatalogProvider catalogs={[A, B, BASIC]}>
      <SurfaceFrame surface={surface} />
    </CatalogProvider>,
  );
}

/** The catalogs whose frames enclose an element, the nearest first. */
function framesAround(element: Element): string[] {
  const frames: string[] = [];
  for (let at = element.parentElement; at; at = at.parentElement) {
    const frame = at.getAttribute(FRAME_ATTRIBUTE);
    if (frame !== null) frames.push(frame);
  }
  return frames;
}

/** The Providers that enclose an element, the nearest first. */
function providersAround(element: Element): string[] {
  const providers: string[] = [];
  for (let at = element.parentElement; at; at = at.parentElement) {
    const provider = at.getAttribute('data-provider');
    if (provider !== null) providers.push(provider);
  }
  return providers;
}

describe('a surface that mixes catalogs', () => {
  const MIXED = [
    msg({createSurface: {surfaceId: 's', catalogId: A.id}}),
    msg({
      updateComponents: {
        surfaceId: 's',
        components: [
          {id: 'root', component: 'Box', children: ['own', 'other', 'basic']},
          {id: 'own', component: 'Label', text: 'in a'},
          {id: 'other', component: 'Box', children: ['inner', 'back'], '@catalogId': B.id},
          {id: 'inner', component: 'Label', text: 'in b', '@catalogId': B.id},
          {id: 'back', component: 'Label', text: 'a inside b'},
          {id: 'basic', component: 'Text', text: 'in basic', '@catalogId': BASIC.id},
        ],
      },
    }),
  ];

  it('draws each component inside its own catalog’s Provider and mark, a frame at every change of catalog', async () => {
    const {container, findByText} = drawn(MIXED);
    const own = await findByText('in a');
    const inner = await findByText('in b');
    const back = await findByText('a inside b');
    // The surface's own catalog: the surface's frame, its build's mark and Provider.
    expect(framesAround(own)).toEqual([]);
    expect(providersAround(own)).toEqual([A.id]);
    expect(own.closest(`[${BUILD_ATTRIBUTE}="sha256-a"]`)).not.toBeNull();
    // A run of the second catalog shares one frame: its Provider inside its mark, its build named.
    expect(framesAround(inner)).toEqual([B.id]);
    expect(providersAround(inner)).toEqual([B.id, A.id]);
    const frame = inner.closest(`[${FRAME_ATTRIBUTE}]`) as HTMLElement;
    expect(frame.getAttribute(BUILD_ATTRIBUTE)).toBe('sha256-b');
    expect(frame.style.display).toBe('contents');
    // Back in the surface's catalog inside the second: a frame of its own again.
    expect(framesAround(back)).toEqual([A.id, B.id]);
    expect(providersAround(back)).toEqual([A.id, B.id, A.id]);
    await waitFor(() => expect(container).toHaveTextContent('in basic'));
    const basic = container.querySelector(`[${FRAME_ATTRIBUTE}="${BASIC.id}"]`)!;
    expect(basic).not.toBeNull();
    expect(basic).toHaveTextContent('in basic');
    // The basic catalog takes a mark and no Provider, and names no build.
    expect(basic.hasAttribute(BUILD_ATTRIBUTE)).toBe(false);
    expect(basic.querySelector('[data-provider]')).toBeNull();
  });

  it('draws a surface painted in one catalog with no frame inside it', async () => {
    const {container, findByText} = drawn([
      msg({createSurface: {surfaceId: 's', catalogId: A.id}}),
      msg({
        updateComponents: {
          surfaceId: 's',
          components: [
            {id: 'root', component: 'Box', children: ['one']},
            {id: 'one', component: 'Label', text: 'only a'},
          ],
        },
      }),
    ]);
    await findByText('only a');
    expect(container.querySelector(`[${FRAME_ATTRIBUTE}]`)).toBeNull();
  });

  it('frames a root in another catalog than the surface’s default', async () => {
    const {findByText} = drawn([
      msg({createSurface: {surfaceId: 's', catalogId: A.id}}),
      msg({
        updateComponents: {
          surfaceId: 's',
          components: [
            {id: 'root', component: 'Box', children: ['one'], '@catalogId': B.id},
            {id: 'one', component: 'Label', text: 'b at the root', '@catalogId': B.id},
          ],
        },
      }),
    ]);
    const label = await findByText('b at the root');
    expect(framesAround(label)).toEqual([B.id]);
    expect(providersAround(label)).toEqual([B.id, A.id]);
  });

  it('draws a surface naming no default catalog in the catalogs its components name', async () => {
    const {findByText} = drawn([
      msg({createSurface: {surfaceId: 's'}}),
      msg({
        updateComponents: {
          surfaceId: 's',
          components: [
            {id: 'root', component: 'Box', children: ['one'], '@catalogId': B.id},
            {id: 'one', component: 'Label', text: 'no default', '@catalogId': B.id},
          ],
        },
      }),
    ]);
    const label = await findByText('no default');
    expect(framesAround(label)).toEqual([B.id]);
    expect(providersAround(label)).toEqual([B.id]);
  });

  it('draws a create carrying its components and data inline', async () => {
    const {container} = drawn([
      msg({
        createSurface: {
          surfaceId: 's',
          catalogId: BASIC.id,
          components: [{id: 'root', component: 'Text', text: {'@path': '/greeting'}}],
          dataModel: {greeting: 'carried inline'},
        },
      }),
    ]);
    await waitFor(() => expect(container).toHaveTextContent('carried inline'));
  });
});
