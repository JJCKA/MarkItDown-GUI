import { useState, useEffect } from 'react'
import { useAppStore } from '@/stores/appStore'
import * as api from '@/api/client'
import { Path } from '@/utils/path'

function formatTime(iso: string): string {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ''
  }
}

export default function HistoryPanel() {
  const { historyItems, setHistoryItems, setActiveResult, setView, results, setResult } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [cacheMax, setCacheMax] = useState(50)

  const loadHistory = () => {
    Promise.all([
      api.getHistory(),
      api.getCacheInfo(),
    ]).then(([items, cacheInfo]) => {
      setHistoryItems(items || [])
      setCacheMax(cacheInfo.max_items)
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => {
    loadHistory()
  }, [])

  const handleClick = (item: api.HistoryItem) => {
    // Try current session cache first
    const cached = results.get(item.file)
    if (cached) {
      useAppStore.getState().setSkipAutoSelect(true)
      setActiveResult(cached)
      setView('editor')
      return
    }
    // Fall back to persisted cache data (from enriched history)
    if (item.markdown) {
      const result: api.ConversionResult = {
        source_path: item.file,
        markdown: item.markdown,
        raw_markdown: item.raw_markdown || item.markdown,
        title: Path.stem(Path.basename(item.file)),
        success: item.success,
        error: '',
        used_llm: item.used_llm,
        elapsed_ms: item.elapsed_ms,
        char_count: item.chars,
        word_count: 0,
        logs: [],
      }
      useAppStore.getState().setSkipAutoSelect(true)
      setResult(item.file, result)
      setActiveResult(result)
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
      <div style={{
        background: 'var(--card)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}>
        {historyItems.map((item, idx) => {
          const isCached = !!item.cached
          const isClickable = results.has(item.file) || !!item.markdown

          return (
            <div
              key={idx}
              onClick={() => handleClick(item)}
              style={{
                display: 'flex', alignItems: 'center',
                padding: '10px 16px',
                cursor: isClickable ? 'pointer' : 'default',
                borderBottom: idx < historyItems.length - 1 ? '1px solid var(--border)' : 'none',
                background: isCached ? 'rgba(65, 131, 196, 0.04)' : 'transparent',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (isClickable) e.currentTarget.style.background = isCached ? 'rgba(65, 131, 196, 0.08)' : 'var(--hover)' }}
              onMouseLeave={e => { e.currentTarget.style.background = isCached ? 'rgba(65, 131, 196, 0.04)' : 'transparent' }}
            >
              <span style={{
                flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontSize: 13, color: 'var(--text)',
              }}>
                {Path.basename(item.file)}
              </span>

              {/* Timestamp */}
              <span style={{
                fontSize: 11, color: 'var(--faint)',
                fontFamily: 'var(--font-mono)',
                marginRight: 10, flexShrink: 0,
              }}>
                {formatTime(item.timestamp)}
              </span>

              {isCached && (
                <span style={{
                  fontSize: 10, color: 'var(--accent)',
                  background: 'rgba(65, 131, 196, 0.1)', padding: '1px 5px',
                  borderRadius: 'var(--radius-sm)', marginRight: 8, flexShrink: 0,
                }}>
                  缓存
                </span>
              )}

              <span style={{
                width: 16, textAlign: 'center', fontSize: 11, flexShrink: 0,
                color: item.success ? 'var(--success)' : 'var(--danger)',
                marginRight: 12,
              }}>
                {item.success ? '✓' : '✗'}
              </span>

              <span style={{
                fontSize: 11, color: 'var(--faint)',
                fontFamily: 'var(--font-mono)',
                marginRight: 12, width: 60, textAlign: 'right', flexShrink: 0,
              }}>
                {item.chars} 字符
              </span>

              <span style={{
                fontSize: 11, color: 'var(--faint)',
                fontFamily: 'var(--font-mono)',
                width: 50, textAlign: 'right', flexShrink: 0,
              }}>
                {(item.elapsed_ms / 1000).toFixed(1)}s
              </span>

              {item.used_llm && (
                <span style={{
                  fontSize: 10, color: 'var(--accent-pink)',
                  background: '#fce4ec', padding: '2px 6px',
                  borderRadius: 'var(--radius-sm)', marginLeft: 8, flexShrink: 0,
                }}>
                  LLM
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div style={{
        marginTop: 12, fontSize: 11, color: 'var(--faint)',
        textAlign: 'center',
      }}>
        当前保留前 {cacheMax} 条缓存记录
      </div>
    </div>
  )
}
