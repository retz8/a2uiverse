/**
 * A wire captured from a real agent, replayed for tests (task-20.4 decision 15; task-20.5 decision
 * 15): one request the A2A SDK's client sent through the platform's dial, over JSON-RPC or
 * HTTP+JSON, and the answer as the agent's server wrote it, saved by
 * `scripts/capture-fixtures.mjs` under `test/fixtures/`. None is written by hand.
 */
import {readFileSync} from 'node:fs';

export interface CapturedWire {
  /** The server the wire was captured from. */
  agent: string;
  /** What the agent was asked for: the first text part of the request. */
  asked: string;
  /** The binding of the interface the request reached: `JSONRPC` or `HTTP+JSON`. */
  binding: string;
  /** The A2A version of the interface the request reached. */
  a2aVersion: string;
  /** The card as the agent served it, that interface the first it lists. */
  card: object;
  /**
   * What the A2A SDK's client sent: the URL, the headers that name the protocol, and the body —
   * a JSON-RPC request, or HTTP+JSON's.
   */
  request: {url: string; headers: Record<string, string>; body: Record<string, unknown>};
  /**
   * What came back: the response's status and content type, its body as written, and whether the
   * agent closed the stream itself; a stream it held open was left by the capture after three
   * seconds with nothing more written.
   */
  response: {status: number; contentType: string; body: string; closedByAgent: boolean};
}

/** The captured wire saved as `name`, a file of `test/fixtures/`. */
export function capturedWire(name: string): CapturedWire {
  const file = new URL(`../../test/fixtures/${name}`, import.meta.url);
  return JSON.parse(readFileSync(file, 'utf8')) as CapturedWire;
}

/**
 * A `fetch` that answers every request with the captured response. A stream the agent held open
 * stays open after its body is written, until its reader leaves it or the request is aborted.
 */
export function capturedFetch(wire: CapturedWire): typeof fetch {
  const {status, contentType, body, closedByAgent} = wire.response;
  return (_input, init) => {
    const bytes = new TextEncoder().encode(body);
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
        if (closedByAgent) return controller.close();
        init?.signal?.addEventListener('abort', () => controller.error(init.signal?.reason), {
          once: true,
        });
      },
    });
    return Promise.resolve(new Response(stream, {status, headers: {'content-type': contentType}}));
  };
}
