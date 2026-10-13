/**
 * The trusted page in the address (phase-14 decision 11, task-14.2 decision 17, task-14.7
 * decision 4, task-14.9 decision 7): its destination, the Store's query, its publisher filter, an
 * app and Publish's form, beside whatever else the address carries.
 */
import {describe, expect, it} from 'vitest';
import {addressOf, pageOfAddress} from './address';

const at = (search: string) => new URL(`https://x.example/${search}`);

describe('pageOfAddress', () => {
  it('reads each destination', () => {
    expect(pageOfAddress(at('?page=store'))).toEqual({page: 'store'});
    expect(pageOfAddress(at('?page=library'))).toEqual({page: 'appLibrary'});
    expect(pageOfAddress(at('?page=publish'))).toEqual({page: 'publish'});
  });

  it('reads the Store’s query and an app in the Store or the App Library', () => {
    expect(pageOfAddress(at('?page=store&q=flight+booking'))).toEqual({
      page: 'store',
      query: 'flight booking',
    });
    expect(pageOfAddress(at('?page=store&app=gmail'))).toEqual({page: 'store', app: 'gmail'});
    expect(pageOfAddress(at('?page=library&app=linear'))).toEqual({
      page: 'appLibrary',
      app: 'linear',
    });
  });

  it('reads the Store filtered on one publisher, with a query and an app beside it', () => {
    expect(pageOfAddress(at('?page=store&publisher=a2uiverse-apps'))).toEqual({
      page: 'store',
      publisher: 'a2uiverse-apps',
    });
    expect(pageOfAddress(at('?page=store&q=mail&publisher=acme&app=gmail'))).toEqual({
      page: 'store',
      query: 'mail',
      publisher: 'acme',
      app: 'gmail',
    });
    expect(pageOfAddress(at('?page=library&publisher=acme'))).toEqual({page: 'appLibrary'});
  });

  it('is no page with none in the address, or one it does not know', () => {
    expect(pageOfAddress(at(''))).toBeNull();
    expect(pageOfAddress(at('?beat=27'))).toBeNull();
    expect(pageOfAddress(at('?page=settings'))).toBeNull();
  });

  it('keeps Publish bare: a query or an app on it is not read', () => {
    expect(pageOfAddress(at('?page=publish&q=x&app=y'))).toEqual({page: 'publish'});
  });

  it("reads Publish's form: a new app's, or an update's to the app beside it", () => {
    expect(pageOfAddress(at('?page=publish&form=new'))).toEqual({page: 'publish', form: true});
    expect(pageOfAddress(at('?page=publish&form=update&app=linear'))).toEqual({
      page: 'publish',
      form: true,
      app: 'linear',
    });
    expect(pageOfAddress(at('?page=publish&form=new&app=linear'))).toEqual({
      page: 'publish',
      form: true,
    });
    expect(pageOfAddress(at('?page=publish&form=update'))).toEqual({page: 'publish', form: true});
    expect(pageOfAddress(at('?page=publish&form=other'))).toEqual({page: 'publish'});
    expect(pageOfAddress(at('?page=store&form=new'))).toEqual({page: 'store'});
  });
});

describe('addressOf', () => {
  it('writes the page into the address, keeping what else it carries', () => {
    expect(addressOf({page: 'store', query: 'flight booking'}, at('?beat=gap&instant'))).toBe(
      '/?beat=gap&instant=&page=store&q=flight+booking',
    );
    expect(addressOf({page: 'appLibrary', app: 'linear'}, at(''))).toBe(
      '/?page=library&app=linear',
    );
  });

  it("writes Publish's form, and the app for an update", () => {
    expect(addressOf({page: 'publish', form: true}, at(''))).toBe('/?page=publish&form=new');
    expect(addressOf({page: 'publish', form: true, app: 'linear'}, at(''))).toBe(
      '/?page=publish&form=update&app=linear',
    );
    expect(addressOf({page: 'publish', app: 'linear'}, at(''))).toBe('/?page=publish');
    expect(addressOf({page: 'store', form: true}, at(''))).toBe('/?page=store');
  });

  it('replaces the page already there', () => {
    expect(addressOf({page: 'publish'}, at('?page=store&q=x&app=y'))).toBe('/?page=publish');
    expect(addressOf({page: 'store'}, at('?page=publish&form=update&app=x'))).toBe('/?page=store');
    expect(addressOf({page: 'store'}, at('?page=store&publisher=acme'))).toBe('/?page=store');
  });

  it('takes the page out for none, leaving the rest', () => {
    expect(addressOf(null, at('?beat=gap&page=store&q=x'))).toBe('/?beat=gap');
    expect(addressOf(null, at('?page=store'))).toBe('/');
  });

  it('round-trips', () => {
    for (const page of [
      {page: 'store' as const},
      {page: 'store' as const, query: 'a & b'},
      {page: 'store' as const, app: 'shop-a'},
      {page: 'store' as const, publisher: 'acme', query: 'mail', app: 'gmail'},
      {page: 'appLibrary' as const, app: 'gmail'},
      {page: 'publish' as const},
      {page: 'publish' as const, form: true},
      {page: 'publish' as const, form: true, app: 'linear'},
    ]) {
      expect(pageOfAddress(new URL(addressOf(page, at('')), 'https://x.example'))).toEqual(page);
    }
  });
});
