import { useCallback } from 'react'
import { useAppStore } from '@/stores/appStore'
import * as api from '@/api/client'
import { Path as PathUtil } from '@/utils/path'

export default function BottomBar() {
  const {
    statusText, charCount, elapsedMs,
    progress, isConverting, setIsConverting,
    setProgress, setStatusText, setCharCount, setElapsedMs,
    selectedPaths, setActiveResult, addConverted, addLog, clearLogs,
    logs, logVisible, toggleLog,
    activeResult, setResult,
    setShowLLMPopup, showLLMPopup,
    sidebarVisible, toggleSidebar,
    isSourceMode, toggleSourceMode,
  } = useAppStore()

  const handleConvert = useCallback(async (useLlm: boolean) => {
    if (isConverting) return
    if (!selectedPaths.length) {
      setStatusText('请先选择文件')
      return
    }

    clearLogs()
    setIsConverting(true)
    setProgress({ current: 0, total: selectedPaths.length, filename: '' })

    const onProgress = (p: api.ConversionProgress) => setProgress(p)
    const onLog = (msg: string) => addLog(msg)

    try {
      if (selectedPaths.length === 1) {
        const result = await api.convertFile(selectedPaths[0], useLlm, onProgress, onLog)
        // Always add logs from backend
        if (result.logs) {
          result.logs.forEach((msg: string) => addLog(msg))
        }
        if (result.success) {
          setResult(selectedPaths[0], result)
          setActiveResult(result)
          addConverted(selectedPaths[0])
          setCharCount(`${result.char_count} 字符 · ${result.word_count} 词`)
          setElapsedMs(`${(result.elapsed_ms / 1000).toFixed(1)}s`)
          setStatusText(`完成: ${PathUtil.basename(selectedPaths[0])}`)
        } else {
          setStatusText(`失败: ${result.error.slice(0, 50)}...`)
          addLog(`[失败] ${result.source_path}: ${result.error}`)
        }
      } else {
        // Batch conversion
        const results = await api.convertFilesBatch(selectedPaths, useLlm, onProgress, onLog)
        const successCount = results.filter(r => r.success).length
        for (const r of results) {
          if (r.success) {
            setResult(r.source_path, r)
            setActiveResult(r)
            addConverted(r.source_path)
          }
        }
        setStatusText(`完成: ${successCount}/${results.length}`)
        if (results[0]?.success) {
          setCharCount(`${results[0].char_count} 字符 · ${results[0].word_count} 词`)
          setElapsedMs(`${(results[0].elapsed_ms / 1000).toFixed(1)}s`)
        }
      }
    } catch (e: any) {
      setStatusText(`错误: ${e.message?.slice(0, 50) || '未知错误'}`)
      addLog(`[错误] ${e.message || String(e)}`)
      // Force log panel open on error
      if (!useAppStore.getState().logVisible) useAppStore.getState().toggleLog()
    } finally {
      setIsConverting(false)
      setProgress(null)
    }
  }, [selectedPaths, isConverting, setIsConverting, setProgress, setStatusText,
      setCharCount, setElapsedMs, setActiveResult, addConverted, addLog, clearLogs,
      setResult, activeResult])

  return (
    <div style={{
      height: 40, minHeight: 40,
      display: 'flex', alignItems: 'center',
      background: 'var(--bg)',
      borderTop: 'none',
      padding: '0 4px',
      gap: 4,
    }}>
      {/* Left: control icons */}
      <IconBtn onClick={toggleSidebar} title={sidebarVisible ? '收起侧边栏' : '展开侧边栏'}>
        {sidebarVisible ? <ArrowLeft /> : <ArrowRight />}
      </IconBtn>
      <IconBtn onClick={toggleSourceMode} title={isSourceMode ? '切换到预览模式' : '切换到源码模式'}>
        <CodeIcon />
      </IconBtn>

      {/* Status */}
      <span style={{
        fontSize: 12, color: 'var(--muted)',
        fontFamily: 'var(--font-ui)',
        maxWidth: 300, flexShrink: 1,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        lineHeight: '40px',
      }}>
        {statusText}
      </span>

      {/* Log toggle */}
      <button
        onClick={toggleLog}
        style={{
          height: 28, padding: '0 8px',
          background: logVisible ? 'var(--hover)' : 'transparent',
          border: 'none', borderRadius: 'var(--radius-sm)',
          color: logVisible ? 'var(--muted)' : 'var(--faint)',
          fontSize: 11, fontFamily: 'var(--font-ui)',
          cursor: 'pointer', transition: 'all 0.15s',
          lineHeight: '28px',
        }}
      >
        日志{logs.length > 0 ? ` (${logs.length})` : ''}
      </button>

      {/* Char count */}
      {charCount && (
        <span style={{
          fontSize: 11, color: 'var(--faint)',
          fontFamily: 'var(--font-mono)',
          lineHeight: '40px',
        }}>
          {charCount}
        </span>
      )}

      {/* Elapsed */}
      {elapsedMs && (
        <span style={{
          fontSize: 11, color: 'var(--faint)',
          fontFamily: 'var(--font-mono)',
          lineHeight: '40px',
        }}>
          {elapsedMs}
        </span>
      )}

      {/* Progress bar */}
      {progress && (
        <div style={{
          flex: 1, maxWidth: 120, height: 3,
          background: 'var(--border)',
          borderRadius: 2, overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${(progress.current / progress.total) * 100}%`,
            background: 'var(--accent)',
            borderRadius: 2,
            transition: 'width 0.3s ease',
          }} />
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Right: Action buttons */}
      <button
        data-action="convert-basic"
        onClick={() => handleConvert(false)}
        disabled={isConverting}
        style={{
          height: 34, padding: '0 18px',
          flexShrink: 0, whiteSpace: 'nowrap',
          background: 'var(--accent)', border: 'none',
          borderRadius: 'var(--radius-md)',
          color: '#fff', fontSize: 18, fontWeight: 700,
          fontFamily: 'var(--font-ui)',
          cursor: isConverting ? 'not-allowed' : 'pointer',
          opacity: isConverting ? 0.6 : 1,
          transition: 'background 0.15s',
        }}
      >
        转换
      </button>

      <span style={{ display: 'inline-flex', flexShrink: 0 }}>
        <button
          data-action="convert-llm"
          onClick={() => handleConvert(true)}
          disabled={isConverting}
          style={{
            height: 34, padding: '0 12px 0 16px',
            whiteSpace: 'nowrap',
            background: 'var(--accent-pink)', border: 'none',
            borderRadius: 'var(--radius-md) 0 0 var(--radius-md)',
            color: '#fff', fontSize: 18, fontWeight: 700,
            fontFamily: 'var(--font-ui)',
            cursor: isConverting ? 'not-allowed' : 'pointer',
            opacity: isConverting ? 0.6 : 1,
            transition: 'background 0.15s',
          }}
        >
          LLM 转换
        </button>
        <button
          onClick={() => setShowLLMPopup(!showLLMPopup)}
          style={{
            height: 34, width: 26, padding: 0,
            background: 'var(--accent-pink)', border: 'none',
            borderLeft: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '0 var(--radius-md) var(--radius-md) 0',
            color: '#fff', fontSize: 14,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
          title="LLM 功能开关"
        >
          ▾
        </button>
      </span>
    </div>
  )
}

// ── Minimal icon buttons ──

function IconBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        width: 32, height: 32, padding: 0,
        background: 'transparent', border: 'none',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--faint)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'var(--hover)' }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--faint)'; e.currentTarget.style.background = 'transparent' }}
    >
      {children}
    </button>
  )
}

function ArrowLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>
  )
}

function ArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

function CodeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6"/>
      <polyline points="8 6 2 12 8 18"/>
    </svg>
  )
}
