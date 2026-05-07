let _baseUrl = ''

async function getBaseUrl(): Promise<string> {
  if (_baseUrl) return _baseUrl
  const port = await window.electronAPI.getBackendPort()
  _baseUrl = `http://127.0.0.1:${port}`
  return _baseUrl
}

// ── Types ──

export interface ConversionProgress {
  current: number
  total: number
  filename: string
}

export interface ConversionResult {
  source_path: string
  markdown: string
  title: string
  success: boolean
  error: string
  used_llm: boolean
  elapsed_ms: number
  char_count: number
  word_count: number
  logs: string[]
}

export interface LLMConfig {
  provider: string
  api_key: string
  base_url: string
  model: string
  max_tokens: number
  temperature: number
}

export interface ConversionConfig {
  enable_llm_image: boolean
  enable_llm_audio: boolean
  enable_summary: boolean
  enable_form_cleaning: boolean
  zip_recursive: boolean
}

export interface AppearanceConfig {
  font_size: number
}

export interface HistoryItem {
  file: string
  success: boolean
  chars: number
  elapsed_ms: number
  used_llm: boolean
  timestamp: string
}

// ── API functions ──

export async function convertFile(
  filePath: string,
  useLlm: boolean,
  onProgress?: (p: ConversionProgress) => void,
  onLog?: (msg: string) => void,
): Promise<ConversionResult> {
  const base = await getBaseUrl()

  if (useLlm && onProgress) {
    // Use SSE endpoint for real-time progress
    const resp = await fetch(`${base}/api/convert/llm?sse=1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: filePath }),
    })

    const reader = resp.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let result: ConversionResult | null = null
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'progress') {
              onProgress?.(data)
            } else if (data.type === 'log') {
              onLog?.(data.message)
            } else if (data.type === 'result') {
              result = data
            }
          } catch { /* skip malformed */ }
        }
      }
    }

    if (!result) throw new Error('No result received')
    return result
  }

  // Simple request without SSE
  const endpoint = useLlm ? 'convert/llm' : 'convert'
  const resp = await fetch(`${base}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_path: filePath }),
  })
  if (!resp.ok) {
    let detail = `HTTP ${resp.status}`
    try {
      const errBody = await resp.json()
      if (errBody.detail) detail = errBody.detail
    } catch { /* use status */ }
    throw new Error(detail)
  }
  return resp.json()
}

export async function convertFilesBatch(
  filePaths: string[],
  useLlm: boolean,
  onProgress?: (p: ConversionProgress) => void,
  onLog?: (msg: string) => void,
): Promise<ConversionResult[]> {
  const base = await getBaseUrl()
  const endpoint = useLlm ? 'convert/batch/llm?sse=1' : 'convert/batch?sse=1'

  const resp = await fetch(`${base}/api/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_paths: filePaths }),
  })

  const reader = resp.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  const results: ConversionResult[] = []
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.type === 'progress') {
            onProgress?.(data)
          } else if (data.type === 'log') {
            onLog?.(data.message)
          } else if (data.type === 'result') {
            results.push(data)
          } else if (data.type === 'complete') {
            // all done
          }
        } catch { /* skip */ }
      }
    }
  }

  return results
}

export async function getSettings(): Promise<any> {
  const base = await getBaseUrl()
  const resp = await fetch(`${base}/api/settings`)
  return resp.json()
}

export async function saveSettings(settings: any): Promise<void> {
  const base = await getBaseUrl()
  await fetch(`${base}/api/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })
}

export async function testLLMConnection(config: LLMConfig): Promise<{success: boolean; message: string}> {
  const base = await getBaseUrl()
  const resp = await fetch(`${base}/api/settings/test-llm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  })
  return resp.json()
}

export async function getHistory(): Promise<HistoryItem[]> {
  const base = await getBaseUrl()
  const resp = await fetch(`${base}/api/settings/history`)
  return resp.json()
}

export async function clearHistory(): Promise<void> {
  const base = await getBaseUrl()
  await fetch(`${base}/api/settings/history`, { method: 'DELETE' })
}
