import {render} from '@testing-library/react';
import {expect, test} from 'vitest';
import {Provider} from '../../provider';
import {ICON_GLYPHS, ICON_NAMES} from './glyphs';
import {IconView} from './icon';
import {renderTree} from '../../testing/render';

test('every name in the table renders a Radix glyph — a drawn svg, never a blank', () => {
  for (const name of ICON_NAMES) {
    const {container, unmount} = render(
      <Provider>
        <IconView name={name} />
      </Provider>,
    );
    const box = container.querySelector(`[data-icon="${name}"]`);
    expect(box, name).not.toBeNull();
    const svg = box!.querySelector('svg');
    expect(svg, name).not.toBeNull();
    expect(svg!.querySelector('path'), `${name} draws nothing`).not.toBeNull();
    expect(svg!.getAttribute('aria-hidden')).toBe('true');
    unmount();
  }
});

test('the stated-nearest entries say what they stand in with', () => {
  const nearest = ICON_NAMES.filter(name => ICON_GLYPHS[name].nearest);
  expect(nearest.length).toBeGreaterThan(0);
  for (const name of nearest) expect(ICON_GLYPHS[name].nearest).toMatch(/for want of/);
  // A direct counterpart carries no note.
  expect(ICON_GLYPHS.check.nearest).toBeUndefined();
  expect(ICON_GLYPHS.search.nearest).toBeUndefined();
});

test('{svgPath} stays an inline SVG on the 24-unit grid', () => {
  const {container} = renderTree([
    {id: 'root', component: 'Icon', name: {svgPath: 'M12 2L2 22h20z'}},
  ]);
  const svg = container.querySelector('svg[data-icon="svgPath"]')!;
  expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
  expect(svg.querySelector('path')?.getAttribute('d')).toBe('M12 2L2 22h20z');
});

test('a bound name renders its glyph; a bound name the table does not know is a question mark carrying the name', () => {
  const known = renderTree([{id: 'root', component: 'Icon', name: {path: '/icon'}}], {
    data: {icon: 'mail'},
  });
  expect(known.container.querySelector('[data-icon="mail"] svg')).not.toBeNull();
  known.unmount();
  const unknown = renderTree([{id: 'root', component: 'Icon', name: {path: '/icon'}}], {
    data: {icon: 'teapot'},
  });
  const box = unknown.container.querySelector('[data-icon="unknown"]')!;
  expect(box.getAttribute('data-icon-name')).toBe('teapot');
  expect(box.querySelector('svg path')).not.toBeNull();
});

test('renders through the real renderer from the schema name', () => {
  const {container} = renderTree([{id: 'root', component: 'Icon', name: 'warning'}]);
  expect(container.querySelector('[data-icon="warning"] svg')).not.toBeNull();
});
