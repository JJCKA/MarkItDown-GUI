"""Unit tests for Converter module — pure functions."""

import pytest
from pathlib import Path

from backend.core.converter import Converter, ConversionResult
from backend.core.config import Config


class TestConverterPureFunctions:
    """Test pure functions that don't need I/O."""

    def setup_method(self):
        self.config = Config()
        self.converter = Converter(self.config)

    def test_conversion_result_properties(self):
        """ConversionResult char_count and word_count."""
        r = ConversionResult(
            Path("/test/file.pdf"),
            markdown="# Hello\n\nThis is a test.\n\nAnother sentence.",
        )
        assert r.char_count == len(r.markdown)
        assert r.word_count == 8  # #, Hello, This, is, a, test., Another, sentence.

    def test_empty_result(self):
        """Empty markdown should have zero counts."""
        r = ConversionResult(Path("/test/file.pdf"), markdown="")
        assert r.char_count == 0
        assert r.word_count == 0

    def test_result_title_defaults_to_stem(self):
        """Title should default to filename stem."""
        r = ConversionResult(Path("/data/document.pdf"))
        assert r.title == "document"

    def test_result_custom_title(self):
        """Custom title should override default."""
        r = ConversionResult(Path("/data/doc.pdf"), title="Custom Title")
        assert r.title == "Custom Title"

    def test_find_best_split_level_h1(self):
        """Should find H1 when multiple exist."""
        md = "# Section 1\ncontent\n# Section 2\nmore content"
        level = Converter._find_best_split_level(md)
        assert level == 1

    def test_find_best_split_level_h2(self):
        """Should fall through to H2 when H1 has only 1 occurrence."""
        md = "# Title\n\n## Section 1\ncontent\n## Section 2\nmore"
        level = Converter._find_best_split_level(md)
        assert level == 2

    def test_find_best_split_level_default(self):
        """Should default to 2 when no level has >=2."""
        md = "# Title\n\ncontent without subheadings"
        level = Converter._find_best_split_level(md)
        assert level == 2

    def test_adjust_heading_levels_noop(self):
        """Same from/to should be no-op."""
        text = "### Heading 3\ncontent"
        result = Converter._adjust_heading_levels(text, 4, 4)
        assert result == text

    def test_adjust_heading_levels_upgrade(self):
        """Level upgrade should reduce # count."""
        text = "#### H4\ncontent\n##### H5"
        result = Converter._adjust_heading_levels(text, 4, 2)
        # #### (4) -> ## (2), ##### (5) -> ### (3)
        assert "## H4" in result
        assert "### H5" in result

    def test_adjust_heading_levels_downgrade(self):
        """Level downgrade should increase # count."""
        text = "## H2\ncontent\n### H3"
        result = Converter._adjust_heading_levels(text, 2, 4)
        # ## (2) -> #### (4), ### (3) -> ##### (5)
        assert "#### H2" in result
        assert "##### H3" in result

    def test_adjust_heading_levels_clamp(self):
        """Should clamp levels to 1-6."""
        text = "## H2"
        # Downgrade too much — clamp at 6
        result = Converter._adjust_heading_levels(text, 2, 6)
        assert result.startswith("######")

    def test_is_inside_table_true(self):
        """Should detect that a line is inside a table."""
        lines = [
            "| Header | Value |",
            "|--------|-------|",
            "# Section",
            "| Data   | 123   |",
        ]
        # Line 3 is a table data row, should be detected as inside table
        assert Converter._is_inside_table(lines, 3) is True

    def test_is_inside_table_false(self):
        """Should detect that a line is NOT inside a table."""
        lines = [
            "Some text",
            "",
            "# Section",
            "More text",
        ]
        assert Converter._is_inside_table(lines, 2) is False

    def test_smart_split_small_document(self):
        """Small document should not be split."""
        md = "# Title\n\nShort content."
        chunks = self.converter._smart_split(md, 12000)
        assert len(chunks) == 1
        assert chunks[0] == md

    def test_smart_split_at_headings(self):
        """Should split at headings when document is large enough."""
        md = "# A\n" + "x" * 100 + "\n# B\n" + "y" * 100
        # Total is ~220 chars; use threshold of 80 to split into 2 chunks
        chunks = self.converter._smart_split(md, 80)
        assert len(chunks) >= 2

    def test_get_heading_level_at(self):
        """Should find the heading level at a position."""
        md = "# Title\n\n## Section 1\n\ncontent here"
        pos = md.index("content")
        level = Converter._get_heading_level_at(md, pos)
        assert level == 2

    def test_get_heading_level_at_top_level(self):
        """Default to 2 when no heading before position."""
        md = "just some text with no heading\nmore text"
        level = Converter._get_heading_level_at(md, 10)
        assert level == 2


class TestConverterWithConfig:
    """Tests that depend on config state."""

    def test_llm_lazy_init(self):
        """LLM client should be lazily initialized."""
        cfg = Config()
        converter = Converter(cfg)
        # Should not be created yet
        assert converter._llm is None
        # Access should create it
        client = converter.llm
        assert client is not None
        assert converter._llm is not None

    def test_convert_file_not_found(self):
        """Converting nonexistent file should return error."""
        cfg = Config()
        converter = Converter(cfg)
        result = converter.convert("/nonexistent/path/file.pdf")
        assert result.success is False
        assert "不存在" in result.error
