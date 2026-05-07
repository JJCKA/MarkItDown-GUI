import { useEffect, useRef } from 'react'
import { useAppStore } from '@/stores/appStore'

export default function LogPanel() {
  const { logs, logVisible } = useAppStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  if (!logVisible && logs.length === 0) return null

  return (
    <div style={{
      maxHeight: logVisible ? 140 : 0,
      overflow: 'hidden',
      background: 'var(--code-bg)',
      borderTop: logVisible ? '1px solid var(--border)' : 'none',
      transition: 'max-height 0.2s ease',
    }}>
      <div style={{
        height: 140, overflowY: 'auto',
        padding: '4px 12px',
        fontFamily: 'var(--font-mono)',
        fontSize: 12, color: 'var(--muted)',
        lineHeight: 1.6,
        userSelect: 'text',
      }}>
        {logs.map((msg, i) => (
          <div key={i} style={{ userSelect: 'text' }}>{msg}</div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
