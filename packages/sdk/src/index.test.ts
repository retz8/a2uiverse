import {expect, test} from 'vitest';
import {SDK_NAME} from './index';

test('exports its name', () => {
  expect(SDK_NAME).toBe('@a2uiverse/sdk');
});
