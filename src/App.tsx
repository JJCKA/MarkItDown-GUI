import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/stores/appStore'
import TitleBar from '@/components/TitleBar'
import MenuBar from '@/components/MenuBar'
import Sidebar from '@/components/Sidebar'
import MarkdownViewer from '@/components/MilkdownEditor'
import SettingsPage from '@/components/SettingsPage'
import HistoryPanel from '@/components/HistoryPanel'
import StatsPanel from '@/components/StatsPanel'
import BottomBar from '@/components/BottomBar'
import LogPanel from '@/components/LogPanel'
import QueuePanel from '@/components/QueuePanel'
import LLMPopup from '@/components/LLMPopup'
import { useKeyboard } from '@/hooks/useKeyboard'

export default function App() {
  const {
    view, setView, sidebarVisible, sidebarWidth, setSidebarWidth,
    showLLMPopup, setShowLLMPopup,
    selectedPaths, results, setActiveResult, addRootPaths,
  } = useAppStore()

  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const dragCounter = useRef(0)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  // Setup global keyboard shortcuts
  useKeyboard()

  // When selected file changes, show its result or clear preview
  useEffect(() => {
    if (useAppStore.getState().skipAutoSelect) {
      useAppStore.getState().setSkipAutoSelect(false)
      return
    }
    if (selectedPaths.length === 1) {
      const cached = results.get(selectedPaths[0])
      setActiveResult(cached || null)
    } else {
      setActiveResult(null)
    }
  }, [selectedPaths, results, setActiveResult])

  // Sidebar divider drag logic
  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    startX.current = e.clientX
    startW.current = sidebarWidth
    document.body.style.cursor = 'col-resize'
    e.preventDefault()
  }, [sidebarWidth])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const dx = e.clientX - startX.current
      const newW = Math.max(250, Math.min(600, startW.current + dx))
      setSidebarWidth(newW)
    }
    const onUp = () => {
      if (dragging.current) {
        dragging.current = false
        document.body.style.cursor = ''
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [setSidebarWidth])

  // Drag & Drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current++
    if (e.dataTransfer.types.includes('Files')) {
      setIsDraggingOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setIsDraggingOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    dragCounter.current = 0
    setIsDraggingOver(false)

    const files = e.dataTransfer.files
    if (!files.length) return

    const paths: string[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if ('path' in file && (file as any).path) {
        paths.push((file as any).path)
      }
    }
    if (paths.length) {
      addRootPaths(paths)
    }
  }, [addRootPaths])

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        display: 'flex', flexDirection: 'column',
        height: '100vh', background: 'var(--bg)',
        borderRadius: '8px', overflow: 'hidden',
        position: 'relative',
      }}
    >
      <TitleBar />
      <MenuBar />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar — always rendered, width transition for smooth collapse */}
        <div style={{
          width: sidebarVisible ? sidebarWidth : 0,
          minWidth: sidebarVisible ? sidebarWidth : 0,
          background: 'var(--sidebar)', display: 'flex',
          flexDirection: 'column', overflow: 'hidden',
          transition: 'width 0.25s ease, min-width 0.25s ease',
        }}>
          <Sidebar />
        </div>

        {/* Resizable divider — hide when collapsed */}
        {sidebarVisible && (
          <div
            onMouseDown={onDividerMouseDown}
            style={{
              width: 5, minWidth: 5,
              background: 'transparent',
              cursor: 'col-resize',
              flexShrink: 0,
              position: 'relative',
            }}
            onMouseEnter={e => {
              const inner = e.currentTarget.querySelector('div') as HTMLElement
              if (inner) { inner.style.background = 'var(--accent)'; inner.style.width = '5px' }
            }}
            onMouseLeave={e => {
              const inner = e.currentTarget.querySelector('div') as HTMLElement
              if (inner) { inner.style.background = 'var(--border)'; inner.style.width = '1px' }
            }}
          >
            <div style={{
              position: 'absolute', top: 0, bottom: 0,
              left: 0, width: 1,
              background: 'var(--border)',
              transition: 'background 0.15s, width 0.1s',
            }} />
          </div>
        )}

        {/* Main content */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', background: 'var(--bg)',
        }}>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {view === 'editor' && <MarkdownViewer />}
            {view === 'settings' && <PageWrapper title="设置" onClose={() => setView('editor')}><SettingsPage /></PageWrapper>}
            {view === 'history' && <PageWrapper title="历史记录" onClose={() => setView('editor')}><HistoryPanel /></PageWrapper>}
            {view === 'stats' && <PageWrapper title="转换统计" onClose={() => setView('editor')}><StatsPanel /></PageWrapper>}
          </div>

          <LogPanel />
          <BottomBar />
        </div>
      </div>

      {/* LLM Toggle Popup */}
      {showLLMPopup && (
        <LLMPopup onClose={() => setShowLLMPopup(false)} />
      )}

      {/* Queue Panel */}
      <QueuePanel />

      {/* Drag & Drop Overlay */}
      {isDraggingOver && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 9999,
          background: 'rgba(65, 131, 196, 0.08)',
          border: '3px dashed var(--accent)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            color: 'var(--accent)', fontFamily: 'var(--font-ui)',
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span style={{ fontSize: 18, fontWeight: 700 }}>拖放文件或文件夹到此处</span>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>支持 PDF · Word · Excel · PPT · 图片 · 音频等 30+ 格式</span>
          </div>
        </div>
      )}
    </div>
  )
}

function PageWrapper({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        height: 48, minHeight: 48,
        display: 'flex', alignItems: 'center',
        padding: '0 20px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)',
      }}>
        <span style={{
          flex: 1, fontSize: 20, fontWeight: 700,
          color: 'var(--text)', fontFamily: 'var(--font-ui)',
        }}>
          {title}
        </span>
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, padding: 0,
            background: 'transparent', border: 'none',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--faint)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.1s, color 0.1s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--hover)'; e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--faint)' }}
          title="关闭"
        >
          <svg width="18" height="18" viewBox="0 0 10 10">
            <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.4"/>
            <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.4"/>
          </svg>
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {children}
      </div>
    </div>
  )
}
