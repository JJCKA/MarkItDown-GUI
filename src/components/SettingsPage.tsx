import { useState, useEffect, useCallback, useRef } from 'react'
import * as api from '@/api/client'

interface SettingsData {
  llm: {
    provider: string
    api_key: string
    base_url: string
    model: string
    max_tokens: number
    temperature: number
  }
  conversion: {
    enable_llm_image: boolean
    enable_llm_audio: boolean
    enable_summary: boolean
    enable_form_cleaning: boolean
    zip_recursive: boolean
  }
  appearance: {
    font_size: number
  }
}

/**
 * Settings page — mirrors original Python SettingsPage exactly.
 * Sections: LLM Config, LLM Features, Conversion Options, Appearance, History.
 */
export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [testStatus, setTestStatus] = useState('')
  const [testOk, setTestOk] = useState(false)
  const [cacheMax, setCacheMax] = useState(50)
  const [cacheCount, setCacheCount] = useState(0)
  const [confirmAction, setConfirmAction] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    api.getSettings().then(data => setSettings(data as SettingsData)).catch(() => {})
    api.getCacheInfo().then(info => { setCacheMax(info.max_items); setCacheCount(info.count) }).catch(() => {})
  }, [])

  // Auto-save on settings change (debounced 500ms)
  useEffect(() => {
    if (!settings) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      api.saveSettings(settings).catch(() => {})
    }, 500)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [settings])

  const updateLLM = useCallback((key: string, value: any) => {
    setSettings(prev => prev ? {
      ...prev,
      llm: { ...prev.llm, [key]: value }
    } : prev)
  }, [])

  const updateConversion = useCallback((key: string, value: boolean) => {
    setSettings(prev => prev ? {
      ...prev,
      conversion: { ...prev.conversion, [key]: value }
    } : prev)
  }, [])

  const updateAppearance = useCallback((key: string, value: any) => {
    setSettings(prev => prev ? {
      ...prev,
      appearance: { ...prev.appearance, [key]: value }
    } : prev)
  }, [])

  const handleProviderChange = useCallback((provider: string) => {
    const urls: Record<string, string> = {
      'OpenAI': 'https://api.openai.com/v1',
      '自定义端点': '',
    }
    setSettings(prev => prev ? {
      ...prev,
      llm: { ...prev.llm, provider, base_url: urls[provider] ?? '' }
    } : prev)
  }, [])

  const handleTestConnection = useCallback(async () => {
    if (!settings) return
    setTestStatus('测试中...')
    try {
      const result = await api.testLLMConnection(settings.llm)
      setTestOk(result.success)
      setTestStatus(result.success ? `✓ ${result.message}` : `✗ ${result.message}`)
    } catch {
      setTestOk(false)
      setTestStatus('✗ 连接失败')
    }
  }, [settings])

  const handleClearHistory = useCallback(async () => {
    await api.clearHistory()
    setConfirmAction(null)
  }, [])

  const handleClearCache = useCallback(async () => {
    await api.clearCache()
    setCacheCount(0)
    setConfirmAction(null)
  }, [])

  const handleCacheMaxChange = useCallback((val: number) => {
    setCacheMax(val)
    api.updateCacheConfig(val).catch(() => {})
  }, [])

  if (!settings) {
    return (
      <div style={{ padding: 24, color: 'var(--muted)', fontFamily: 'var(--font-ui)' }}>
        加载中...
      </div>
    )
  }

  const { llm, conversion, appearance } = settings

  return (
    <div style={{
      flex: 1, overflowY: 'auto', padding: '20px 24px',
      fontFamily: 'var(--font-ui)',
    }}>

      {/* LLM Section */}
      <Card title="LLM 模型配置">
        <Field label="提供商:">
          <select
            value={llm.provider}
            onChange={e => handleProviderChange(e.target.value)}
            style={selectStyle}
          >
            <option>OpenAI</option>
            <option>自定义端点</option>
          </select>
        </Field>
        <Field label="API Key:">
          <input type="password" value={llm.api_key}
            onChange={e => updateLLM('api_key', e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Base URL:">
          <input type="text" value={llm.base_url}
            onChange={e => updateLLM('base_url', e.target.value)} style={inputStyle} />
        </Field>
        <Field label="模型:">
          <input type="text" value={llm.model}
            onChange={e => updateLLM('model', e.target.value)} style={inputStyle} />
        </Field>
        <Field label="最大 Tokens:">
          <input type="number" value={llm.max_tokens}
            onChange={e => { const v = parseInt(e.target.value); updateLLM('max_tokens', isNaN(v) ? 4096 : v) }} style={inputStyle} />
        </Field>
        <Field label="Temperature:">
          <input type="number" step="0.1" value={llm.temperature}
            onChange={e => { const v = parseFloat(e.target.value); updateLLM('temperature', isNaN(v) ? 0.3 : v) }} style={inputStyle} />
        </Field>
        <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handleTestConnection} style={btnStyle}>
            测试连接
          </button>
          <span style={{
            fontSize: 12, fontFamily: 'var(--font-ui)',
            color: testOk ? 'var(--success)' : testStatus.includes('✗') ? 'var(--danger)' : 'var(--muted)'
          }}>
            {testStatus}
          </span>
        </div>
      </Card>

      {/* LLM Features */}
      <Card title="LLM 高级功能">
        <Toggle label="启用全文内容总结 / 分析"
          checked={conversion.enable_summary}
          onChange={v => updateConversion('enable_summary', v)} />
        <Toggle label="启用复杂表单清洗（申请书/审批表）"
          checked={conversion.enable_form_cleaning}
          onChange={v => updateConversion('enable_form_cleaning', v)} />
        <div style={{ padding: '0 16px 14px', fontSize: 11, color: 'var(--faint)' }}>
          开启后，大模型将对转换结果进行额外处理。
        </div>
      </Card>

      {/* Conversion Options */}
      <Card title="转换选项">
        <Toggle label="启用 LLM 图片描述（含文档内嵌图片）"
          checked={conversion.enable_llm_image}
          onChange={v => updateConversion('enable_llm_image', v)} />
        <Toggle label="启用 LLM 音频转录"
          checked={conversion.enable_llm_audio}
          onChange={v => updateConversion('enable_llm_audio', v)} />
        <Toggle label="ZIP 递归处理"
          checked={conversion.zip_recursive}
          onChange={v => updateConversion('zip_recursive', v)} />
        <div style={{ height: 10 }} />
      </Card>

      {/* Appearance */}
      <Card title="外观">
        <Field label="字体大小:">
          <input type="number" value={appearance.font_size}
            onChange={e => updateAppearance('font_size', parseInt(e.target.value) || 14)}
            style={{ ...inputStyle, width: 80 }} />
        </Field>
      </Card>

      {/* Cache & History */}
      <Card title="历史记录与缓存">
        <Field label="最大缓存:">
          <input type="number" value={cacheMax} min={1} max={500}
            onChange={e => handleCacheMaxChange(parseInt(e.target.value) || 50)}
            style={{ ...inputStyle, width: 80 }} />
          <span style={{ fontSize: 11, color: 'var(--faint)', marginLeft: 4 }}>
            当前缓存 {cacheCount} 条
          </span>
        </Field>
        <div style={{ padding: '8px 16px', display: 'flex', gap: 8 }}>
          <button onClick={() => setConfirmAction('cache')} style={dangerBtnStyle}>
            清除缓存
          </button>
          <button onClick={() => setConfirmAction('history')} style={dangerBtnStyle}>
            清除历史记录
          </button>
        </div>
      </Card>

      {/* Confirm dialog */}
      {confirmAction && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--bg)', borderRadius: 'var(--radius-lg)',
            padding: '24px 28px', minWidth: 280,
            boxShadow: 'var(--shadow-popup)',
            fontFamily: 'var(--font-ui)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>
              {confirmAction === 'cache' ? '确认清除所有缓存？' : '确认清除所有历史记录？'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
              {confirmAction === 'cache' ? '缓存的转换结果将被永久删除。' : '历史记录将被永久删除。'}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmAction(null)} style={btnStyle}>取消</button>
              <button
                onClick={confirmAction === 'cache' ? handleClearCache : handleClearHistory}
                style={dangerBtnStyle}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// ── Sub-components ──

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--card)',
      borderRadius: 'var(--radius-lg)',
      marginBottom: 6,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 16px 6px',
        fontSize: 13, fontWeight: 700,
        color: 'var(--muted)',
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '3px 16px', gap: 8,
    }}>
      <span style={{
        width: 90, fontSize: 13,
        color: 'var(--muted)',
        flexShrink: 0,
      }}>
        {label}
      </span>
      {children}
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center',
      gap: 10, padding: '3px 16px',
      cursor: 'pointer', fontSize: 13,
      color: 'var(--text)',
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ accentColor: 'var(--accent)' }}
      />
      {label}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  width: 200, height: 28,
  border: 'none', borderRadius: 'var(--radius-sm)',
  background: 'var(--bg)',
  padding: '0 8px', fontSize: 13,
  fontFamily: 'var(--font-ui)',
  color: 'var(--text)',
  outline: 'none',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  width: 200, cursor: 'pointer',
}

const btnStyle: React.CSSProperties = {
  height: 28, padding: '0 16px',
  background: 'var(--accent)', color: '#fff',
  border: 'none', borderRadius: 'var(--radius-md)',
  fontSize: 12, fontWeight: 700,
  fontFamily: 'var(--font-ui)',
  cursor: 'pointer',
}

const dangerBtnStyle: React.CSSProperties = {
  height: 28, padding: '0 16px',
  background: 'transparent', color: '#e94560',
  border: '1px solid #e94560', borderRadius: 'var(--radius-md)',
  fontSize: 12, fontWeight: 600,
  fontFamily: 'var(--font-ui)',
  cursor: 'pointer',
}
