"""MarkItDown GUI — FastAPI backend."""

import os
import sys
import traceback
from pathlib import Path

# Log to file for debugging on packaged builds
LOG_FILE = Path.home() / ".markitdown-ui" / "backend.log"
LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

def log(msg: str):
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(msg + "\n")
    except Exception:
        pass

log(f"Backend starting, Python {sys.version}, exe: {sys.executable}")

# Ensure backend dir is on path
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    import uvicorn
    from fastapi import FastAPI, Request
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import JSONResponse

    from backend.core.config import Config
    from backend.api.convert import router as convert_router
    from backend.api.settings import router as settings_router
except Exception as e:
    log(f"Import error: {e}\n{traceback.format_exc()}")
    raise

app = FastAPI(title="MarkItDown GUI Backend", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler — log all 500 errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log(f"500 on {request.method} {request.url.path}: {exc}\n{traceback.format_exc()}")
    return JSONResponse(status_code=500, content={"detail": str(exc)})

app.include_router(convert_router, prefix="/api")
app.include_router(settings_router, prefix="/api")

config = Config()


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/health")
async def api_health():
    return {"status": "ok", "version": "2.0.0"}


@app.post("/api/export")
async def export_file(body: dict):
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
    log(f"Starting on port {port}")
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")


if __name__ == "__main__":
    main()
