"""A scratch agent on Python's a2a-sdk 1.x that serves each signed-in account an extended card
of its own, for `capture-extended-cards.mjs` and the live sitting of task 20.8.

Usage: serve_extended_card.py <port> <grpc port> <interfaces> [no-flag]

`interfaces` is what its public card lists, in the card's order, each a binding and an A2A
version: `JSONRPC@1.0,HTTP+JSON@0.3,GRPC@1.0`. It answers all six paths, A2A 0.3 through
a2a-sdk's own 0.3 layer: JSON-RPC at `/`, HTTP+JSON under `/rest`, gRPC on its gRPC port, listed
as a bare `host:port`. Its card asks a key in the header `X-Scratch-Key` and says it serves an
extended card.

The extended card it serves follows the key the request carries, as a header or, on gRPC, as
metadata under the header's name in lowercase:

  alice   the public card with one skill more, "Lantern repairs", listing HTTP+JSON alone, at
          A2A 1.0 then 0.3 (a2a-sdk's 0.3 layer serves no card without a 0.3 interface); once
          `POST /scratch/alice/unspoken` is sent, listing one interface on a binding of its own,
          ACME-RPC, until `POST /scratch/alice/spoken`
  none    a2a-sdk answers that it has no extended card configured
  any     the public card

A request without a key is answered with the extended card as for any other key: a2a-sdk makes
no authentication check of its own for the call (`_dev/a2a-findings.md` 24).

With `no-flag` its card says it serves no extended card, and a2a-sdk answers each request for one
that the operation is not supported.

It paints in the basic catalog: a question naming lanterns is answered by a lantern repairs
surface, any other by the shop's front page, each saying which account asked.
"""

import asyncio
import sys

import grpc
import uvicorn

from a2a.compat.v0_3 import a2a_v0_3_pb2_grpc
from a2a.compat.v0_3.grpc_handler import CompatGrpcHandler
from a2a.helpers.proto_helpers import new_data_part, new_task
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.context import ServerCallContext
from a2a.server.events import EventQueue
from a2a.server.request_handlers import DefaultRequestHandler, GrpcHandler
from a2a.server.routes import (
    create_agent_card_routes,
    create_jsonrpc_routes,
    create_rest_routes,
)
from a2a.server.tasks import InMemoryTaskStore, TaskUpdater
from a2a.types import a2a_pb2_grpc
from a2a.types.a2a_pb2 import (
    AgentCapabilities,
    AgentCard,
    AgentExtension,
    AgentInterface,
    AgentSkill,
    APIKeySecurityScheme,
    SecurityRequirement,
    SecurityScheme,
    StringList,
    TaskState,
)
from a2a.utils.errors import ExtendedAgentCardNotConfiguredError
from google.protobuf.struct_pb2 import Struct
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Route

port = int(sys.argv[1])
grpc_port = int(sys.argv[2])
listed = [entry.split('@') for entry in sys.argv[3].split(',')]
flagged = 'no-flag' not in sys.argv[4:]
base = f'http://127.0.0.1:{port}'
URLS = {'JSONRPC': f'{base}/', 'HTTP+JSON': f'{base}/rest', 'GRPC': f'127.0.0.1:{grpc_port}'}

KEY_HEADER = 'X-Scratch-Key'
BASIC = 'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json'
A2UI = 'application/a2ui+json'
mode = {'alice': 'spoken'}


def key_of(context: ServerCallContext) -> str | None:
    """The key a request carries: its header, or its gRPC metadata entry."""
    headers = context.state.get('headers')
    if isinstance(headers, dict):
        for name, value in headers.items():
            if name.lower() == KEY_HEADER.lower():
                return value
    grpc_context = context.state.get('grpc_context')
    if grpc_context is not None:
        for name, value in grpc_context.invocation_metadata() or []:
            if name == KEY_HEADER.lower():
                return value
    return None


def interface(binding: str, version: str) -> AgentInterface:
    return AgentInterface(url=URLS[binding], protocol_binding=binding, protocol_version=version)


def skill(skill_id: str, name: str, description: str, example: str) -> AgentSkill:
    return AgentSkill(
        id=skill_id, name=name, description=description, tags=[skill_id], examples=[example]
    )


SHOP = skill('shop', 'Shop', 'The scratch shop’s front page', 'what is new at the shop')
LANTERNS = skill(
    'lanterns',
    'Lantern repairs',
    'The lantern repairs this account has booked with the shop, and their state',
    'how are my lantern repairs',
)


def card_with(interfaces: list[AgentInterface], skills: list[AgentSkill], name: str) -> AgentCard:
    params = Struct()
    params.update({'supportedCatalogIds': [BASIC]})
    return AgentCard(
        name=name,
        description='A scratch shop that serves each signed-in account a card of its own',
        version='0.1.0',
        supported_interfaces=interfaces,
        capabilities=AgentCapabilities(
            streaming=True,
            extended_agent_card=flagged,
            extensions=[
                AgentExtension(uri='https://a2ui.org/a2a-extension/a2ui/v0.9.1', params=params)
            ],
        ),
        security_schemes={
            'key': SecurityScheme(
                api_key_security_scheme=APIKeySecurityScheme(
                    location='header',
                    name=KEY_HEADER,
                    description='Paste alice or bob.',
                )
            )
        },
        security_requirements=[SecurityRequirement(schemes={'key': StringList(list=[])})],
        default_input_modes=['text'],
        default_output_modes=['text'],
        skills=skills,
    )


card = card_with([interface(b, v) for b, v in listed], [SHOP], 'Scratch Shop')


def alices_card() -> AgentCard:
    own = (
        [AgentInterface(url=f'{base}/acme', protocol_binding='ACME-RPC', protocol_version='1.0')]
        if mode['alice'] == 'unspoken'
        else [interface('HTTP+JSON', '1.0'), interface('HTTP+JSON', '0.3')]
    )
    return card_with(own, [SHOP, LANTERNS], 'Scratch Shop')


async def own_card(public: AgentCard, context: ServerCallContext) -> AgentCard:
    key = key_of(context)
    if key == 'none':
        raise ExtendedAgentCardNotConfiguredError
    return alices_card() if key == 'alice' else card


def paint(surface: str, title: str, lines: list[str]) -> list:
    create = {'version': 'v0.9', 'createSurface': {'surfaceId': surface, 'catalogId': BASIC}}
    components = [
        {'id': 'root', 'component': 'Column', 'children': ['title', *[f'l{i}' for i in range(len(lines))]]},
        {'id': 'title', 'component': 'Text', 'text': title, 'variant': 'h3'},
        *[{'id': f'l{i}', 'component': 'Text', 'text': line} for i, line in enumerate(lines)],
    ]
    update = {'version': 'v0.9', 'updateComponents': {'surfaceId': surface, 'components': components}}
    return [create, update]


class Scratch(AgentExecutor):
    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        if context.current_task is None:
            await event_queue.enqueue_event(
                new_task(
                    context.task_id,
                    context.context_id,
                    TaskState.TASK_STATE_SUBMITTED,
                    history=[context.message],
                )
            )
        updater = TaskUpdater(event_queue, context.task_id, context.context_id)
        key = key_of(context.call_context) or 'nobody'
        asked = context.get_user_input().lower()
        if 'lantern' in asked:
            messages = paint(
                'lanterns',
                'Lantern repairs',
                [f'Booked for {key}: the brass lantern, ready Friday.'],
            )
        else:
            messages = paint('shop', 'Scratch Shop', [f'Welcome back, {key}.'])
        parts = []
        for message in messages:
            part = new_data_part(message, media_type=A2UI)
            part.metadata.update({'mimeType': A2UI})
            parts.append(part)
        await updater.complete(updater.new_agent_message(parts))

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        await TaskUpdater(event_queue, context.task_id, context.context_id).cancel()


handler = DefaultRequestHandler(
    agent_executor=Scratch(),
    task_store=InMemoryTaskStore(),
    agent_card=card,
    extended_agent_card=alices_card(),
    extended_card_modifier=own_card,
)


async def set_mode(request: Request) -> JSONResponse:
    mode['alice'] = request.path_params['mode']
    return JSONResponse(mode)


routes = [
    *create_agent_card_routes(card),
    Route('/scratch/alice/{mode:str}', set_mode, methods=['POST']),
    *create_jsonrpc_routes(handler, '/', enable_v0_3_compat=True),
    *create_rest_routes(handler, enable_v0_3_compat=True, path_prefix='/rest'),
]


async def main() -> None:
    server = grpc.aio.server()
    a2a_pb2_grpc.add_A2AServiceServicer_to_server(GrpcHandler(handler), server)
    a2a_v0_3_pb2_grpc.add_A2AServiceServicer_to_server(CompatGrpcHandler(handler), server)
    server.add_insecure_port(f'127.0.0.1:{grpc_port}')
    await server.start()
    config = uvicorn.Config(
        Starlette(routes=routes), host='127.0.0.1', port=port, log_level='warning'
    )
    await uvicorn.Server(config).serve()


asyncio.run(main())
