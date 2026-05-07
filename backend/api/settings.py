"""Settings API endpoints."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Any

from backend.core.config import Config
from backend.core.llm_client import LLMClient

router = APIRouter()
config = Config()


class LLMConfigModel(BaseModel):
    provider: str = "openai"
    api_key: str = ""
    base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-4o"
    max_tokens: int = 4096
    temperature: float = 0.3


class SettingsModel(BaseModel):
    llm: dict[str, Any] | None = None
    conversion: dict[str, Any] | None = None
    appearance: dict[str, Any] | None = None


@router.get("/settings")
async def get_settings():
    """Get all settings."""
    return {
        "llm": config.llm,
        "conversion": config.conversion,
        "appearance": config.appearance,
    }


@router.put("/settings")
async def update_settings(settings: SettingsModel):
    """Update settings."""
    if settings.llm:
        for key, value in settings.llm.items():
            config.set(f"llm.{key}", value)
    if settings.conversion:
        for key, value in settings.conversion.items():
            config.set(f"conversion.{key}", value)
    if settings.appearance:
        for key, value in settings.appearance.items():
            config.set(f"appearance.{key}", value)
    config.save()
    return {"success": True}


@router.post("/settings/test-llm")
async def test_llm_connection(llm_config: LLMConfigModel):
    """Test LLM API connection."""
    # Temporarily apply config
    for key in ["provider", "api_key", "base_url", "model", "max_tokens", "temperature"]:
        config.set(f"llm.{key}", getattr(llm_config, key))

    client = LLMClient(config)
    success, message = await client.test_connection()
    return {"success": success, "message": message}


@router.get("/settings/history")
async def get_history():
    """Get conversion history."""
    return config.history.get("items", [])


@router.delete("/settings/history")
async def clear_history():
    """Clear all history."""
    config.clear_history()
    config.save()
    return {"success": True}
