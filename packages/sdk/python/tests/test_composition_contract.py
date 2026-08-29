"""Asserts this projection against the normative contract (packages/sdk/contracts)."""

import dataclasses
import json
from pathlib import Path

from a2uiverse_sdk import (
    COMPOSITION_EXTENSION_URI,
    SLOT_ARCHETYPES,
    SlotRequest,
    read_slot_request,
)

CONTRACT = json.loads(
    (Path(__file__).parent / ".." / ".." / "contracts" / "composition.v0.1.json").read_text()
)


def test_constants_match_the_contract():
    assert COMPOSITION_EXTENSION_URI == CONTRACT["extensionUri"]
    assert list(SLOT_ARCHETYPES) == CONTRACT["slotArchetypes"]


def test_slot_request_fields_match_the_contract():
    shape = CONTRACT["shapes"]["slotRequest"]
    field_names = {f.name for f in dataclasses.fields(SlotRequest)}
    assert field_names == set(shape["required"]) | set(shape["optional"])


def test_read_slot_request_round_trips():
    request = SlotRequest(archetype="panel", budget="medium")
    assert read_slot_request(request.to_metadata()) == request


def test_read_slot_request_rejects_malformed_metadata():
    assert read_slot_request(None) is None
    assert read_slot_request({}) is None
    assert read_slot_request({COMPOSITION_EXTENSION_URI: "panel"}) is None
    assert read_slot_request({COMPOSITION_EXTENSION_URI: {"archetype": "panel"}}) is None
