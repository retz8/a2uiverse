import {fireEvent, screen} from '@testing-library/react';
import {expect, test} from 'vitest';
import {renderTree} from '../../testing/render';

test('moving the thumb writes the number back to the bound path', () => {
  const {surface} = renderTree(
    [{id: 'root', component: 'Slider', label: 'Volume', min: 0, max: 10, value: {path: '/volume'}}],
    {data: {volume: 4}},
  );
  const thumb = screen.getByRole('slider');
  expect(thumb).toHaveAttribute('aria-valuenow', '4');
  thumb.focus();
  fireEvent.keyDown(thumb, {key: 'ArrowRight'});
  expect(surface.dataModel.get('/volume')).toBe(5);
  fireEvent.keyDown(screen.getByRole('slider'), {key: 'Home'});
  expect(surface.dataModel.get('/volume')).toBe(0);
});

test('renders on Radix Slider with the value shown beside the label', () => {
  const {container} = renderTree([
    {id: 'root', component: 'Slider', label: 'Volume', max: 10, value: 7},
  ]);
  expect(container.querySelector('.rt-SliderRoot')).not.toBeNull();
  expect(screen.getByText('7')).toBeInTheDocument();
  expect(screen.getByRole('slider')).toHaveAttribute('aria-valuemax', '10');
});
