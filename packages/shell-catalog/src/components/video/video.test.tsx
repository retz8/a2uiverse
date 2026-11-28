import {act} from '@testing-library/react';
import {expect, test} from 'vitest';
import {renderTree} from '../../testing/render';

test('posterUrl is the player’s poster, a bound one following the data (task-21.12 decision 6)', () => {
  const {container, surface} = renderTree(
    [
      {
        id: 'root',
        component: 'Video',
        url: 'https://example.invalid/clip.mp4',
        posterUrl: {'@path': '/poster'},
      },
    ],
    {data: {poster: 'https://example.invalid/poster.png'}},
  );
  const video = container.querySelector('video')!;
  expect(video).toHaveAttribute('src', 'https://example.invalid/clip.mp4');
  expect(video).toHaveAttribute('poster', 'https://example.invalid/poster.png');
  act(() => surface.dataModel.set('/poster', 'https://example.invalid/other.png'));
  expect(container.querySelector('video')).toHaveAttribute(
    'poster',
    'https://example.invalid/other.png',
  );
});

test('a Video with no posterUrl draws no poster', () => {
  const {container} = renderTree([
    {id: 'root', component: 'Video', url: 'https://example.invalid/clip.mp4'},
  ]);
  expect(container.querySelector('video')).not.toHaveAttribute('poster');
});
