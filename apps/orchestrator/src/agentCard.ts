import type {AgentCard} from '@a2a-js/sdk';

export const A2UI_EXTENSION_URI_V091 = 'https://a2ui.org/a2a-extension/a2ui/v0.9.1';
export const A2UI_EXTENSION_URI_V09 = 'https://a2ui.org/a2a-extension/a2ui/v0.9';

/**
 * The orchestrator's AgentCard: minimal and static (SPEC §10). No union of
 * installed apps' skills — the palette sends every utterance here regardless.
 */
export function buildAgentCard(baseUrl: string): AgentCard {
  return {
    name: 'A2UIVerse Orchestrator',
    description:
      'The A2UIVerse hub: routes palette utterances to installed A2UI apps and relays their surfaces.',
    version: '0.0.0',
    protocolVersion: '0.3.0',
    url: baseUrl,
    preferredTransport: 'JSONRPC',
    capabilities: {
      streaming: true,
      extensions: [
        {
          uri: A2UI_EXTENSION_URI_V091,
          description: 'Relays A2UI v0.9.1 surfaces painted by installed apps.',
          required: false,
        },
      ],
    },
    defaultInputModes: ['text', 'text/plain'],
    defaultOutputModes: ['text', 'text/plain'],
    skills: [
      {
        id: 'palette',
        name: 'Palette',
        description: 'Routes a palette utterance to the installed apps and paints the result.',
        tags: ['a2ui', 'orchestrator'],
      },
    ],
  };
}
