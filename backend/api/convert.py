"""Conversion API endpoints with SSE progress support."""

import asyncio
import json
import time
from pathlib import Path
from typing import AsyncGenerator

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from backend.core.config import Config
from backend.core.cache import CacheManager
from backend.core.converter import Converter, ConversionResult

router = APIRouter()

config = Config()
cache = CacheManager()
cache.max_items = config.get("cache.max_items", 50)


class ConvertRequest(BaseModel):
    file_path: str


class BatchConvertRequest(BaseModel):
    file_paths: list[str]


def _make_sse_event(event_type: str, data: dict) -> str:
    """Format a Server-Sent Event."""
    payload = json.dumps({"type": event_type, **data}, ensure_ascii=False)
    return f"data: {payload}\n\n"


async def _convert_with_sse(
    file_paths: list[str], use_llm: bool
) -> AsyncGenerator[str, None]:
    """Run conversion and yield SSE events for progress."""
    config.load()
    converter = Converter(config)

    def log(msg: str):
        pass  # logs yielded below

    total = len(file_paths)
    results = []

    for i, fp in enumerate(file_paths):
        name = Path(fp).name
        yield _make_sse_event("progress", {
            "current": i + 1, "total": total, "filename": name
        })
        yield _make_sse_event("log", {
            "message": f"[{i+1}/{total}] 正在转换: {name}"
        })

        start = time.time()
        try:
            if use_llm:
                result = await converter.convert_with_llm(fp)
            else:
                # Run sync convert in thread pool
                loop = asyncio.get_running_loop()
                result = await loop.run_in_executor(None, converter.convert, fp)
        except Exception as e:
            result = ConversionResult(
                Path(fp), success=False, error=str(e),
                elapsed_ms=int((time.time() - start) * 1000)
            )

        results.append(result)
        yield _make_sse_event("result", {
            "source_path": str(result.source_path),
            "markdown": result.markdown,
            "raw_markdown": result.raw_markdown,
            "title": result.title,
            "success": result.success,
            "error": result.error,
            "used_llm": result.used_llm,
            "elapsed_ms": result.elapsed_ms,
            "char_count": result.char_count,
            "word_count": result.word_count,
            "logs": result.logs,
        })

        # Save to history & cache
        config.add_history({
            "file": str(result.source_path),
            "success": result.success,
            "chars": result.char_count,
            "elapsed_ms": result.elapsed_ms,
            "used_llm": result.used_llm,
        })
        if result.success:
            cache.put(str(result.source_path), result.markdown, result.raw_markdown,
                      result.success, result.char_count, result.elapsed_ms, result.used_llm)

    config.save()
    yield _make_sse_event("complete", {"total": len(results)})


@router.post("/convert")
async def convert_basic(req: ConvertRequest):
    """Basic conversion (no LLM)."""
    config.load()  # reload latest settings from disk
    converter = Converter(config)
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, converter.convert, req.file_path)

    config.add_history({
        "file": str(result.source_path),
        "success": result.success,
        "chars": result.char_count,
        "elapsed_ms": result.elapsed_ms,
        "used_llm": False,
    })
    if result.success:
        cache.put(str(result.source_path), result.markdown, result.raw_markdown,
                  result.success, result.char_count, result.elapsed_ms, False)
    config.save()

    return {
        "source_path": str(result.source_path),
        "markdown": result.markdown,
        "raw_markdown": result.raw_markdown,
        "title": result.title,
        "success": result.success,
        "error": result.error,
        "used_llm": False,
        "elapsed_ms": result.elapsed_ms,
        "char_count": result.char_count,
        "word_count": result.word_count,
        "logs": result.logs,
    }


@router.post("/convert/llm")
async def convert_llm(req: ConvertRequest, sse: bool = False):
    """LLM-enhanced conversion."""
    config.load()
    if sse:
        return StreamingResponse(
            _convert_with_sse([req.file_path], use_llm=True),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    converter = Converter(config)
    result = await converter.convert_with_llm(req.file_path)

    config.add_history({
        "file": str(result.source_path),
        "success": result.success,
        "chars": result.char_count,
        "elapsed_ms": result.elapsed_ms,
        "used_llm": result.used_llm,
    })
    if result.success:
        cache.put(str(result.source_path), result.markdown, result.raw_markdown,
                  result.success, result.char_count, result.elapsed_ms, result.used_llm)
    config.save()

    return {
        "source_path": str(result.source_path),
        "markdown": result.markdown,
        "raw_markdown": result.raw_markdown,
        "title": result.title,
        "success": result.success,
        "error": result.error,
        "used_llm": result.used_llm,
        "elapsed_ms": result.elapsed_ms,
        "char_count": result.char_count,
        "word_count": result.word_count,
        "logs": result.logs,
    }


@router.post("/convert/batch")
async def convert_batch(req: BatchConvertRequest, sse: bool = False):
    """Batch conversion (no LLM)."""
    config.load()
    if sse:
        return StreamingResponse(
            _convert_with_sse(req.file_paths, use_llm=False),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    converter = Converter(config)
    loop = asyncio.get_running_loop()
    results = []
    for fp in req.file_paths:
        result = await loop.run_in_executor(None, converter.convert, fp)
        results.append({
            "source_path": str(result.source_path),
            "markdown": result.markdown,
            "raw_markdown": result.raw_markdown,
            "title": result.title,
            "success": result.success,
            "error": result.error,
            "used_llm": False,
            "elapsed_ms": result.elapsed_ms,
            "char_count": result.char_count,
            "word_count": result.word_count,
            "logs": result.logs,
        })
        config.add_history({
            "file": str(result.source_path),
            "success": result.success,
            "chars": result.char_count,
            "elapsed_ms": result.elapsed_ms,
            "used_llm": False,
        })
        if result.success:
            cache.put(str(result.source_path), result.markdown, result.raw_markdown,
                      result.success, result.char_count, result.elapsed_ms, False)

    config.save()
    return results


@router.post("/convert/batch/llm")
async def convert_batch_llm(req: BatchConvertRequest, sse: bool = False):
    """Batch LLM conversion."""
    config.load()
    if sse:
        return StreamingResponse(
            _convert_with_sse(req.file_paths, use_llm=True),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    converter = Converter(config)
    results = []
    for fp in req.file_paths:
        result = await converter.convert_with_llm(fp)
        results.append({
            "source_path": str(result.source_path),
            "markdown": result.markdown,
            "raw_markdown": result.raw_markdown,
            "title": result.title,
            "success": result.success,
            "error": result.error,
            "used_llm": result.used_llm,
            "elapsed_ms": result.elapsed_ms,
            "char_count": result.char_count,
            "word_count": result.word_count,
            "logs": result.logs,
        })
        config.add_history({
            "file": str(result.source_path),
            "success": result.success,
            "chars": result.char_count,
            "elapsed_ms": result.elapsed_ms,
            "used_llm": result.used_llm,
        })
        if result.success:
            cache.put(str(result.source_path), result.markdown, result.raw_markdown,
                      result.success, result.char_count, result.elapsed_ms, result.used_llm)

    config.save()
    return results
