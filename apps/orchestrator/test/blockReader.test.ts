/** The streaming reader of a tagged block (task-17.9 decision 10), beside the shared extractor. */
import {describe, expect, test} from 'vitest';
import {TaggedBlockReader, type BlockPiece} from '../src/authoring/blockReader.js';

const tag = 'some-block';
const COMPONENTS = ['tree', 'components'] as const;

/** Everything the reader hands over when the text arrives in pieces of `size` characters. */
function read(text: string, size: number, elements = [COMPONENTS]): BlockPiece[] {
  const reader = new TaggedBlockReader(tag, {elements});
  const pieces: BlockPiece[] = [];
  for (let at = 0; at < text.length; at += size)
    pieces.push(...reader.push(text.slice(at, at + size)));
  return pieces;
}

const document = {
  title: 'Works for today',
  dispatch: [{source: 'github', request: 'Open PRs {with} "quotes" and \\ slashes'}],
  dataModel: {count: 3, flags: [true, false, null], note: '</some-block> in a string'},
  tree: {
    components: [
      {id: 'root', component: 'Column', children: ['a', 'b']},
      {id: 'a', component: 'Text', text: 'a [bracket] and a } brace'},
      {id: 'b', component: 'Slot', source: 'github', weight: 2.5},
    ],
  },
};

const answer = `Here is the plan.\n<${tag}>\n${JSON.stringify(document, null, 2)}\n</${tag}>\nDone.`;

describe('TaggedBlockReader', () => {
  test('hands over each member of the block as it is finished, in the order written', () => {
    const pieces = read(answer, 7).filter(piece => piece.kind === 'member');
    expect(pieces).toEqual([
      {kind: 'member', key: 'title', value: document.title},
      {kind: 'member', key: 'dispatch', value: document.dispatch},
      {kind: 'member', key: 'dataModel', value: document.dataModel},
      {kind: 'member', key: 'tree', value: document.tree},
    ]);
  });

  test("hands over each element of a watched array as it is finished, before its member's end", () => {
    const pieces = read(answer, 5);
    const elements = pieces.filter(piece => piece.kind === 'element');
    expect(elements).toEqual(
      document.tree.components.map((value, index) => ({
        kind: 'element',
        path: ['tree', 'components'],
        index,
        value,
      })),
    );
    const lastElement = pieces.findLastIndex(piece => piece.kind === 'element');
    const tree = pieces.findIndex(piece => piece.kind === 'member' && piece.key === 'tree');
    expect(lastElement).toBeLessThan(tree);
  });

  test('reads the same pieces whatever the text is split into, one character at a time included', () => {
    const whole = read(answer, answer.length);
    for (const size of [1, 2, 3, 11, 64]) expect(read(answer, size)).toEqual(whole);
  });

  test('hands over an element the moment its last character arrives', () => {
    const reader = new TaggedBlockReader(tag, {elements: [COMPONENTS]});
    expect(
      reader.push(`<${tag}>{"tree": {"components": [{"id": "root", "component": "Column"`),
    ).toEqual([]);
    expect(reader.push('}')).toEqual([
      {
        kind: 'element',
        path: ['tree', 'components'],
        index: 0,
        value: {id: 'root', component: 'Column'},
      },
    ]);
  });

  test('a scalar member is finished at the character after it', () => {
    const reader = new TaggedBlockReader(tag);
    expect(reader.push(`<${tag}>{"a": 12`)).toEqual([]);
    expect(reader.push('5, "b": true')).toEqual([{kind: 'member', key: 'a', value: 125}]);
    expect(reader.push('}')).toEqual([{kind: 'member', key: 'b', value: true}]);
  });

  test('watches nothing unless asked: an array member is handed over whole', () => {
    const pieces = read(answer, 9, []);
    expect(pieces.every(piece => piece.kind === 'member')).toBe(true);
  });

  test('reads only after its own tag, and only the first block', () => {
    expect(read(JSON.stringify(document), 4)).toEqual([]);
    const other = `<other>${JSON.stringify({title: 'x'})}</other>`;
    expect(read(other, 4)).toEqual([]);
    const twice = `<${tag}>{"title": "one"}</${tag}><${tag}>{"title": "two"}</${tag}>`;
    expect(read(twice, 3)).toEqual([{kind: 'member', key: 'title', value: 'one'}]);
  });

  test('hands over nothing once the block is not a JSON object, or stops being JSON', () => {
    expect(read(`<${tag}>\n\`\`\`json\n{"title": "x"}\n\`\`\`\n</${tag}>`, 4)).toEqual([]);
    expect(read(`<${tag}>{"title": "x", "dispatch": nope, "tree": {}}</${tag}>`, 4)).toEqual([
      {kind: 'member', key: 'title', value: 'x'},
    ]);
  });
});
