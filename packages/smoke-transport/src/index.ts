/**
 * How the platform reaches an agent (task-20.2 decision 3; task-20.5 decision 11): the dial,
 * which the orchestrator's dispatch and the smoke runner both use, and the transport of the smoke
 * request the marketplace and Stellify send. Node alone. The fetch of the live card is the card
 * package's (task-20.3 decision 3).
 */
export {signInSignalOf, UnauthorizedError} from './answers.js';
export {
  Dialer,
  NoInterfaceReachedError,
  sameInterface,
  type Dialed,
  type DialerOptions,
  type DialOptions,
  type ExtendedCardOptions,
  type FetchedExtendedCard,
  type NotReached,
  type NotReachedCase,
  type SendOptions,
} from './dial.js';
export {
  takeExtendedCard,
  type ExtendedCardAnswer,
  type ExtendedCardOutcome,
  type TakeExtendedCardOptions,
  type TakenExtendedCard,
} from './extendedCard.js';
export {noneReachedFinding, passedOverNote} from './notReachedWords.js';
export type {OpenConnection, OpenConnectionOptions} from './opening.js';
export {
  a2aSmokeRunner,
  FAILED_STATES,
  SMOKE_CONNECT_TIMEOUT_MS,
  type SmokeObservation,
  type SmokeReached,
  type SmokeRequest,
  type SmokeRunner,
  type SmokeRunnerOptions,
} from './smokeRunner.js';
