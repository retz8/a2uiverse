"""A scratch agent on Python's a2a-sdk 1.x that answers with A2UI, for `capture-fixtures.mjs`.

Usage: serve_a2ui.py <port> <grpc port> <interfaces>

`interfaces` is what its card lists, in the card's order, each a binding and an A2A version:
`JSONRPC@1.0,HTTP+JSON@0.3,GRPC@1.0`. It answers all six paths, A2A 0.3 through a2a-sdk's own
0.3 layer: JSON-RPC at `/`, HTTP+JSON under `/rest`, gRPC on its gRPC port, listed as a bare
`host:port`. The first text part of a request names what it answers:

  one         two A2UI messages, one per data part, marked in metadata.mimeType
  list        one data part holding the two messages as a list, marked in metadata.mimeType
  media-type  the two messages, one per data part, marked in media_type alone
  artifact    the two messages in an artifact, the status messages carrying none
  auth-1.0    auth-required, the request in A2A 1.0's requirement shape; execute() returns
  auth-0.3    auth-required, the request in A2A 0.3's requirement shape; execute() returns
  auth-held   auth-required as auth-1.0; execute() does not return
  echo        the parts of the request as the executor holds them, as JSON in a text part
"""

import asyncio
import json
import sys

import grpc
import uvicorn

from a2a.compat.v0_3 import a2a_v0_3_pb2_grpc
from a2a.compat.v0_3.grpc_handler import CompatGrpcHandler
from a2a.helpers.proto_helpers import new_data_part, new_task, new_text_part
from a2a.server.agent_execution import AgentExecutor, RequestContext
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
    AuthorizationCodeOAuthFlow,
    OAuth2SecurityScheme,
    OAuthFlows,
    Part,
    SecurityScheme,
    TaskState,
)
from google.protobuf.json_format import MessageToDict
from google.protobuf.struct_pb2 import Struct
from starlette.applications import Starlette

port = int(sys.argv[1])
grpc_port = int(sys.argv[2])
listed = [entry.split('@') for entry in sys.argv[3].split(',')]
base = f'http://127.0.0.1:{port}'
URLS = {'JSONRPC': f'{base}/', 'HTTP+JSON': f'{base}/rest', 'GRPC': f'127.0.0.1:{grpc_port}'}

CATALOG = 'https://example.com/catalogs/fake/v1/catalog.json'
A2UI = 'application/a2ui+json'
CREATE = {'version': 'v0.9', 'createSurface': {'surfaceId': 's1', 'catalogId': CATALOG}}
UPDATE = {
    'version': 'v0.9',
    'updateComponents': {
        'surfaceId': 's1',
        'components': [{'id': 'root', 'component': 'Text', 'text': 'hi'}],
    },
}
REQUEST_1_0 = {
    'securityRequirements': [{'schemes': {'signIn': {'list': ['things.write']}}}]
}
REQUEST_0_3 = {'security': [{'signIn': ['things.write']}]}


def data_part(data, *, metadata: bool = False, media_type: bool = False) -> Part:  # noqa: ANN001
    part = new_data_part(data, media_type=A2UI if media_type else None)
    if metadata:
        part.metadata.update({'mimeType': A2UI})
    return part


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
        asked = context.get_user_input().strip()

        async def complete(parts: list[Part]) -> None:
            await updater.complete(updater.new_agent_message(parts))

        async def ask(request: dict) -> None:
            await updater.requires_auth(
                updater.new_agent_message(
                    [new_text_part('Please sign in.'), new_data_part(request)]
                )
            )

        if asked == 'one':
            await complete([data_part(CREATE, metadata=True), data_part(UPDATE, metadata=True)])
        elif asked == 'list':
            await complete([data_part([CREATE, UPDATE], metadata=True)])
        elif asked == 'media-type':
            await complete([data_part(CREATE, media_type=True), data_part(UPDATE, media_type=True)])
        elif asked == 'artifact':
            await updater.add_artifact([data_part(CREATE), data_part(UPDATE)], name='paint')
            await updater.complete()
        elif asked == 'auth-1.0':
            await ask(REQUEST_1_0)
        elif asked == 'auth-0.3':
            await ask(REQUEST_0_3)
        elif asked == 'auth-held':
            await ask(REQUEST_1_0)
            await asyncio.Event().wait()
        elif asked == 'echo':
            received = [MessageToDict(part) for part in context.message.parts]
            await complete([new_text_part(json.dumps(received))])
        else:
            await updater.failed(
                updater.new_agent_message([new_text_part(f'unknown request: {asked}')])
            )

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        await TaskUpdater(event_queue, context.task_id, context.context_id).cancel()


params = Struct()
params.update({'supportedCatalogIds': [CATALOG]})
card = AgentCard(
    name='Scratch Agent',
    description='a scratch agent that answers with A2UI',
    version='0.1.0',
    supported_interfaces=[
        AgentInterface(url=URLS[binding], protocol_binding=binding, protocol_version=version)
        for binding, version in listed
    ],
    capabilities=AgentCapabilities(
        streaming=True,
        extensions=[
            AgentExtension(uri='https://a2ui.org/a2a-extension/a2ui/v0.9.1', params=params)
        ],
    ),
    security_schemes={
        'signIn': SecurityScheme(
            oauth2_security_scheme=OAuth2SecurityScheme(
                flows=OAuthFlows(
                    authorization_code=AuthorizationCodeOAuthFlow(
                        authorization_url=f'{base}/authorize',
                        token_url=f'{base}/token',
                        scopes={
                            'things.read': 'Read your things',
                            'things.write': 'Change your things',
                        },
                    )
                )
            )
        ),
    },
    default_input_modes=['text'],
    default_output_modes=['text'],
    skills=[
        AgentSkill(
            id='scratch',
            name='Scratch',
            description='Answers with A2UI in the spelling asked for',
            tags=['scratch'],
            examples=['one'],
        )
    ],
)

handler = DefaultRequestHandler(
    agent_executor=Scratch(), task_store=InMemoryTaskStore(), agent_card=card
)
routes = [
    *create_agent_card_routes(card),
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
