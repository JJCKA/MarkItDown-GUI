"""LLM API client for image/audio analysis."""

import base64
import httpx
from pathlib import Path

from backend.core.config import Config
from backend.prompts.builtin import SYSTEM_PROMPT_STRICT


class LLMClient:
    """OpenAI-compatible LLM client for multimodal analysis."""

    def __init__(self, config: Config):
        self.config = config

    def _get_headers(self) -> dict:
        api_key = self.config.get("llm.api_key", "")
        return {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

    def _get_base_url(self) -> str:
        url = self.config.get("llm.base_url", "https://api.openai.com/v1")
        return url.rstrip("/")

    async def test_connection(self) -> tuple[bool, str]:
        """Test the LLM API connection. Returns (success, message)."""
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(
                    f"{self._get_base_url()}/models",
                    headers=self._get_headers(),
                )
                if resp.status_code == 200:
                    return True, "连接成功！"
                return False, f"HTTP {resp.status_code}: {resp.text[:200]}"
        except Exception as e:
            return False, f"连接失败: {str(e)}"

    async def analyze_image(self, image_path: str | Path, prompt: str) -> str:
        """Analyze an image using the LLM vision capability."""
        image_path = Path(image_path)
        suffix = image_path.suffix.lower()
        mime_map = {
            ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
            ".png": "image/png", ".gif": "image/gif",
            ".bmp": "image/bmp", ".webp": "image/webp",
            ".svg": "image/svg+xml", ".tiff": "image/tiff",
        }
        mime_type = mime_map.get(suffix, "image/png")

        with open(image_path, "rb") as f:
            img_b64 = base64.b64encode(f.read()).decode()

        model = self.config.get("llm.model", "gpt-4o")
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT_STRICT},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{img_b64}"
                            },
                        },
                    ],
                }
            ],
            "max_tokens": self.config.get("llm.max_tokens", 4096),
            "temperature": self.config.get("llm.temperature", 0.3),
        }

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{self._get_base_url()}/chat/completions",
                headers=self._get_headers(),
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]

    async def chat(self, prompt: str, system: str = "") -> str:
        """Send a text-only chat request to the LLM."""
        model = self.config.get("llm.model", "gpt-4o")
        messages = []
        effective_system = SYSTEM_PROMPT_STRICT
        if system:
            effective_system = f"{SYSTEM_PROMPT_STRICT}\n\n{system}"
        messages.append({"role": "system", "content": effective_system})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": self.config.get("llm.max_tokens", 4096),
            "temperature": self.config.get("llm.temperature", 0.3),
        }

        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(
                f"{self._get_base_url()}/chat/completions",
                headers=self._get_headers(),
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
