/**
 * The tagged block followed as the model writes it (task-17.9 decision 10), beside the shared
 * extractor it mirrors: the first `<tag>` in the answer opens the block, its body is read as one
 * JSON object, and each piece is handed over the moment its last character arrives — each member
 * of the object, and each element of the arrays the caller watches. It knows nothing of what the
 * block means. The whole answer is still read by `extractTaggedBlock` at its end; this reader only
 * lets a caller act on what is finished before then. A body that is not a JSON object, or stops
 * being JSON, hands over nothing more.
 */

/** A finished piece: a member of the block's object, or an element of a watched array. */
export type BlockPiece =
  | {kind: 'member'; key: string; value: unknown}
  | {kind: 'element'; path: readonly string[]; index: number; value: unknown};

export interface BlockReaderOptions {
  /** The arrays whose elements are handed over one by one, each by its path of member keys. */
  elements?: readonly (readonly string[])[];
}

/** An object or an array being read, and what it expects next. */
interface Frame {
  type: 'object' | 'array';
  /** The member keys and element indexes leading to it. */
  path: readonly string[];
  /** Where it opens in the body. */
  start: number;
  /** An object's member being read. */
  key?: string;
  /** An array's element being read. */
  index: number;
  expect: 'key' | 'colon' | 'value' | 'comma';
}

const WHITESPACE = new Set([' ', '\t', '\n', '\r']);

export class TaggedBlockReader {
  readonly #open: string;
  readonly #watched: Set<string>;
  #phase: 'seek' | 'start' | 'json' | 'done' = 'seek';
  /** The answer so far, while the block has not opened. */
  #seeking = '';
  /** The block's body so far. */
  #body = '';
  #at = 0;
  readonly #stack: Frame[] = [];
  #string: {start: number; key: boolean; escaped: boolean} | undefined;
  #scalar: number | undefined;

  constructor(tag: string, options: BlockReaderOptions = {}) {
    this.#open = `<${tag}>`;
    this.#watched = new Set((options.elements ?? []).map(pathKey));
  }

  /** The answer's next text; the pieces it finished, in the order written. */
  push(text: string): BlockPiece[] {
    if (this.#phase === 'done') return [];
    if (this.#phase === 'seek') {
      this.#seeking += text;
      const at = this.#seeking.indexOf(this.#open);
      if (at < 0) {
        this.#seeking = this.#seeking.slice(-(this.#open.length - 1));
        return [];
      }
      this.#body = this.#seeking.slice(at + this.#open.length);
      this.#seeking = '';
      this.#phase = 'start';
    } else {
      this.#body += text;
    }
    const pieces: BlockPiece[] = [];
    while (this.#at < this.#body.length && this.#reading()) {
      this.#step(this.#body[this.#at]!, pieces);
    }
    return pieces;
  }

  /** Whether the body is still read: not past its end, nor stopped. */
  #reading(): boolean {
    return this.#phase !== 'done';
  }

  /** Reads one character; a scalar's end leaves the delimiter to be read again. */
  #step(char: string, pieces: BlockPiece[]): void {
    const at = this.#at;
    if (this.#string) {
      this.#at++;
      const string = this.#string;
      if (string.escaped) string.escaped = false;
      else if (char === '\\') string.escaped = true;
      else if (char === '"') {
        this.#string = undefined;
        const top = this.#stack.at(-1)!;
        if (string.key) {
          top.key = JSON.parse(this.#body.slice(string.start, at + 1)) as string;
          top.expect = 'colon';
        } else this.#finish(string.start, at + 1, pieces);
      }
      return;
    }
    if (this.#scalar !== undefined) {
      if (!WHITESPACE.has(char) && char !== ',' && char !== '}' && char !== ']') {
        this.#at++;
        return;
      }
      const start = this.#scalar;
      this.#scalar = undefined;
      this.#finish(start, at, pieces);
      return;
    }
    this.#at++;
    if (WHITESPACE.has(char)) return;
    if (this.#phase === 'start') {
      if (char !== '{') return this.#stop();
      this.#stack.push({type: 'object', path: [], start: at, index: 0, expect: 'key'});
      this.#phase = 'json';
      return;
    }
    const top = this.#stack.at(-1)!;
    if (char === '}' || char === ']') {
      if (top.type !== (char === '}' ? 'object' : 'array') || top.expect === 'colon') {
        return this.#stop();
      }
      this.#stack.pop();
      if (this.#stack.length === 0) {
        this.#phase = 'done';
        return;
      }
      this.#finish(top.start, at + 1, pieces);
      return;
    }
    if (top.expect === 'key') {
      if (char !== '"' || top.type !== 'object') return this.#stop();
      this.#string = {start: at, key: true, escaped: false};
      return;
    }
    if (top.expect === 'colon') {
      if (char !== ':') return this.#stop();
      top.expect = 'value';
      return;
    }
    if (top.expect === 'comma') {
      if (char !== ',') return this.#stop();
      if (top.type === 'object') top.expect = 'key';
      else {
        top.index++;
        top.expect = 'value';
      }
      return;
    }
    // A value begins.
    const path = [...top.path, top.type === 'object' ? top.key! : String(top.index)];
    if (char === '{' || char === '[') {
      this.#stack.push({
        type: char === '{' ? 'object' : 'array',
        path,
        start: at,
        index: 0,
        expect: char === '{' ? 'key' : 'value',
      });
    } else if (char === '"') this.#string = {start: at, key: false, escaped: false};
    else this.#scalar = at;
  }

  /** A value ended inside the container on top: handed over when it is a piece. */
  #finish(start: number, end: number, pieces: BlockPiece[]): void {
    const parent = this.#stack.at(-1)!;
    parent.expect = 'comma';
    const root = this.#stack.length === 1;
    const element = parent.type === 'array' && this.#watched.has(pathKey(parent.path));
    if (!root && !element) return;
    let value: unknown;
    try {
      value = JSON.parse(this.#body.slice(start, end));
    } catch {
      return this.#stop();
    }
    pieces.push(
      root
        ? {kind: 'member', key: parent.key!, value}
        : {kind: 'element', path: parent.path, index: parent.index, value},
    );
  }

  #stop(): void {
    this.#phase = 'done';
  }
}

const pathKey = (path: readonly string[]): string => JSON.stringify(path);
