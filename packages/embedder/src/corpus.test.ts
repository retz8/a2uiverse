import {describe, expect, test} from 'vitest';
import {corpusDoc} from './corpus.js';

describe('corpusDoc', () => {
  test('blends the name, the description and every skill’s name, description, tags and examples, one line each', () => {
    const doc = corpusDoc({
      name: 'Gmail',
      description: 'Your mail.',
      skills: [
        {
          name: 'Inbox',
          description: 'Unread mail.',
          tags: ['mail', 'inbox'],
          examples: ['show my inbox', 'unread mail'],
        },
        {name: 'Send', description: 'Send a message.'},
      ],
    });
    expect(doc).toBe(
      [
        'Gmail',
        'Your mail.',
        'Inbox',
        'Unread mail.',
        'mail inbox',
        'show my inbox unread mail',
        'Send',
        'Send a message.',
      ].join('\n'),
    );
  });

  test('a card with no skills is its name and description', () => {
    expect(corpusDoc({name: 'Shop', description: 'A shop.'})).toBe('Shop\nA shop.');
  });

  test('empty texts leave no blank line', () => {
    expect(corpusDoc({name: 'Shop', description: '', skills: [{name: '', description: 'x'}]})).toBe(
      'Shop\nx',
    );
  });
});
