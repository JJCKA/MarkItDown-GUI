import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '@/stores/appStore'

interface MenuItem {
  label?: string
  shortcut?: string
  action?: string
  separator?: boolean
  checked?: boolean
}

const menuDefs: Record<string, MenuItem[]> = {
  文件: [
    { label: '打开文件', shortcut: 'Ctrl+O', action: 'openFiles' as any },
    { label: '打开文件夹', shortcut: 'Ctrl+Shift+O', action: 'openFolder' as any },
    { separator: true },
    { label: '导出', shortcut: 'Ctrl+S', action: 'export' as any },
    { separator: true },
    { label: '关闭窗口', action: 'close' as any },
  ],
  编辑: [
    { label: '复制', shortcut: 'Ctrl+C', action: 'copy' as any },
  ],
  视图: [
    { label: '侧边栏', shortcut: 'Ctrl+B', action: 'toggleSidebar' as any, checked: true },
    { label: '源码模式', action: 'toggleSource' as any, checked: false },
    { label: '日志面板', shortcut: 'Ctrl+J', action: 'toggleLog' as any, checked: false },
  ],
  转换: [
    { label: '转换', shortcut: 'Ctrl+Enter', action: 'convert' as any },
    { label: 'LLM 转换', shortcut: 'Ctrl+Shift+Enter', action: 'llmConvert' as any },
  ],
  帮助: [
    { label: '关于 MarkItDown', action: 'about' as any },
  ],
}

const menuKeys = Object.keys(menuDefs)

export default function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const {
    sidebarVisible, toggleSidebar,
    isSourceMode, toggleSourceMode,
    logVisible, toggleLog,
    activeResult,
  } = useAppStore()

  // Close on outside click
  useEffect(() => {
    if (!openMenu) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null)
      }
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 50)
    return () => document.removeEventListener('mousedown', handler)
  }, [openMenu])

  // Get checked state for view items
  const getChecked = (label: string) => {
    if (label === '侧边栏') return sidebarVisible
    if (label === '源码模式') return isSourceMode
    if (label === '日志面板') return logVisible
    return false
  }

  // Execute menu action
  const execAction = useCallback(async (action: string) => {
    setOpenMenu(null)
    switch (action) {
      case 'openFiles': {
        const paths = await window.electronAPI.openFiles()
        if (paths.length) useAppStore.getState().addRootPaths(paths)
        break
      }
      case 'openFolder': {
        const paths = await window.electronAPI.openFolder()
        if (paths.length) useAppStore.getState().addRootPaths(paths)
        break
      }
      case 'export': {
        if (!activeResult) break
        const defaultName = (activeResult.title || 'output') + '.md'
        const fp = await window.electronAPI.saveFile(defaultName)
        if (fp) {
          const port = await window.electronAPI.getBackendPort()
          await fetch(`http://127.0.0.1:${port}/api/export`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path: fp, content: activeResult.markdown }),
          })
        }
        break
      }
      case 'close': window.electronAPI.close(); break
      case 'copy': {
        if (activeResult) await navigator.clipboard.writeText(activeResult.markdown)
        break
      }
      case 'toggleSidebar': toggleSidebar(); break
      case 'toggleSource': toggleSourceMode(); break
      case 'toggleLog': toggleLog(); break
      case 'convert': {
        document.querySelector<HTMLButtonElement>('[data-action="convert-basic"]')?.click()
        break
      }
      case 'llmConvert': {
        document.querySelector<HTMLButtonElement>('[data-action="convert-llm"]')?.click()
        break
      }
      case 'about': alert('MarkItDown GUI v2.0\n\n模仿 Typora 风格的文件转 Markdown 格式工具，支持 PDF、Word、Excel、PPT、图片、音频等 30+ 格式。\n支持 LLM 解析图片、表单。\n\n作者：JJCKA\n联系方式：1064398651@qq.com'); break
    }
  }, [activeResult, toggleSidebar, toggleSourceMode, toggleLog])

  return (
    <div
      ref={menuRef}
      style={{
        display: 'flex', alignItems: 'center',
        height: 24, minHeight: 24,
        background: 'var(--bg)',
        padding: '0 4px',
      }}
    >
      {menuKeys.map(key => (
        <div key={key} style={{ position: 'relative' }}>
          <button
            onClick={() => setOpenMenu(openMenu === key ? null : key)}
            onMouseEnter={e => { if (openMenu) setOpenMenu(key) }}
            style={{
              height: 22, padding: '0 8px',
              background: openMenu === key ? 'var(--hover)' : 'transparent',
              border: 'none', borderRadius: 'var(--radius-sm)',
              color: 'var(--text)', fontSize: 13, fontWeight: 400,
              fontFamily: 'var(--font-ui)', cursor: 'pointer',
              transition: 'background 0.1s',
            }}
          >
            {key}
          </button>

          {openMenu === key && (
            <div style={{
              position: 'absolute', top: 32, left: 0, zIndex: 3000,
              minWidth: 240,
              background: 'var(--bg)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-popup)',
              border: '1px solid var(--border)',
              padding: '4px 0',
            }}>
              {menuDefs[key].map((item, i) => (
                item.separator ? (
                  <div key={i} style={{ height: 1, background: 'var(--border)', margin: '4px 8px' }} />
                ) : (
                  <div
                    key={i}
                    onClick={() => execAction(item.action as string)}
                    style={{
                      display: 'flex', alignItems: 'center',
                      height: 32, padding: '0 12px',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-ui)', fontSize: 13,
                      color: 'var(--text)',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Checkmark for toggle items */}
                    <span style={{ width: 18, fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>
                      {item.checked !== undefined ? (getChecked(item.label || '') ? '✓' : '') : ''}
                    </span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.shortcut && (
                      <span style={{ fontSize: 11, color: 'var(--faint)', fontFamily: 'var(--font-ui)', marginLeft: 24 }}>
                        {item.shortcut}
                      </span>
                    )}
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
