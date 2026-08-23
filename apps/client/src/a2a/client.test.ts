import {describe, it, expect} from 'vitest';
import {agentCardUrl} from './client';

describe('agentCardUrl', () => {
  const CARD = '/.well-known/agent-card.json';

  it('appends the card path to a base URL without a trailing slash', () => {
    expect(agentCardUrl('https://host.example')).toBe(`https://host.example${CARD}`);
  });

  it('collapses a trailing slash instead of producing a double slash', () => {
    expect(agentCardUrl('https://host.example/')).toBe(`https://host.example${CARD}`);
  });

  it('collapses multiple trailing slashes', () => {
    expect(agentCardUrl('http://localhost:10002///')).toBe(`http://localhost:10002${CARD}`);
  });
});
