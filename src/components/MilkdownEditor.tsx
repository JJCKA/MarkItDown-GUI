import { useCallback, useMemo, useRef, useState } from 'react'
import { useAppStore } from '@/stores/appStore'
import { marked } from 'marked'

// Configure marked with custom renderer
const renderer = new marked.Renderer()

// Task list items
renderer.listitem = function (token) {
  const text = typeof token === 'string' ? token : (token.text ?? String(token))
  if (token.checked === true || text.startsWith('[x] ') || text.startsWith('[X] ')) {
    const clean = text.replace(/^\[[xX]\]\s*/, '')
    return `<li class="task-list-item"><input type="checkbox" checked disabled> ${clean}</li>\n`
  }
  if (token.checked === false || text.startsWith('[ ] ')) {
    const clean = text.replace(/^\[ \]\s*/, '')
    return `<li class="task-list-item"><input type="checkbox" disabled> ${clean}</li>\n`
  }
  return `<li>${text}</li>\n`
}

// Code blocks with language label
renderer.code = function (token) {
  const text = typeof token === 'string' ? token : (token.text ?? String(token))
  const lang = (typeof token === 'object' && token.lang) ? token.lang : ''
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const langAttr = lang ? ` data-lang="${lang}"` : ''
  return `<pre${langAttr}><code class="language-${lang}">${escaped}</code></pre>\n`
}

marked.setOptions({ breaks: true, gfm: true, renderer })

export default function MarkdownViewer() {
  const { activeResult, viewMode, compareVisible, setActiveResult, setResult } = useAppStore()
  const content = activeResult?.markdown || ''
  const rawContent = activeResult?.raw_markdown || content

  const html = useMemo(() => {
    if (!content) return ''
    try {
      return marked.parse(content) as string
    } catch { return content }
  }, [content])

  const rawHtml = useMemo(() => {
    if (!rawContent) return ''
    try {
      return marked.parse(rawContent) as string
    } catch { return rawContent }
  }, [rawContent])

  // Sync edits back to the result
  const handleSourceEdit = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!activeResult) return
    const updated = { ...activeResult, markdown: e.target.value }
    setActiveResult(updated)
    setResult(activeResult.source_path, updated)
  }, [activeResult, setActiveResult, setResult])

  // Resizable divider for compare mode
  const [dividerPos, setDividerPos] = useState(50)
  const compareDrag = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    compareDrag.current = true
    e.preventDefault()
    const onMove = (ev: MouseEvent) => {
      if (!compareDrag.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const pct = ((ev.clientX - rect.left) / rect.width) * 100
      setDividerPos(Math.max(20, Math.min(80, pct)))
    }
    const onUp = () => {
      compareDrag.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [])

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Toolbar */}
      <EditorToolbar />

      <div ref={containerRef} style={{ flex: 1, overflow: 'hidden', background: 'var(--bg)', display: 'flex' }}>
        {content ? (
          compareVisible ? (
            /* Compare mode: original file text vs final result */
            <>
              <div style={{ width: `${dividerPos}%`, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  height: 28, minHeight: 28, display: 'flex', alignItems: 'center',
                  padding: '0 16px',
                  fontSize: 12, fontWeight: 600, color: 'var(--muted)', fontFamily: 'var(--font-ui)',
                  background: 'var(--sidebar)',
                }}>
                  原始文件提取
                </div>
                <div
                  className="md-preview"
                  style={{ flex: 1, overflow: 'auto', userSelect: 'text' }}
                  dangerouslySetInnerHTML={{ __html: rawHtml }}
                />
              </div>
              <div
                onMouseDown={onDividerMouseDown}
                style={{
                  width: 5, minWidth: 5,
                  background: 'transparent',
                  cursor: 'col-resize',
                  flexShrink: 0,
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  const inner = e.currentTarget.querySelector('div') as HTMLElement
                  if (inner) { inner.style.background = 'var(--accent)'; inner.style.width = '5px' }
                }}
                onMouseLeave={e => {
                  const inner = e.currentTarget.querySelector('div') as HTMLElement
                  if (inner) { inner.style.background = 'var(--border)'; inner.style.width = '1px' }
                }}
              >
                <div style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: 0, width: 1,
                  background: 'var(--border)',
                  transition: 'background 0.15s, width 0.1s',
                }} />
              </div>
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{
                  height: 28, minHeight: 28, display: 'flex', alignItems: 'center',
                  padding: '0 16px',
                  fontSize: 12, fontWeight: 600, color: 'var(--muted)', fontFamily: 'var(--font-ui)',
                  background: 'var(--sidebar)',
                }}>
                  转换结果
                </div>
                <div
                  className="md-preview"
                  style={{ flex: 1, overflow: 'auto', userSelect: 'text' }}
                  dangerouslySetInnerHTML={{ __html: html }}
                />
              </div>
            </>
          ) : viewMode === 'source' ? (
            /* Source editing mode */
            <textarea
              value={content}
              onChange={handleSourceEdit}
              spellCheck={false}
              style={{
                flex: 1, resize: 'none', border: 'none', outline: 'none',
                padding: '24px 32px', margin: 0,
                fontFamily: 'var(--font-mono)',
                fontSize: 14, lineHeight: 1.7,
                color: 'var(--text)',
                background: 'var(--bg)',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                userSelect: 'text',
              }}
            />
          ) : (
            /* Preview mode (default) */
            <div
              className="md-preview"
              style={{
                flex: 1, overflow: 'auto',
                userSelect: 'text',
              }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )
        ) : (
          <div style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--faint)', fontSize: 14,
            fontFamily: 'var(--font-ui)',
            flexDirection: 'column', gap: 12,
            textAlign: 'center', height: '100%',
          }}>
            <div style={{ fontSize: 48, opacity: 0.3 }}>📝</div>
            <div>打开文件并点击「转换」查看 Markdown 内容</div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>
              支持 PDF · Word · Excel · PPT · 图片 · 音频等 30+ 格式
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EditorToolbar() {
  const { activeResult } = useAppStore()
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 1000)
  }

  const handleCopy = useCallback(async () => {
    if (!activeResult) return
    await navigator.clipboard.writeText(activeResult.markdown)
    showToast('已复制')
  }, [activeResult])

  const handleExport = useCallback(async () => {
    if (!activeResult) return
    const defaultName = (activeResult.title || 'output') + '.md'
    const filePath = await window.electronAPI.saveFile(defaultName)
    if (filePath) {
      const port = await window.electronAPI.getBackendPort()
      await fetch(`http://127.0.0.1:${port}/api/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: filePath,
          content: activeResult.markdown,
          source_path: activeResult.source_path,
        }),
      })
      showToast('已导出')
    }
  }, [activeResult])

  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      height: 36, minHeight: 36,
      padding: '0 4px', gap: 2,
      position: 'relative',
    }}>
      <ToolIconBtn onClick={handleCopy} title="复制">
        <CopyIcon />
      </ToolIconBtn>
      <ToolIconBtn onClick={handleExport} title="导出">
        <DownloadIcon />
      </ToolIconBtn>
      {toast && (
        <span style={{
          position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
          fontSize: 18, color: 'var(--faint)',
          fontFamily: 'var(--font-ui)',
          pointerEvents: 'none',
          transition: 'opacity 0.2s',
          opacity: toast ? 1 : 0,
        }}>
          {toast}
        </span>
      )}
    </div>
  )
}

function ToolIconBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 36, height: 36, padding: 0,
        background: 'transparent', border: 'none',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--muted)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.1s, color 0.1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--text)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)' }}
    >
      {children}
    </button>
  )
}

function CopyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="9" y="9" width="13" height="13" rx="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
}
