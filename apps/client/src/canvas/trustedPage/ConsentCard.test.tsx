import {fireEvent, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import type {IndexEntry} from '@a2uiverse/sdk';
import {renderWithShell} from '../../../tests/helpers';
import {ConsentCard, SlotConsentCard} from './ConsentCard';

const SHOP_B = {
  appId: 'shop-b',
  publisher: 'northlight',
  card: {
    name: 'Shop B',
    description: 'Northlight Cameras, a high-volume online retailer.',
    version: '1.0.0',
    securitySchemes: {key: {type: 'apiKey', in: 'header', name: 'X-Key'}},
    security: [{key: []}],
  },
} as unknown as IndexEntry;

const CIRCLECI = {
  appId: 'circleci',
  publisher: 'a2uiverse-apps',
  card: {
    name: 'CircleCI',
    description: 'Your pipelines.',
    version: '2.0.0',
    securitySchemes: {
      oauth: {
        type: 'oauth2',
        flows: {
          authorizationCode: {
            authorizationUrl: 'https://example.com/a',
            tokenUrl: 'https://example.com/t',
            scopes: {'write:workflows': 'Rerun and cancel your workflows'},
          },
        },
      },
    },
    security: [{oauth: ['write:workflows']}],
  },
} as unknown as IndexEntry;

function anchor(): HTMLElement {
  const button = document.createElement('button');
  button.textContent = 'Install';
  document.body.append(button);
  return button;
}

describe('the consent card over a slot (task-15.9 decision 2)', () => {
  it('is the Store’s card, its words and presses unchanged, floating from the press', () => {
    const onConfirm = vi.fn();
    renderWithShell(
      <SlotConsentCard
        ask={{kind: 'install', entry: SHOP_B}}
        anchor={anchor()}
        onConfirm={onConfirm}
        onCancel={() => {}}
      />,
    );
    const card = screen.getByRole('dialog', {name: 'Install Shop B?'});
    expect(card).toHaveTextContent('by northlight');
    expect(card).toHaveTextContent('Northlight Cameras, a high-volume online retailer.');
    expect(card).toHaveTextContent(
      'The first time you use it, Shop B will ask you to connect with a key.',
    );
    fireEvent.click(screen.getByRole('button', {name: 'Install'}));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('Cancel, and Escape, count as Cancel', () => {
    const onCancel = vi.fn();
    renderWithShell(
      <SlotConsentCard
        ask={{kind: 'install', entry: SHOP_B}}
        anchor={anchor()}
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );
    fireEvent.click(screen.getByRole('button', {name: 'Cancel'}));
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole('dialog'), {key: 'Escape'});
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('an update that asks for more names only what is new, with Not now and Update', () => {
    const onCancel = vi.fn();
    renderWithShell(
      <SlotConsentCard
        ask={{
          kind: 'update',
          entry: CIRCLECI,
          news: {newScopes: [{scheme: 'oauth', scopes: ['write:workflows']}], newLook: false},
        }}
        anchor={anchor()}
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );
    const card = screen.getByRole('dialog', {name: 'Update CircleCI?'});
    expect(card).toHaveTextContent(
      'This version asks for more. The next time you use it, CircleCI will also ask to be able to',
    );
    expect(card).toHaveTextContent('Rerun and cancel your workflows');
    expect(screen.getByRole('button', {name: 'Update'})).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Not now'}));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('keeps its press where it is on screen while a paint above moves it (task-15.11 decision 23)', () => {
    const watching = new Map<Element, ResizeObserverCallback>();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private readonly callback: ResizeObserverCallback) {}
        observe(target: Element) {
          watching.set(target, this.callback);
        }
        unobserve() {}
        disconnect() {}
      },
    );
    const scroll = document.createElement('div');
    scroll.dataset.testid = 'canvas-scroll';
    const stage = document.createElement('div');
    stage.dataset.testid = 'canvas-stage-content';
    const press = document.createElement('button');
    scroll.append(stage);
    stage.append(press);
    document.body.append(scroll);
    let top = 200;
    press.getBoundingClientRect = () => ({top}) as DOMRect;
    renderWithShell(
      <SlotConsentCard
        ask={{kind: 'install', entry: SHOP_B}}
        anchor={press}
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    // The merged view lands above: the press drops 320 px, the scroll follows it back.
    top = 520;
    press.getBoundingClientRect = () => ({top: top - scroll.scrollTop}) as DOMRect;
    watching.get(stage)!([], {} as ResizeObserver);
    expect(scroll.scrollTop).toBe(320);
    expect(press.getBoundingClientRect().top).toBe(200);
    vi.unstubAllGlobals();
    scroll.remove();
  });

  it('draws nothing with nothing asked', () => {
    renderWithShell(
      <SlotConsentCard ask={null} anchor={null} onConfirm={() => {}} onCancel={() => {}} />,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('the consent card on the trusted page', () => {
  it('stays the centred card, an update naming what is new', () => {
    renderWithShell(
      <ConsentCard
        ask={{
          kind: 'update',
          entry: CIRCLECI,
          news: {newScopes: [{scheme: 'oauth', scopes: ['write:workflows']}], newLook: true},
        }}
        onConfirm={() => {}}
        onClose={() => {}}
      />,
    );
    const card = screen.getByRole('alertdialog', {name: 'Update CircleCI?'});
    expect(card).toHaveTextContent('Rerun and cancel your workflows');
    expect(card).toHaveTextContent('It also brings a new look for its answers.');
  });
});
