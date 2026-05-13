# API 参考文档

## 后端端点

后端为 FastAPI 应用，运行在 `127.0.0.1:<随机端口>`。

### 健康检查

```
GET /health
→ { "status": "ok" }

GET /api/health
→ { "status": "ok", "version": "2.1.0" }
```

### 基础转换

```
POST /api/convert
Body: { "file_path": "E:/path/to/file.pdf" }
→ {
    "source_path": "...", "markdown": "...", "raw_markdown": "...",
    "title": "...", "success": true, "error": "",
    "used_llm": false, "elapsed_ms": 1500,
    "char_count": 8500, "word_count": 1200,
    "logs": ["正在转换: file.pdf", "转换完成: ..."]
  }
```

`raw_markdown` 始终等于 `markdown`（基础转换无 LLM 增强）。

### LLM 增强转换

```
POST /api/convert/llm
Body: { "file_path": "..." }
→ 同上，used_llm: true
  raw_markdown = markitdown 原始提取结果
  markdown = LLM 增强后的结果

# SSE 模式
POST /api/convert/llm?sse=1
→ text/event-stream:
  data: {"type":"progress","current":1,"total":1,"filename":"..."}
  data: {"type":"log","message":"..."}
  data: {"type":"result",...}
  data: {"type":"complete","total":1}
```

### 批量转换

```
POST /api/convert/batch        # 基础
POST /api/convert/batch/llm    # LLM 增强
Body: { "file_paths": ["...", "..."] }
→ ConversionResult[]
```

支持 `?sse=1` 流式。

### 设置

```
GET /api/settings
→ { "llm": {...}, "conversion": {...}, "appearance": {...} }

PUT /api/settings
Body: { "llm": { "api_key": "sk-..." }, "conversion": { "enable_summary": true } }
→ { "success": true }
```

支持部分更新，只发送需要修改的字段。

### LLM 连接测试

```
POST /api/settings/test-llm
Body: { "provider": "openai", "api_key": "sk-...", "base_url": "...", "model": "gpt-4o", ... }
→ { "success": true, "message": "连接成功！" }
```

### 历史记录

```
GET /api/settings/history
→ [
    {
      "file": "...", "success": true, "chars": 8500,
      "elapsed_ms": 1500, "used_llm": false,
      "timestamp": "2026-05-09T15:30:00.000000",
      "cached": true,
      "markdown": "...",        // 仅当 cached=true 时存在
      "raw_markdown": "..."     // 仅当 cached=true 时存在
    }
  ]

DELETE /api/settings/history
→ { "success": true }
```

历史记录自动与缓存数据合并返回。`cached` 字段标记该记录是否有缓存的转换结果。

### 缓存管理

```
GET /api/settings/cache
→ { "count": 15, "max_items": 50, "cached_files": ["E:/file1.pdf", ...] }

GET /api/settings/cache/{file_path}
→ { "file": "...", "markdown": "...", "raw_markdown": "...", ... }

PUT /api/settings/cache-config
Body: { "max_items": 100 }
→ { "success": true, "max_items": 100 }

DELETE /api/settings/cache
→ { "success": true }
```

### 导出

```
POST /api/export
Body: {
  "path": "E:/output.md",
  "content": "# Markdown content",
  "source_path": "E:/original.pdf"   // 可选，用于更新缓存
}
→ { "success": true }
```

如果提供 `source_path`，导出时会自动更新该文件的缓存（用于保存用户编辑后的内容）。

## 核心类

### Config

```python
class Config:
    def __init__(config_dir: Path | None = None)  # 默认 ~/.markitdown-ui/
    def load()                                      # 从 JSON 加载
    def save()                                      # 持久化到 JSON
    def get(key: str, default=None)                 # 点号路径读取
    def set(key: str, value)                        # 点号路径写入
    def add_history(item: dict)                     # 添加历史（自动截断+时间戳）
    def clear_history()
```

### CacheManager

```python
class CacheManager:
    def __init__(cache_path: Path | None = None)  # 默认 ~/.markitdown-ui/cache.json
    def load()                                      # 从 JSON 加载
    def save()                                      # 持久化到 JSON
    def get(file_path: str) -> dict | None          # 获取缓存
    def put(file_path, markdown, raw_markdown, ...) # 存入缓存
    def clear()                                     # 清空缓存
    @property count -> int                          # 当前缓存条数
    @property cached_files -> set[str]              # 已缓存的文件路径集合
    max_items: int                                  # 最大缓存条数
```

### Converter

```python
class Converter:
    def __init__(config: Config, log: Callable | None = None)

    def convert(file_path: str | Path) -> ConversionResult
        # 同步，基础转换（markitdown + .doc 预处理）

    async def convert_with_llm(file_path: str | Path) -> ConversionResult
        # async，基础转换 + LLM 增强全流程
```

### ConversionResult

```python
class ConversionResult:
    source_path: Path
    markdown: str           # 最终结果（LLM 增强后，或基础转换结果）
    raw_markdown: str       # markitdown 原始提取结果（LLM 前）
    title: str
    success: bool
    error: str
    used_llm: bool
    elapsed_ms: int
    char_count: int
    word_count: int
    logs: list[str]
```

### LLMClient

```python
class LLMClient:
    def __init__(config: Config)
    async def test_connection() -> tuple[bool, str]
    async def analyze_image(image_path, prompt) -> str
    async def chat(prompt, system="") -> str
```

## 前端 API 客户端

`src/api/client.ts` 提供与后端对应的函数：

```typescript
convertFile(path, useLlm, onProgress?, onLog?) → ConversionResult
convertFilesBatch(paths, useLlm, onProgress?, onLog?) → ConversionResult[]
getSettings() → any
saveSettings(settings) → void
testLLMConnection(config) → { success, message }
getHistory() → HistoryItem[]
clearHistory() → void
getCacheInfo() → { count, max_items, cached_files }
updateCacheConfig(maxItems) → void
clearCache() → void
```

所有函数通过 `window.electronAPI.getBackendPort()` 获取动态端口。
