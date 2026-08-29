/**
 * The seam between the shell catalog and its host: `Slot` renders whatever the
 * host resolves for a slot name. The client provides the resolver (its placement
 * map + surface registry); the catalog only declares the contract.
 */
import {createContext} from 'react';
import type {ReactNode} from 'react';

export type SlotContentResolver = (slotName: string) => ReactNode | null;

/** Default resolver: no content — every slot renders its own state. */
export const SlotContentContext = createContext<SlotContentResolver>(() => null);
