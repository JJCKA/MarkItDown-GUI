import { useState, useEffect, useRef, useCallback } from 'react'
import * as api from '@/api/client'

/**
 * LLM feature toggle popup — appears above the ▾ button.
 * Mirrors the original Python CTkToplevel popup behavior.
 */
export default function LLMPopup({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null)

  const [toggles, setToggles] = useState({
    enable_image_llm: false,
    enable_audio_llm: false,
    enable_summary: false,
    enable_form_cleaning: false,
  })

  // Load from backend
  useEffect(() => {
    api.getSettings().then(data => {
      setToggles({
        enable_image_llm: data.conversion?.enable_llm_image ?? false,
        enable_audio_llm: data.conversion?.enable_llm_audio ?? false,
        enable_summary: data.conversion?.enable_summary ?? false,
        enable_form_cleaning: data.conversion?.enable_form_cleaning ?? false,
      })
    }).catch(() => {})
  }, [])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 100)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleToggle = useCallback(async (key: string, value: boolean) => {
    const updated = { ...toggles, [key]: value }
    setToggles(updated)
    try {
      await api.saveSettings({
        conversion: {
          enable_llm_image: updated.enable_image_llm,
          enable_llm_audio: updated.enable_audio_llm,
          enable_summary: updated.enable_summary,
          enable_form_cleaning: updated.enable_form_cleaning,
        }
      })
    } catch { /* silent */ }
  }, [toggles])

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        bottom: 52, right: 16,
        zIndex: 1000,
        width: 280,
        background: 'var(--bg)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-popup)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}
    >
      <div style={{
        padding: '14px 16px 8px',
        fontSize: 14, fontWeight: 700,
        fontFamily: 'var(--font-ui)',
        color: 'var(--text)',
      }}>
        LLM 高级功能
      </div>

      {([
        ['enable_image_llm', '图片描述（含文档内嵌图片）'],
        ['enable_audio_llm', '音频转录'],
        ['enable_summary', '全文内容总结 / 分析'],
        ['enable_form_cleaning', '复杂表单清洗'],
      ] as const).map(([key, label]) => (
        <label
          key={key}
          style={{
            display: 'flex', alignItems: 'center',
            gap: 10, padding: '6px 16px',
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
            fontSize: 13, color: 'var(--text)',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <input
            type="checkbox"
            checked={toggles[key]}
            onChange={e => handleToggle(key, e.target.checked)}
            style={{ accentColor: 'var(--accent)' }}
          />
          {label}
        </label>
      ))}

      <div style={{ height: 8 }} />
    </div>
  )
}
