"""Configuration management for MarkItDown UI."""

import json
from pathlib import Path
from typing import Any

DEFAULT_CONFIG = {
    "llm": {
        "provider": "openai",
        "api_key": "",
        "base_url": "https://api.openai.com/v1",
        "model": "gpt-4o",
        "max_tokens": 4096,
        "temperature": 0.3,
    },
    "conversion": {
        "enable_llm_image": False,
        "enable_llm_audio": False,
        "enable_summary": False,
        "enable_form_cleaning": False,
        "image_prompt": "image",
        "audio_prompt": "audio",
        "zip_recursive": True,
        "encoding": "auto",
    },
    "appearance": {
        "theme": "auto",
        "accent_color": "#0078D4",
        "font_size": 14,
        "font_family": "Segoe UI",
        "window_width": 1200,
        "window_height": 800,
        "sidebar_width": 280,
    },
    "history": {
        "max_items": 100,
        "items": [],
    },
}


class Config:
    """Manages application configuration with JSON persistence."""

    def __init__(self, config_dir: Path | None = None):
        if config_dir is None:
            config_dir = Path.home() / ".markitdown-ui"
        self.config_dir = config_dir
        self.config_dir.mkdir(parents=True, exist_ok=True)
        self.config_file = self.config_dir / "config.json"
        self._data: dict = {}
        self.load()

    def load(self):
        """Load config from file, merging with defaults."""
        self._data = json.loads(json.dumps(DEFAULT_CONFIG))  # deep copy
        if self.config_file.exists():
            try:
                with open(self.config_file, "r", encoding="utf-8") as f:
                    saved = json.load(f)
                self._deep_merge(self._data, saved)
            except (json.JSONDecodeError, OSError):
                pass

    def save(self):
        """Save current config to file."""
        self.config_file.parent.mkdir(parents=True, exist_ok=True)
        with open(self.config_file, "w", encoding="utf-8") as f:
            json.dump(self._data, f, indent=2, ensure_ascii=False)

    def get(self, key: str, default: Any = None) -> Any:
        """Get a config value using dot notation (e.g. 'llm.api_key')."""
        keys = key.split(".")
        val = self._data
        for k in keys:
            if isinstance(val, dict) and k in val:
                val = val[k]
            else:
                return default
        return val

    def set(self, key: str, value: Any):
        """Set a config value using dot notation."""
        keys = key.split(".")
        d = self._data
        for k in keys[:-1]:
            if k not in d:
                d[k] = {}
            d = d[k]
        d[keys[-1]] = value

    @property
    def llm(self) -> dict:
        return self._data.get("llm", {})

    @property
    def conversion(self) -> dict:
        return self._data.get("conversion", {})

    @property
    def appearance(self) -> dict:
        return self._data.get("appearance", {})

    @property
    def history(self) -> dict:
        return self._data.get("history", {})

    def add_history(self, item: dict):
        """Add a conversion history item with timestamp."""
        from datetime import datetime
        item["timestamp"] = datetime.now().isoformat()
        items = self._data.setdefault("history", {}).setdefault("items", [])
        items.insert(0, item)
        max_items = self._data["history"].get("max_items", 100)
        if len(items) > max_items:
            self._data["history"]["items"] = items[:max_items]

    def clear_history(self):
        self._data.setdefault("history", {})["items"] = []

    @staticmethod
    def _deep_merge(base: dict, override: dict):
        for k, v in override.items():
            if k in base and isinstance(base[k], dict) and isinstance(v, dict):
                Config._deep_merge(base[k], v)
            else:
                base[k] = v
