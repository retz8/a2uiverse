import {expect, test} from 'vitest';
import {APP_NAME} from './index';

test('exports its name', () => {
  expect(APP_NAME).toBe('@a2uiverse/marketplace');
});
