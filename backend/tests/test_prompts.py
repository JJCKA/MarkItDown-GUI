"""Unit tests for prompts module."""

import pytest
from backend.prompts.builtin import (
    PROMPTS,
    IMAGE_EXTENSIONS,
    AUDIO_EXTENSIONS,
    TABLE_EXTENSIONS,
    CODE_EXTENSIONS,
    DOCUMENT_EXTENSIONS,
    get_prompt_for_file,
    SYSTEM_PROMPT_STRICT,
    FORM_CLEANING_PROMPT,
)


class TestPrompts:
    """Test prompt templates and extension classification."""

    def test_all_prompts_have_required_fields(self):
        """Every prompt should have name and prompt fields."""
        for key, prompt in PROMPTS.items():
            assert "name" in prompt, f"Missing name in {key}"
            assert "prompt" in prompt, f"Missing prompt in {key}"
            assert len(prompt["prompt"]) > 10, f"Prompt {key} is too short"

    def test_system_prompt_is_strict(self):
        """System prompt should contain anti-fluff instructions."""
        assert "无情" in SYSTEM_PROMPT_STRICT or "对话性废话" in SYSTEM_PROMPT_STRICT

    def test_form_cleaning_prompt_has_rules(self):
        """Form cleaning prompt should contain all 5 rules."""
        assert "提取键值对" in FORM_CLEANING_PROMPT
        assert "释放长文本" in FORM_CLEANING_PROMPT
        assert "保留真实表格" in FORM_CLEANING_PROMPT
        assert "修复层级" in FORM_CLEANING_PROMPT
        assert "保持内容完整" in FORM_CLEANING_PROMPT

    def test_image_extensions(self):
        """Common image formats should be recognized."""
        assert ".jpg" in IMAGE_EXTENSIONS
        assert ".png" in IMAGE_EXTENSIONS

    def test_audio_extensions(self):
        """Common audio formats should be recognized."""
        assert ".mp3" in AUDIO_EXTENSIONS
        assert ".wav" in AUDIO_EXTENSIONS

    def test_document_extensions(self):
        """Document formats should include PDF and Office."""
        assert ".pdf" in DOCUMENT_EXTENSIONS
        assert ".docx" in DOCUMENT_EXTENSIONS

    def test_get_prompt_for_image(self):
        """Image files should return image prompt."""
        result = get_prompt_for_file(".jpg")
        assert result is not None
        assert result["name"] == "图像描述"

    def test_get_prompt_for_audio(self):
        """Audio files should return audio prompt."""
        result = get_prompt_for_file(".mp3")
        assert result is not None
        assert result["name"] == "音频转录"

    def test_get_prompt_for_unknown(self):
        """Unknown extension should return None."""
        result = get_prompt_for_file(".xyz")
        assert result is None

    def test_extensions_are_disjoint(self):
        """No extension should be in more than one category."""
        all_sets = [IMAGE_EXTENSIONS, AUDIO_EXTENSIONS, TABLE_EXTENSIONS, CODE_EXTENSIONS]
        seen = set()
        for s in all_sets:
            overlap = seen & s
            assert not overlap, f"Duplicated extensions: {overlap}"
            seen |= s

    def test_code_extensions(self):
        """Common code formats should be recognized."""
        assert ".py" in CODE_EXTENSIONS
        assert ".js" in CODE_EXTENSIONS
        assert ".ts" in CODE_EXTENSIONS
