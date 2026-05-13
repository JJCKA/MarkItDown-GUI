"""Conversion result cache — single JSON file for all cached results."""

import json
from pathlib import Path
from datetime import datetime


class CacheManager:
    """Manages a single cache.json file storing conversion results."""

    def __init__(self, cache_path: Path | None = None):
        if cache_path is None:
            cache_path = Path.home() / ".markitdown-ui" / "cache.json"
        self.cache_path = Path(cache_path)
        self.cache_path.parent.mkdir(parents=True, exist_ok=True)
        self._items: list[dict] = []
        self._max_items: int = 50
        self.load()

    def load(self):
        """Load cache from disk."""
        if self.cache_path.exists():
            try:
                with open(self.cache_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, list):
                    self._items = data
            except (json.JSONDecodeError, OSError):
                self._items = []

    def save(self):
        """Save cache to disk."""
        self.cache_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.cache_path, "w", encoding="utf-8") as f:
            json.dump(self._items, f, ensure_ascii=False)

    @property
    def max_items(self) -> int:
        return self._max_items

    @max_items.setter
    def max_items(self, value: int):
        self._max_items = max(1, min(500, value))

    @property
    def count(self) -> int:
        return len(self._items)

    @property
    def cached_files(self) -> set[str]:
        """Set of file paths that are cached."""
        return {item["file"] for item in self._items}

    def get(self, file_path: str) -> dict | None:
        """Get cached result for a file."""
        for item in self._items:
            if item.get("file") == file_path:
                return item
        return None

    def put(self, file_path: str, markdown: str, raw_markdown: str,
            success: bool = True, chars: int = 0, elapsed_ms: int = 0,
            used_llm: bool = False):
        """Store a conversion result in cache. Updates existing entry if present."""
        # Remove existing entry for this file
        self._items = [i for i in self._items if i.get("file") != file_path]

        entry = {
            "file": file_path,
            "markdown": markdown,
            "raw_markdown": raw_markdown,
            "success": success,
            "chars": chars,
            "elapsed_ms": elapsed_ms,
            "used_llm": used_llm,
            "cached_at": datetime.now().isoformat(),
        }
        self._items.insert(0, entry)

        # Trim to max
        if len(self._items) > self._max_items:
            self._items = self._items[:self._max_items]

        self.save()

    def clear(self):
        """Clear all cached results."""
        self._items = []
        self.save()
