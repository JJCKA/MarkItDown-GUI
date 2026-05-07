import { useState, useEffect } from 'react'
import { useAppStore } from '@/stores/appStore'
import * as api from '@/api/client'
import { Path } from '@/utils/path'

/**
 * History panel — shows past conversion records.
 * Click to reload a previous result.
 */
export default function HistoryPanel() {
  const { historyItems, setHistoryItems, setActiveResult, setView, results } = useAppStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getHistory().then(items => {
      setHistoryItems(items || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [setHistoryItems])

  const handleClick = (item: api.HistoryItem) => {
    const cached = results.get(item.file)
    if (cached) {
      setActiveResult(cached)
      setView('editor')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24, color: 'var(--muted)', fontFamily: 'var(--font-ui)' }}>
        加载中...
      </div>
    )
  }

  if (!historyItems.length) {
    return (
      <div style={{
        padding: 24, textAlign: 'center',
        color: 'var(--faint)', fontSize: 13,
        fontFamily: 'var(--font-ui)',
      }}>
        暂无历史记录
      </div>
    )
  }

  return (
    <div style={{
      flex: 1, overflowY: 'auto', padding: '20px 24px',
      fontFamily: 'var(--font-ui)',
    }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
        历史记录
      </h2>

      <div style={{
        background: 'var(--card)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        {historyItems.map((item, idx) => (
          <div
            key={idx}
            onClick={() => handleClick(item)}
            style={{
              display: 'flex', alignItems: 'center',
              padding: '10px 16px',
              cursor: results.has(item.file) ? 'pointer' : 'default',
              borderBottom: idx < historyItems.length - 1 ? '1px solid var(--border)' : 'none',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (results.has(item.file)) e.currentTarget.style.background = 'var(--hover)' }}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{
              flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontSize: 13, color: 'var(--text)',
            }}>
              {Path.basename(item.file)}
            </span>

            <span style={{
              width: 16, textAlign: 'center', fontSize: 11,
              color: item.success ? 'var(--success)' : 'var(--danger)',
              marginRight: 12,
            }}>
              {item.success ? '✓' : '✗'}
            </span>

            <span style={{
              fontSize: 11, color: 'var(--faint)',
              fontFamily: 'var(--font-mono)',
              marginRight: 12, width: 60, textAlign: 'right',
            }}>
              {item.chars} 字符
            </span>

            <span style={{
              fontSize: 11, color: 'var(--faint)',
              fontFamily: 'var(--font-mono)',
              marginRight: 12, width: 50, textAlign: 'right',
            }}>
              {(item.elapsed_ms / 1000).toFixed(1)}s
            </span>

            {item.used_llm && (
              <span style={{
                fontSize: 10, color: 'var(--accent-pink)',
                background: '#fce4ec', padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
              }}>
                LLM
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
