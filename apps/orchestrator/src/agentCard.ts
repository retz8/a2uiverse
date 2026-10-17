import type {AgentCard} from '@a2a-js/sdk';

export const A2UI_EXTENSION_URI_V091 = 'https://a2ui.org/a2a-extension/a2ui/v0.9.1';
export const A2UI_EXTENSION_URI_V09 = 'https://a2ui.org/a2a-extension/a2ui/v0.9';

/**
 * The orchestrator's AgentCard (SPEC §10): the one the client fetches and the one the Registry
 * indexes under `shell` beside the installed apps' cards (phase-6 decision 1). Its skills are
 * hand-authored: what A2UIVerse is, what the canvas can do, describing the installed apps, and
 * how apps are found and installed — the texts that let the Router rank a platform question and
 * the Planner tell one from a capability gap. No union of installed apps' skills: the palette
 * sends every utterance here regardless, and the Registry reader describes the apps on demand.
 */
export function buildAgentCard(baseUrl: string): AgentCard {
  return {
    name: 'A2UIVerse Orchestrator',
    description:
      'The A2UIVerse hub: the platform that composes installed A2UI apps onto one canvas. Routes palette utterances to the apps, relays their surfaces, merges their answers, and answers questions about itself.',
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
      {
        id: 'platform',
        name: 'What A2UIVerse is',
        description:
          'Explains the platform itself: A2UIVerse is an application ecosystem for A2UI agents — apps that paint their own interface — composed by this hub onto one canvas. It says what the platform does, what an app is here, what the canvas is, and how a question travels from the palette to the apps and back.',
        tags: ['platform', 'about', 'help'],
        examples: [
          'what is A2UIVerse?',
          'what is this?',
          'how does this work?',
          'what are you?',
          'explain this platform',
        ],
      },
      {
        id: 'canvas',
        name: 'What the canvas can do',
        description:
          'Describes what can be done here: ask several installed apps one question and see their answers side by side, get a merged view over their answers, act inside an app’s answer, look back at earlier turns, and what is on the canvas right now — which apps answered, what was asked, whether a merged view stands.',
        tags: ['canvas', 'capabilities', 'help', 'screen'],
        examples: [
          'what can I do here?',
          'what can you do?',
          "what's on my screen?",
          'what am I looking at?',
          'what did I ask before?',
          'what happened last time?',
        ],
      },
      {
        id: 'installed-apps',
        name: 'Installed apps',
        description:
          'Lists and describes the apps installed on this platform: each app’s name, what it does, and the skills its own card declares. Answers which apps are available, what a given installed app can do, whether an app is reachable right now, and whether each has an update, as of the last check.',
        tags: ['apps', 'installed', 'library'],
        examples: [
          'what apps do I have?',
          'which apps are installed?',
          'what can my apps do?',
          'list my apps',
          'do I have an app for mail?',
          'is anything out of date?',
          'do my apps need updating?',
        ],
      },
      {
        id: 'find-and-install',
        name: 'Finding and installing apps',
        description:
          'Explains how apps are found and installed: the Store is where new apps are browsed and installed, and the App Library is where installed apps are managed — removed, their accounts and permissions changed. Points the user to either page; the pages themselves are the platform’s own, never painted by an app.',
        tags: ['store', 'install', 'marketplace', 'app library', 'manage'],
        examples: [
          'how do I add apps?',
          'how do I install an app?',
          'where do I find more apps?',
          'how do I remove an app?',
          'open the store',
          'manage my apps',
        ],
      },
      {
        id: 'publish',
        name: 'Publishing an app',
        description:
          'Explains how a publisher puts their own app in the Store, as four steps in order. 1. Pack the app with Stellify in its own folder. 2. Open Publish and claim a publisher name, once. 3. Give Publish the folders Stellify wrote and the app’s address; an app that asks people to sign in also needs the sample answer Stellify captured with the publisher’s own account. 4. Before it is listed, the Store fetches the app, checks its files and asks it one question. Points the user to Publish, the platform’s own page, where a publisher also sees their apps in the Store and takes one out.',
        tags: ['publish', 'publisher', 'store', 'stellify'],
        examples: [
          'how do I publish my app?',
          'how do I put my own app in the Store?',
          'how do I take my app out of the Store?',
          'open Publish',
        ],
      },
    ],
  };
}
