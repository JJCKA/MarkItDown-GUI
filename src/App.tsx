import { useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '@/stores/appStore'
import TitleBar from '@/components/TitleBar'
import MenuBar from '@/components/MenuBar'
import Sidebar from '@/components/Sidebar'
import MarkdownViewer from '@/components/MilkdownEditor'
import SettingsPage from '@/components/SettingsPage'
import HistoryPanel from '@/components/HistoryPanel'
import BottomBar from '@/components/BottomBar'
import LogPanel from '@/components/LogPanel'
import LLMPopup from '@/components/LLMPopup'
import { useKeyboard } from '@/hooks/useKeyboard'

export default function App() {
  const {
    view, sidebarVisible, sidebarWidth, setSidebarWidth,
    showLLMPopup, setShowLLMPopup,
    selectedPaths, results, setActiveResult,
  } = useAppStore()

  const dragging = useRef(false)
  const startX = useRef(0)
  const startW = useRef(0)

  // Setup global keyboard shortcuts
  useKeyboard()

  // When selected file changes, show its result or clear preview
  useEffect(() => {
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

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100vh', background: 'var(--bg)',
      borderRadius: '8px', overflow: 'hidden',
    }}>
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
              width: 1, minWidth: 1,
              background: 'var(--border)',
              cursor: 'col-resize',
              flexShrink: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#c0c0c0')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--border)')}
          />
        )}

        {/* Main content */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', background: 'var(--bg)',
        }}>
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {view === 'editor' && <MarkdownViewer />}
            {view === 'settings' && <SettingsPage />}
            {view === 'history' && <HistoryPanel />}
          </div>

          <LogPanel />
          <BottomBar />
        </div>
      </div>

      {/* LLM Toggle Popup */}
      {showLLMPopup && (
        <LLMPopup onClose={() => setShowLLMPopup(false)} />
      )}
    </div>
  )
}
