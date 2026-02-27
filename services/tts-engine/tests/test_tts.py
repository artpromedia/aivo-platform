"""Basic tests for the TTS engine API."""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "tts-engine"
    assert "voices_loaded" in data


def test_list_voices(client):
    response = client.get("/voices")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_synthesize_missing_voice(client):
    response = client.post(
        "/synthesize",
        json={
            "text": "Hello world",
            "voice": "nonexistent-voice",
        },
    )
    assert response.status_code == 404


def test_synthesize_empty_text(client):
    response = client.post(
        "/synthesize",
        json={
            "text": "",
            "voice": "en_US-amy-medium",
        },
    )
    # Pydantic validation should reject empty text
    assert response.status_code == 422
