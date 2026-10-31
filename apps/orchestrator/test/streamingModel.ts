/**
 * A scripted model's answers streamed, as the Planner reads them since task 17.9: each answer
 * written as `doGenerate` would return it, served through `doStream` — its text in a few deltas,
 * each tool call whole, then the finish with the usage.
 */
import type {MockLanguageModelV3} from 'ai/test';

type MockOptions = NonNullable<ConstructorParameters<typeof MockLanguageModelV3>[0]>;
type DoGenerate = Extract<MockOptions['doGenerate'], (...args: never[]) => unknown>;
type DoStream = Extract<MockOptions['doStream'], (...args: never[]) => unknown>;
type CallOptions = Parameters<DoGenerate>[0];
type GenerateResult = Awaited<ReturnType<DoGenerate>>;
type StreamResult = Awaited<ReturnType<DoStream>>;
type StreamPart = StreamResult['stream'] extends ReadableStream<infer P> ? P : never;

/** How many deltas a text is written in. */
const DELTAS = 4;

/** The parts a provider streams for one generate-shaped answer. */
export function partsOf(result: GenerateResult): StreamPart[] {
  const parts: StreamPart[] = [{type: 'stream-start', warnings: result.warnings ?? []}];
  result.content.forEach((content, i) => {
    if (content.type === 'text') {
      const id = `text-${i}`;
      const size = Math.max(1, Math.ceil(content.text.length / DELTAS));
      parts.push({type: 'text-start', id});
      for (let at = 0; at < content.text.length; at += size) {
        parts.push({type: 'text-delta', id, delta: content.text.slice(at, at + size)});
      }
      parts.push({type: 'text-end', id});
    } else if (content.type === 'tool-call') {
      parts.push(content);
    }
  });
  parts.push({
    type: 'finish',
    finishReason: result.finishReason,
    usage: result.usage,
    ...(result.providerMetadata ? {providerMetadata: result.providerMetadata} : {}),
  });
  return parts;
}

/** A stream of parts, all at once. */
export function streamOfParts(parts: readonly StreamPart[]): StreamResult {
  return {
    stream: new ReadableStream<StreamPart>({
      start(controller) {
        for (const part of parts) controller.enqueue(part);
        controller.close();
      },
    }),
  };
}

/** A generate-shaped answer, streamed. */
export function streamOf(result: GenerateResult): StreamResult {
  return streamOfParts(partsOf(result));
}

/** Mock options whose `doStream` streams what their `doGenerate` answers. */
export function streaming(options: {
  doGenerate: DoGenerate | GenerateResult;
}): Pick<MockOptions, 'doStream'> {
  const {doGenerate} = options;
  return {
    doStream: async (call: CallOptions) =>
      streamOf(typeof doGenerate === 'function' ? await doGenerate(call) : doGenerate),
  };
}

/**
 * A stream the test writes into as the model would, one text at a time: what the reader of the
 * stream has acted on can be seen between writes.
 */
export function liveStream(): {
  result: StreamResult;
  write(text: string): void;
  end(): void;
} {
  let controller!: ReadableStreamDefaultController<StreamPart>;
  const stream = new ReadableStream<StreamPart>({
    start(c) {
      controller = c;
      c.enqueue({type: 'stream-start', warnings: []});
      c.enqueue({type: 'text-start', id: 'text-0'});
    },
  });
  return {
    result: {stream},
    write: text => controller.enqueue({type: 'text-delta', id: 'text-0', delta: text}),
    end: () => {
      controller.enqueue({type: 'text-end', id: 'text-0'});
      controller.enqueue({
        type: 'finish',
        finishReason: {unified: 'stop', raw: undefined},
        usage: {
          inputTokens: {total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined},
          outputTokens: {total: 1, text: 1, reasoning: undefined},
        },
      });
      controller.close();
    },
  };
}

/**
 * A layout surface's block in the pieces the Planner is asked to write it in (task-17.9 decision
 * 4) — the title and the dispatch list, the data model, the tree's opening, each component, the
 * close — or in the order of `keys`.
 */
export function blockPieces(
  tag: string,
  document: {title?: string; dispatch: unknown; dataModel: unknown; tree: {components: unknown[]}},
  keys: readonly ('title' | 'dispatch' | 'dataModel' | 'tree')[] = [
    'title',
    'dispatch',
    'dataModel',
    'tree',
  ],
): string[] {
  const pieces: string[] = [];
  const members = keys.filter(key => key !== 'title' || document.title !== undefined);
  members.forEach((key, i) => {
    const lead = i === 0 ? `<${tag}>\n{` : ', ';
    if (key !== 'tree') {
      pieces.push(`${lead}${JSON.stringify(key)}: ${JSON.stringify(document[key])}`);
      return;
    }
    pieces.push(`${lead}"tree": {"components": [`);
    document.tree.components.forEach((component, c) =>
      pieces.push(`${c === 0 ? '' : ', '}${JSON.stringify(component)}`),
    );
    pieces.push(']}');
  });
  pieces.push(`}\n</${tag}>`);
  return pieces;
}
