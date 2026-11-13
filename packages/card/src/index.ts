/**
 * An agent's card on A2UIVerse (task 20.3): the one reading, the fetch of the live card, the
 * interface the platform takes, and when two cards are the same card. Browser-safe: the client
 * reads a card where one arrives over `orchestratorApi`.
 */
export {cardReadError, readCard, type ServedCard} from './readCard.js';
export {fetchLiveCard, type FetchLiveCardOptions} from './liveCard.js';
export {
  a2aVersionOf,
  cardToDial,
  noInterfaceFinding,
  SPOKEN_BINDINGS,
  spokenInterfaces,
} from './interfaces.js';
export {sameCard} from './sameCard.js';
export {asksSignIn, signInAlternatives, type SignInAlternative} from './requirements.js';
