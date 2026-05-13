import { useCallback } from 'react'
import { useAppStore } from '@/stores/appStore'
import { Path } from '@/utils/path'

export default function QueuePanel() {
  const { queueItems, queueVisible, setQueueVisible, clearQueue, cancelQueue, isConverting } = useAppStore()

  if (!queueVisible || queueItems.length === 0) return null

  const doneCount = queueItems.filter(i => i.status === 'done').length
  const errorCount = queueItems.filter(i => i.status === 'error').length
  const convertingItem = queueItems.find(i => i.status === 'converting')

  const handleExportAll = useCallback(async () => {
    const completed = queueItems.filter(i => i.status === 'done' && i.result)
    if (!completed.length) return

    const dir = await window.electronAPI.openFolder()
    if (!dir.length) return

    const port = await window.electronAPI.getBackendPort()
    for (const item of completed) {
      const r = item.result!
      const outPath = Path.join(dir[0], `${r.title || Path.stem(item.name)}.md`)
      await fetch(`http://127.0.0.1:${port}/api/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: outPath, content: r.markdown }),
      })
    }
  }, [queueItems])

  const handleRetryFailed = useCallback(async () => {
    // Re-trigger conversion for failed items — this is handled by BottomBar
    // For now, just clear and let user re-select
  }, [])

  return (
    <div style={{
      position: 'fixed',
      bottom: 48, right: 16,
      width: 360, maxHeight: 400,
      background: 'var(--bg)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-popup)',
      border: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      zIndex: 1000,
      overflow: 'hidden',
      fontFamily: 'var(--font-ui)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        gap: 8,
      }}>
        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
          转换队列
        </span>
        <span style={{ fontSize: 12, color: 'var(--faint)' }}>
          {doneCount}/{queueItems.length}
          {errorCount > 0 && <span style={{ color: 'var(--danger)', marginLeft: 6 }}>{errorCount} 失败</span>}
        </span>
        <button
          onClick={() => setQueueVisible(false)}
          style={{
            width: 24, height: 24, padding: 0,
            background: 'transparent', border: 'none',
            color: 'var(--faint)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <svg width="12" height="12" viewBox="0 0 10 10">
            <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 3, background: 'var(--border)',
      }}>
        <div style={{
          height: '100%',
          width: `${(doneCount / queueItems.length) * 100}%`,
          background: errorCount > 0 ? 'var(--danger)' : 'var(--accent)',
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Items */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '4px 0',
      }}>
        {queueItems.map((item, idx) => (
          <div
            key={item.path}
            style={{
              display: 'flex', alignItems: 'center',
              height: 32, padding: '0 16px',
              gap: 8,
            }}
          >
            <span style={{
              width: 16, textAlign: 'center', fontSize: 12, flexShrink: 0,
              color: item.status === 'done' ? 'var(--success)'
                : item.status === 'error' ? 'var(--danger)'
                : item.status === 'converting' ? 'var(--accent)'
                : item.status === 'cancelled' ? 'var(--faint)'
                : 'var(--faint)',
            }}>
              {item.status === 'done' ? '✓'
                : item.status === 'error' ? '✗'
                : item.status === 'converting' ? '◉'
                : item.status === 'cancelled' ? '⊘'
                : '○'}
            </span>
            <span style={{
              flex: 1, fontSize: 12, color: 'var(--text)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {item.name}
            </span>
            {item.status === 'converting' && convertingItem?.path === item.path && (
              <span style={{ fontSize: 11, color: 'var(--accent)', flexShrink: 0 }}>
                转换中...
              </span>
            )}
            {item.status === 'done' && item.result && (
              <span style={{
                fontSize: 11, color: 'var(--faint)',
                fontFamily: 'var(--font-mono)', flexShrink: 0,
              }}>
                {item.result.char_count} 字符
              </span>
            )}
            {item.status === 'error' && (
              <span style={{
                fontSize: 11, color: 'var(--danger)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                maxWidth: 120, flexShrink: 0,
              }} title={item.error}>
                {item.error?.slice(0, 20)}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '8px 12px',
        borderTop: '1px solid var(--border)',
        gap: 6,
      }}>
        {isConverting && (
          <button
            onClick={cancelQueue}
            style={actionBtnStyle}
          >
            取消剩余
          </button>
        )}
        {doneCount > 0 && (
          <button
            onClick={handleExportAll}
            style={actionBtnStyle}
          >
            全部导出
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={clearQueue}
          style={{ ...actionBtnStyle, color: 'var(--faint)' }}
        >
          清除
        </button>
      </div>
    </div>
  )
}

const actionBtnStyle: React.CSSProperties = {
  height: 28, padding: '0 12px',
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text)',
  fontSize: 12,
  fontFamily: 'var(--font-ui)',
  cursor: 'pointer',
}
