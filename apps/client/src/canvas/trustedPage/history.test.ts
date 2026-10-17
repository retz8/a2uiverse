/**
 * The trusted page on the browser's history (phase-14 decision 11): opening it pushes its address,
 * a move inside it replaces that, browser Back closes it to the canvas beneath, and an address
 * carrying a page lands on it.
 */
import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {waitFor} from '@testing-library/react';
import {createTrailStore} from '../trail/trailStore';
import {bindTrustedPageHistory} from './history';

const here = () => `${window.location.pathname}${window.location.search}`;
let unbind: (() => void) | undefined;

beforeEach(() => window.history.replaceState(null, '', '/?beat=gap'));
afterEach(() => unbind?.());

describe('bindTrustedPageHistory', () => {
  it('opening the page pushes its address; a move inside it replaces it', () => {
    const trail = createTrailStore();
    unbind = bindTrustedPageHistory(trail);
    const length = window.history.length;
    trail.openTrustedPage({page: 'store', query: 'flight booking'});
    expect(here()).toBe('/?beat=gap&page=store&q=flight+booking');
    expect(window.history.length).toBe(length + 1);
    trail.openTrustedPage({page: 'appLibrary', app: 'linear'});
    expect(here()).toBe('/?beat=gap&page=library&app=linear');
    expect(window.history.length).toBe(length + 1);
  });

  it('browser Back closes the page and takes it out of the address', async () => {
    const trail = createTrailStore();
    unbind = bindTrustedPageHistory(trail);
    trail.openTrustedPage({page: 'publish'});
    window.history.back();
    await waitFor(() => expect(trail.getState().trustedPage).toBeNull());
    expect(here()).toBe('/?beat=gap');
  });

  it('closing the page goes back to the address it was opened over', async () => {
    const trail = createTrailStore();
    unbind = bindTrustedPageHistory(trail);
    trail.openTrustedPage({page: 'store'});
    trail.closeTrustedPage();
    await waitFor(() => expect(here()).toBe('/?beat=gap'));
    expect(trail.getState().trustedPage).toBeNull();
  });

  it('an address carrying a page lands on it; closing it takes the page out in place', () => {
    window.history.replaceState(null, '', '/?page=library&app=gmail');
    const trail = createTrailStore();
    const length = window.history.length;
    unbind = bindTrustedPageHistory(trail);
    expect(trail.getState().trustedPage).toEqual({page: 'appLibrary', app: 'gmail'});
    trail.closeTrustedPage();
    expect(here()).toBe('/');
    expect(window.history.length).toBe(length);
  });

  it('opening an app’s view from its list pushes the view: Back returns to the list, then closes the page (task-14.11 decision 28)', async () => {
    const trail = createTrailStore();
    unbind = bindTrustedPageHistory(trail);
    trail.openTrustedPage({page: 'store', query: 'camera'});
    trail.openTrustedPage({page: 'store', query: 'camera', app: 'shop-a'});
    expect(here()).toBe('/?beat=gap&page=store&q=camera&app=shop-a');
    window.history.back();
    await waitFor(() =>
      expect(trail.getState().trustedPage).toEqual({page: 'store', query: 'camera'}),
    );
    expect(here()).toBe('/?beat=gap&page=store&q=camera');
    window.history.back();
    await waitFor(() => expect(trail.getState().trustedPage).toBeNull());
    expect(here()).toBe('/?beat=gap');
  });

  it('the view’s own way back to its list goes back over the view’s entry', async () => {
    const trail = createTrailStore();
    unbind = bindTrustedPageHistory(trail);
    trail.openTrustedPage({page: 'appLibrary'});
    trail.openTrustedPage({page: 'appLibrary', app: 'gmail'});
    trail.openTrustedPage({page: 'appLibrary'});
    await waitFor(() => expect(here()).toBe('/?beat=gap&page=library'));
    window.history.back();
    await waitFor(() => expect(trail.getState().trustedPage).toBeNull());
    expect(here()).toBe('/?beat=gap');
  });

  it('an app’s view opened with no list behind it, or reached by a tab, replaces: Back closes the page', async () => {
    const trail = createTrailStore();
    unbind = bindTrustedPageHistory(trail);
    trail.openTrustedPage({page: 'appLibrary', app: 'gmail'});
    trail.openTrustedPage({page: 'store'});
    trail.openTrustedPage({page: 'appLibrary', app: 'linear'});
    expect(here()).toBe('/?beat=gap&page=library&app=linear');
    window.history.back();
    await waitFor(() => expect(trail.getState().trustedPage).toBeNull());
  });

  it('closing the page from a pushed view goes back over both entries', async () => {
    const trail = createTrailStore();
    unbind = bindTrustedPageHistory(trail);
    trail.openTrustedPage({page: 'store'});
    trail.openTrustedPage({page: 'store', app: 'shop-a'});
    trail.closeTrustedPage();
    await waitFor(() => expect(here()).toBe('/?beat=gap'));
    expect(trail.getState().trustedPage).toBeNull();
  });

  it('a list the address landed on, a view pushed over it: closing takes the page out of the landed entry', async () => {
    window.history.replaceState(null, '', '/?page=library');
    const trail = createTrailStore();
    unbind = bindTrustedPageHistory(trail);
    trail.openTrustedPage({page: 'appLibrary', app: 'gmail'});
    expect(here()).toBe('/?page=library&app=gmail');
    trail.closeTrustedPage();
    await waitFor(() => expect(here()).toBe('/'));
    expect(trail.getState().trustedPage).toBeNull();
  });

  it('browser Forward opens the page again', async () => {
    const trail = createTrailStore();
    unbind = bindTrustedPageHistory(trail);
    trail.openTrustedPage({page: 'store', query: 'mail'});
    window.history.back();
    await waitFor(() => expect(trail.getState().trustedPage).toBeNull());
    window.history.forward();
    await waitFor(() =>
      expect(trail.getState().trustedPage).toEqual({page: 'store', query: 'mail'}),
    );
  });
});
