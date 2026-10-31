/**
 * The third seam between the shell catalog and its host (task-17.10 decisions 4, 10): whether the
 * merged view is still being drawn as the Synthesizer writes it. While it is, `Table` keeps a
 * skeleton row below its last — the rows taking the reserved slot's four one for one — and the
 * shell's slot stays busy; the host says when the document is accepted.
 */
import {createContext} from 'react';

/** Default: the host says nothing — every view is drawn as landed. */
export const SynthesisStreamingContext = createContext<boolean>(false);
