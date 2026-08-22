import {expect, test} from 'vitest';
import {SHELL_CATALOG_CONTRACT, SHELL_CATALOG_NAME} from './index';

test('exports its name and resolves the sdk', () => {
  expect(SHELL_CATALOG_NAME).toBe('@a2uiverse/shell-catalog');
  expect(SHELL_CATALOG_CONTRACT).toBe('@a2uiverse/sdk');
});
