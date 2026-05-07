"""MarkItDown GUI — FastAPI backend."""

import os
import sys
from pathlib import Path

# Ensure backend dir is on path
sys.path.insert(0, str(Path(__file__).parent.parent))

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import Config
from backend.api.convert import router as convert_router
from backend.api.settings import router as settings_router

app = FastAPI(title="MarkItDown GUI Backend", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(convert_router, prefix="/api")
app.include_router(settings_router, prefix="/api")

# Shared config instance
config = Config()


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/health")
async def api_health():
    return {"status": "ok", "version": "2.0.0"}


@app.post("/api/export")
async def export_file(body: dict):
    """Export markdown content to a file."""
    try:
        path = body.get("path", "")
        content = body.get("content", "")
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


def main():
    port = int(os.environ.get("PORT", 18720))
    print(f"[Backend] Starting on port {port}...")
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")


if __name__ == "__main__":
    main()
