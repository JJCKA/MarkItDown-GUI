import { useState, useEffect, useCallback } from 'react'
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

  useEffect(() => {
    api.getSettings().then(data => setSettings(data as SettingsData)).catch(() => {})
  }, [])

  // Auto-save on settings change
  useEffect(() => {
    if (settings) api.saveSettings(settings).catch(() => {})
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
      'Anthropic': 'https://api.anthropic.com/v1',
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
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
        设置
      </h2>

      {/* LLM Section */}
      <Card title="LLM 模型配置">
        <Field label="提供商:">
          <select
            value={llm.provider}
            onChange={e => handleProviderChange(e.target.value)}
            style={selectStyle}
          >
            <option>OpenAI</option>
            <option>Anthropic</option>
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

      {/* History */}
      <Card title="历史记录">
        <button
          onClick={handleClearHistory}
          style={{
            margin: '4px 16px 14px',
            height: 28, padding: '0 12px',
            background: 'transparent', border: 'none',
            color: '#e94560', fontSize: 12,
            fontFamily: 'var(--font-ui)',
            cursor: 'pointer', borderRadius: 'var(--radius-sm)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#f5e0e0'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          清除所有历史记录
        </button>
      </Card>

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
