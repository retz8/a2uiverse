/**
 * An installed app's card as its agent served it (task-20.1 decision 1): A2A 0.3's fields, which
 * every card reader in the orchestrator reads until the card's one reading lands (20.3) and this
 * type is removed. The registry fetches a card itself and keeps it as served; only the dispatch
 * hands one to the A2A SDK, which translates it at its edge.
 */
export interface InstalledCard {
  name: string;
  description: string;
  version: string;
  /** Where the agent is reached: the dispatch's address. */
  url: string;
  protocolVersion?: string;
  preferredTransport?: string;
  additionalInterfaces?: {transport: string; url: string}[];
  provider?: {organization: string; url: string};
  documentationUrl?: string;
  iconUrl?: string;
  capabilities: {
    streaming?: boolean;
    pushNotifications?: boolean;
    stateTransitionHistory?: boolean;
    extensions?: InstalledCardExtension[];
  };
  /** Which schemes a caller must meet: an OR of ANDs, scheme name to the scopes it needs. */
  security?: Record<string, string[]>[];
  securitySchemes?: Record<string, InstalledCardScheme>;
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: InstalledCardSkill[];
  supportsAuthenticatedExtendedCard?: boolean;
  signatures?: {protected: string; signature: string; header?: Record<string, unknown>}[];
}

export interface InstalledCardExtension {
  uri: string;
  description?: string;
  required?: boolean;
  params?: Record<string, unknown>;
}

export interface InstalledCardSkill {
  id: string;
  name: string;
  description: string;
  tags: string[];
  examples?: string[];
  inputModes?: string[];
  outputModes?: string[];
  security?: Record<string, string[]>[];
}

/** A sign-in scheme, told apart by its `type`. */
export type InstalledCardScheme =
  | {type: 'apiKey'; in: 'cookie' | 'header' | 'query'; name: string; description?: string}
  | {type: 'http'; scheme: string; bearerFormat?: string; description?: string}
  | {type: 'oauth2'; flows: InstalledCardFlows; oauth2MetadataUrl?: string; description?: string}
  | {type: 'openIdConnect'; openIdConnectUrl: string; description?: string}
  | {type: 'mutualTLS'; description?: string};

export interface InstalledCardFlows {
  authorizationCode?: {
    authorizationUrl: string;
    tokenUrl: string;
    refreshUrl?: string;
    scopes: Record<string, string>;
  };
  clientCredentials?: {tokenUrl: string; refreshUrl?: string; scopes: Record<string, string>};
  implicit?: {authorizationUrl: string; refreshUrl?: string; scopes: Record<string, string>};
  password?: {tokenUrl: string; refreshUrl?: string; scopes: Record<string, string>};
}
