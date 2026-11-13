/** Events of the private wire, built for tests that feed the composition what a relayed paint carries. */
import {dataPart} from '../src/a2a/parts.js';
import {workingUpdate, type WireStatusUpdate} from '../src/a2a/wire.js';

/** A relayed paint: a working status update whose message carries each A2UI v0.9 op as a data part. */
export function paint(...ops: Array<Record<string, unknown>>): WireStatusUpdate {
  return carrying(...ops.map(op => ({version: 'v0.9', ...op})));
}

/** A working status update whose message carries each object as a data part, as written. */
export function carrying(...datas: Array<Record<string, unknown>>): WireStatusUpdate {
  return workingUpdate({taskId: 't', contextId: 'c'}, {parts: datas.map(data => dataPart(data))});
}
