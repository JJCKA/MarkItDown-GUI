"""Settings API endpoints."""

from pathlib import Path
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Any

from backend.core.config import Config
from backend.core.cache import CacheManager
from backend.core.llm_client import LLMClient

router = APIRouter()
config = Config()
cache = CacheManager()
cache.max_items = config.get("cache.max_items", 50)


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
    config.load()
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
    # Create a temporary config to avoid mutating the global one
    import tempfile
    tmp_cfg = Config(Path(tempfile.mkdtemp()))
    for key in ["provider", "api_key", "base_url", "model", "max_tokens", "temperature"]:
        tmp_cfg.set(f"llm.{key}", getattr(llm_config, key))
    client = LLMClient(tmp_cfg)
    success, message = await client.test_connection()
    return {"success": success, "message": message}


@router.get("/settings/history")
async def get_history():
    """Get conversion history, enriched with cached markdown."""
    config.load()
    cache.load()
    items = config.history.get("items", [])
    result = []
    for item in items:
        enriched = dict(item)
        cached = cache.get(item.get("file", ""))
        if cached:
            enriched["markdown"] = cached.get("markdown", "")
            enriched["raw_markdown"] = cached.get("raw_markdown", "")
            enriched["cached"] = True
        else:
            enriched["cached"] = False
        result.append(enriched)
    return result


@router.delete("/settings/history")
async def clear_history():
    """Clear all history."""
    config.clear_history()
    config.save()
    return {"success": True}


@router.get("/settings/cache")
async def get_cache_info():
    """Get cache info and cached file list."""
    cache.load()
    return {
        "count": cache.count,
        "max_items": cache.max_items,
        "cached_files": list(cache.cached_files),
    }


@router.get("/settings/cache/{file_path:path}")
async def get_cache_item(file_path: str):
    """Get a cached result by file path."""
    item = cache.get(file_path)
    if item:
        return item
    return {"error": "not found"}


@router.put("/settings/cache-config")
async def update_cache_config(body: dict):
    """Update cache settings."""
    max_items = body.get("max_items")
    if max_items is not None:
        cache.max_items = int(max_items)
        config.set("cache.max_items", cache.max_items)
        config.save()
    return {"success": True, "max_items": cache.max_items}


@router.delete("/settings/cache")
async def clear_cache():
    """Clear all cached results."""
    cache.clear()
    return {"success": True}
