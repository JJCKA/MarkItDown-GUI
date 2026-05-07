# LLM 集成与算法详解

## LLM 客户端

`LLMClient` 封装 OpenAI 兼容的 Chat Completions API。

- `analyze_image(path, prompt)` — 图片 Base64 编码，发送多模态请求
- `chat(prompt)` — 纯文本对话，始终注入 `SYSTEM_PROMPT_STRICT` 禁止废话
- `test_connection()` — GET `/models` 验证配置

所有请求通过 `httpx.AsyncClient` 异步发送，超时 120 秒。

## Prompt 设计

所有 Prompt 存储在 `backend/prompts/builtin.py`。

**系统级指令**：`SYSTEM_PROMPT_STRICT` 强制 LLM 以文档处理引擎模式工作，禁止问候语、解释语等对话性输出。

**功能 Prompt**：

- `IMAGE_PROMPT` — 描述图片内容，完整提取文字
- `AUDIO_PROMPT` — 音频转录
- `DOCUMENT_SUMMARY_PROMPT` — 输出核心主题、关键要点、结构分析
- `FORM_CLEANING_PROMPT` — 5 条转换规则（键值对提取、长文本释放、真实表格保留、层级修复、内容完整）

## 文档分块算法

`Converter._smart_split(markdown, max_chunk_size=12000)`：

1. 调用 `_find_best_split_level` 找到最佳标题层级（从 H1 到 H4，第一个出现 ≥2 次的层级）
2. 按该层级标题边界分割文档
3. `_is_inside_table` 跳过表格内部分割点
4. 合并过小块（< max_chunk_size），递归分割超大块（> 1.5x）

## 图片提取

`Converter._extract_images(file_path)` 根据文件类型调用：

| 格式 | 方法 | 依赖 |
|------|------|------|
| DOCX | `_extract_images_from_docx` | python-docx，读取 `part.rels` |
| PPTX | `_extract_images_from_pptx` | python-pptx，遍历 `shape.shape_type == 13` |
| PDF | `_extract_images_from_pdf` | pdfplumber，裁剪页面区域转 PNG |

## 表单清洗回退

`_clean_form` 清洗后检查内容保留率。若 `cleaned_len / original_len < 0.5`，认为 LLM 误删内容，自动回退到原始 Markdown 并追加警告。

## LLM 异常处理

所有 LLM 调用在 `convert_with_llm` 的 try/except 内。异常不会阻断转换——错误信息追加到 Markdown 末尾，日志同步输出到前端。
