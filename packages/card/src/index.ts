/**
 * An agent's card on A2UIVerse (task 20.3): the one reading, the fetch of the live card with the
 * check of a signed card (task 20.7), the interface the platform takes, and when two cards are the
 * same card. Browser-safe: the client reads a card where one arrives over `orchestratorApi`, and
 * runs no check.
 */
export {cardReadError, readCard, type ServedCard} from './readCard.js';
export {fetchLiveCard, type FetchLiveCardOptions, type LiveCard} from './liveCard.js';
export {
  checkSignatures,
  isLocalMachine,
  passedNote,
  SIGNATURE_ALGORITHMS,
  UnconfirmedCardError,
  type CheckSignaturesOptions,
  type PassedSignature,
} from './signatures.js';
export {
  a2aVersionOf,
  cardToDial,
  noInterfaceFinding,
  SPOKEN_BINDINGS,
  spokenInterfaces,
} from './interfaces.js';
export {sameCard} from './sameCard.js';
export {
  asksSignIn,
  redirectFirst,
  signInAlternatives,
  signInFlow,
  type SignInAlternative,
  type SignInFlow,
} from './requirements.js';
