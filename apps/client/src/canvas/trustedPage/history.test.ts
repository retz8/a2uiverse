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
