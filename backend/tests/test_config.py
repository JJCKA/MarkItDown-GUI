"""Unit tests for Config module."""

import json
import tempfile
from pathlib import Path
import pytest

from backend.core.config import Config, DEFAULT_CONFIG


class TestConfig:
    """Test Config persistence, dot-notation access, and deep merge."""

    def test_default_values(self):
        """Fresh config should have all defaults."""
        with tempfile.TemporaryDirectory() as tmp:
            cfg = Config(Path(tmp))
            assert cfg.get("llm.model") == "gpt-4o"
            assert cfg.get("llm.provider") == "openai"
            assert cfg.get("appearance.font_size") == 14
            assert cfg.get("conversion.zip_recursive") is True
            assert cfg.get("nonexistent.key", "fallback") == "fallback"

    def test_set_and_get(self):
        """Dot-notation set/get should work."""
        with tempfile.TemporaryDirectory() as tmp:
            cfg = Config(Path(tmp))
            cfg.set("llm.model", "claude-sonnet-4-6")
            assert cfg.get("llm.model") == "claude-sonnet-4-6"

            cfg.set("appearance.font_size", 18)
            assert cfg.get("appearance.font_size") == 18

    def test_persistence(self):
        """Saving and loading should preserve values."""
        with tempfile.TemporaryDirectory() as tmp:
            cfg = Config(Path(tmp))
            cfg.set("llm.api_key", "sk-test-123")
            cfg.set("conversion.enable_summary", True)
            cfg.save()

            # Load fresh
            cfg2 = Config(Path(tmp))
            assert cfg2.get("llm.api_key") == "sk-test-123"
            assert cfg2.get("conversion.enable_summary") is True

    def test_deep_merge_preserves_defaults(self):
        """Loading partial config should keep missing defaults."""
        with tempfile.TemporaryDirectory() as tmp:
            cfg = Config(Path(tmp))
            # Write only a partial config
            partial = {"llm": {"model": "custom-model"}}
            cfg.config_file.write_text(json.dumps(partial), encoding="utf-8")

            cfg2 = Config(Path(tmp))
            # New key is present
            assert cfg2.get("llm.model") == "custom-model"
            # Default keys still present
            assert cfg2.get("llm.provider") == "openai"
            assert cfg2.get("llm.temperature") == 0.3

    def test_history_operations(self):
        """History add and clear should work."""
        with tempfile.TemporaryDirectory() as tmp:
            cfg = Config(Path(tmp))
            cfg.add_history({"file": "/test.pdf", "success": True})
            cfg.add_history({"file": "/test2.docx", "success": False})

            items = cfg.history.get("items", [])
            assert len(items) == 2
            # Most recent first
            assert items[0]["file"] == "/test2.docx"

            cfg.clear_history()
            assert cfg.history.get("items", []) == []

    def test_history_max_items(self):
        """History should respect max_items limit."""
        with tempfile.TemporaryDirectory() as tmp:
            cfg = Config(Path(tmp))
            cfg.set("history.max_items", 5)
            for i in range(10):
                cfg.add_history({"file": f"/test{i}.pdf", "success": True})

            items = cfg.history.get("items", [])
            assert len(items) == 5

    def test_property_access(self):
        """Property shortcuts should return correct data."""
        with tempfile.TemporaryDirectory() as tmp:
            cfg = Config(Path(tmp))
            assert isinstance(cfg.llm, dict)
            assert isinstance(cfg.conversion, dict)
            assert isinstance(cfg.appearance, dict)
            assert isinstance(cfg.history, dict)

    def test_corrupted_config_recovery(self):
        """Corrupted config file should not crash — fall back to defaults."""
        with tempfile.TemporaryDirectory() as tmp:
            cfg = Config(Path(tmp))
            cfg.config_file.write_text("not valid json{{{", encoding="utf-8")

            cfg2 = Config(Path(tmp))
            # Should have all defaults
            assert cfg2.get("llm.model") == "gpt-4o"
