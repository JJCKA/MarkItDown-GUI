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
    viewMode, cycleViewMode,
    compareVisible, setCompareVisible,
    recordConversion,
    initQueue, updateQueueItem, queueVisible, setQueueVisible, queueItems,
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

    // Initialize queue for multi-file conversions
    if (selectedPaths.length > 1) {
      initQueue(selectedPaths)
    }

    const onProgress = (p: api.ConversionProgress) => setProgress(p)
    const onLog = (msg: string) => addLog(msg)

    try {
      if (selectedPaths.length === 1) {
        const result = await api.convertFile(selectedPaths[0], useLlm, onProgress, onLog)
        if (result.logs) {
          result.logs.forEach((msg: string) => addLog(msg))
        }
        recordConversion(result)
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
        // Batch conversion — process one by one for queue tracking
        const allResults: api.ConversionResult[] = []
        for (let i = 0; i < selectedPaths.length; i++) {
          const fp = selectedPaths[i]
          // Check if cancelled
          const queue = useAppStore.getState().queueItems
          const queueItem = queue.find(q => q.path === fp)
          if (queueItem?.status === 'cancelled') {
            allResults.push({
              source_path: fp, markdown: '', raw_markdown: '', title: '', success: false,
              error: '已取消', used_llm: false, elapsed_ms: 0,
              char_count: 0, word_count: 0, logs: [],
            } as api.ConversionResult)
            continue
          }

          updateQueueItem(fp, { status: 'converting' })
          setProgress({ current: i + 1, total: selectedPaths.length, filename: PathUtil.basename(fp) })

          try {
            let result: api.ConversionResult
            if (useLlm) {
              result = await api.convertFile(fp, true, onProgress, onLog)
            } else {
              result = await api.convertFile(fp, false, onProgress, onLog)
            }
            if (result.logs) {
              result.logs.forEach((msg: string) => addLog(msg))
            }
            recordConversion(result)
            allResults.push(result)

            if (result.success) {
              setResult(fp, result)
              setActiveResult(result)
              addConverted(fp)
              updateQueueItem(fp, { status: 'done', result })
            } else {
              updateQueueItem(fp, { status: 'error', error: result.error })
              addLog(`[失败] ${fp}: ${result.error}`)
            }
          } catch (e: any) {
            updateQueueItem(fp, { status: 'error', error: e.message || '未知错误' })
            addLog(`[错误] ${fp}: ${e.message || String(e)}`)
          }
        }

        const successCount = allResults.filter(r => r.success).length
        setStatusText(`完成: ${successCount}/${allResults.length}`)
        if (allResults[0]?.success) {
          setCharCount(`${allResults[0].char_count} 字符 · ${allResults[0].word_count} 词`)
          setElapsedMs(`${(allResults[0].elapsed_ms / 1000).toFixed(1)}s`)
        }
      }
    } catch (e: any) {
      setStatusText(`错误: ${e.message?.slice(0, 50) || '未知错误'}`)
      addLog(`[错误] ${e.message || String(e)}`)
      if (!useAppStore.getState().logVisible) useAppStore.getState().toggleLog()
    } finally {
      setIsConverting(false)
      setProgress(null)
      // Refresh history in background
      api.getHistory().then(items => {
        useAppStore.getState().setHistoryItems(items || [])
      }).catch(() => {})
    }
  }, [selectedPaths, isConverting, setIsConverting, setProgress, setStatusText,
      setCharCount, setElapsedMs, setActiveResult, addConverted, addLog, clearLogs,
      setResult, recordConversion, initQueue, updateQueueItem])

  const hasResult = !!activeResult

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
      <IconBtn onClick={cycleViewMode} title={viewMode === 'preview' ? '切换到源码模式' : '切换到预览模式'}>
        {viewMode === 'preview' ? <EyeIcon /> : <CodeIcon />}
      </IconBtn>
      <IconBtn
        onClick={() => setCompareVisible(!compareVisible)}
        title={compareVisible ? '关闭对比' : '原始文件 vs 转换结果 对比'}
        style={{ opacity: hasResult ? 1 : 0.4 }}
      >
        <SplitIcon />
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

      {/* Queue toggle */}
      {queueItems.length > 0 && (
        <button
          onClick={() => setQueueVisible(!queueVisible)}
          style={{
            height: 28, padding: '0 8px',
            background: queueVisible ? 'var(--hover)' : 'transparent',
            border: 'none', borderRadius: 'var(--radius-sm)',
            color: queueVisible ? 'var(--muted)' : 'var(--faint)',
            fontSize: 11, fontFamily: 'var(--font-ui)',
            cursor: 'pointer', transition: 'all 0.15s',
            lineHeight: '28px',
          }}
        >
          队列{queueItems.length > 0 ? ` (${queueItems.filter(i => i.status === 'done').length}/${queueItems.length})` : ''}
        </button>
      )}

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
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            flex: 1, maxWidth: 1200, height: 5,
            background: 'var(--border)',
            borderRadius: 3, overflow: 'hidden',
          }}
        >
          <div style={{
            height: '100%',
            width: `${(progress.current / progress.total) * 100}%`,
            background: 'var(--accent)',
            borderRadius: 3,
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

function IconBtn({ onClick, title, children, style }: { onClick: () => void; title: string; children: React.ReactNode; style?: React.CSSProperties }) {
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
        ...style,
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

function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
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

function SplitIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="12" y1="3" x2="12" y2="21"/>
    </svg>
  )
}
