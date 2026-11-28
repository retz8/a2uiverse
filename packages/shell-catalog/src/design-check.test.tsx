/**
 * The design-check page's trees held to the v1.0 schema's form, as every component test's tree is
 * (task-21.12 decision 9): the page is rendered whole, and every message it hands a processor is
 * checked against the v1.0 catalog document.
 */
import {act} from '@testing-library/react';
import {MessageProcessor} from '@a2ui/web_core/v1_0';
import {afterEach, expect, test, vi} from 'vitest';
import {holdToSchemaForm} from './testing/render';

afterEach(() => {
  vi.restoreAllMocks();
});

test('every tree the design-check page paints is in the v1.0 schema’s form', async () => {
  const painted: unknown[][] = [];
  const process = MessageProcessor.prototype.processMessages;
  vi.spyOn(MessageProcessor.prototype, 'processMessages').mockImplementation(function (
    this: MessageProcessor<never>,
    messages,
  ) {
    painted.push(messages as unknown[]);
    return process.call(this, messages);
  });
  vi.spyOn(console, 'log').mockImplementation(() => {});
  document.body.innerHTML = '<div id="root"></div>';
  await act(async () => {
    await import('../fixture/main');
  });
  // The sweep alone paints one tree per sample, in each of the page's three columns.
  expect(painted.length).toBeGreaterThan(100);
  for (const messages of painted) holdToSchemaForm(messages);
});
