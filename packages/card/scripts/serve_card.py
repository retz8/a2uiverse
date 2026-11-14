"""Serves one agent card from Python's a2a-sdk 1.x on a port, for `capture-fixtures.mjs`.

Usage: serve_card.py <port> <variant>

Variants, one card told five ways:
  jsonrpc   one JSON-RPC interface at A2A 1.0
  both      JSON-RPC at A2A 1.0, then JSON-RPC at A2A 0.3
  grpc      gRPC and HTTP+JSON at A2A 1.0, no JSON-RPC
  custom    one interface on a binding of the agent's own, ACME-RPC at A2A 1.0
  as-0.3    the `both` card in A2A 0.3's shape, by a2a-sdk's own conversion
"""

import sys

import uvicorn

from a2a.compat.v0_3.conversions import to_compat_agent_card
from a2a.server.routes import create_agent_card_routes
from a2a.types.a2a_pb2 import (
    AgentCapabilities,
    AgentCard,
    AgentExtension,
    AgentInterface,
    AgentProvider,
    AgentSkill,
    APIKeySecurityScheme,
    AuthorizationCodeOAuthFlow,
    OAuth2SecurityScheme,
    OAuthFlows,
    SecurityRequirement,
    SecurityScheme,
    StringList,
)
from a2a.utils.constants import AGENT_CARD_WELL_KNOWN_PATH
from google.protobuf.struct_pb2 import Struct
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route


def interfaces_of(port: int, variant: str) -> list[AgentInterface]:
    """The interfaces a variant lists, on the agent at `port`."""
    base = f'http://127.0.0.1:{port}'

    def interface(binding: str, version: str, url: str = f'{base}/') -> AgentInterface:
        return AgentInterface(url=url, protocol_binding=binding, protocol_version=version)

    return {
        'jsonrpc': [interface('JSONRPC', '1.0')],
        'both': [interface('JSONRPC', '1.0'), interface('JSONRPC', '0.3')],
        'grpc': [
            interface('GRPC', '1.0', f'127.0.0.1:{port + 1}'),
            interface('HTTP+JSON', '1.0', f'{base}/rest'),
        ],
        'custom': [interface('ACME-RPC', '1.0', f'{base}/acme')],
    }[variant]


def card_for(port: int, variant: str) -> AgentCard:
    """The one card, told as `variant` lists its interfaces, on the agent at `port`."""
    base = f'http://127.0.0.1:{port}'
    params = Struct()
    params.update(
        {'supportedCatalogIds': ['https://example.com/catalogs/fake/v1/catalog.json']}
    )
    return AgentCard(
        name='Fake Agent',
        description='an agent for tests',
        version='0.1.0',
        supported_interfaces=interfaces_of(port, 'both' if variant == 'as-0.3' else variant),
        provider=AgentProvider(organization='Acme', url='https://example.com'),
        documentation_url='https://example.com/docs',
        capabilities=AgentCapabilities(
            streaming=True,
            extensions=[
                AgentExtension(
                    uri='https://a2ui.org/a2a-extension/a2ui/v0.9.1', params=params
                )
            ],
        ),
        security_schemes={
            'signIn': SecurityScheme(
                oauth2_security_scheme=OAuth2SecurityScheme(
                    flows=OAuthFlows(
                        authorization_code=AuthorizationCodeOAuthFlow(
                            authorization_url=f'{base}/authorize',
                            token_url=f'{base}/token',
                            scopes={'things.read': 'Read your things'},
                        )
                    )
                )
            ),
            'key': SecurityScheme(
                api_key_security_scheme=APIKeySecurityScheme(
                    location='header', name='X-Api-Key', description='Paste your key'
                )
            ),
        },
        security_requirements=[
            SecurityRequirement(schemes={'signIn': StringList(list=['things.read'])})
        ],
        default_input_modes=['text'],
        default_output_modes=['text'],
        skills=[
            AgentSkill(
                id='fake',
                name='Fake',
                description='A fake skill',
                tags=['fake'],
                examples=['show my things'],
            )
        ],
    )


if __name__ == '__main__':
    port = int(sys.argv[1])
    variant = sys.argv[2]
    card = card_for(port, variant)
    if variant == 'as-0.3':
        compat = to_compat_agent_card(card).model_dump(exclude_none=True)

        async def serve(_request):  # noqa: ANN001, ANN201
            return JSONResponse(compat)

        routes = [Route(AGENT_CARD_WELL_KNOWN_PATH, serve, methods=['GET'])]
    else:
        routes = create_agent_card_routes(card)

    uvicorn.run(Starlette(routes=routes), host='127.0.0.1', port=port, log_level='warning')
