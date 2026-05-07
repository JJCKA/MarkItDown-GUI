import { useState, useEffect, useCallback, useRef } from 'react'

export default function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startY = useRef(0)

  useEffect(() => {
    // Check initial state
    window.electronAPI.isMaximized().then(setIsMaximized)
  }, [])

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't drag on buttons
    if ((e.target as HTMLElement).closest('button')) return
    dragging.current = true
    startX.current = e.clientX
    startY.current = e.clientY
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return
      // Small threshold to distinguish click from drag
      const dx = e.clientX - startX.current
      const dy = e.clientY - startY.current
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        // Let Electron handle the actual move via CSS -webkit-app-region
        // The drag region is set via CSS
      }
    }
    const onUp = () => { dragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  const handleMinimize = () => window.electronAPI.minimize()
  const handleMaximize = async () => {
    const maximized = await window.electronAPI.maximize()
    setIsMaximized(maximized)
  }
  const handleClose = () => window.electronAPI.close()

  return (
    <div
      onMouseDown={onMouseDown}
      onDoubleClick={handleMaximize}
      style={{
        height: 32, minHeight: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--bg)',
        borderBottom: 'none',
        // @ts-ignore - Electron drag region
        WebkitAppRegion: 'drag',
        paddingLeft: 4,
        paddingRight: 0,
      }}
    >
      {/* Left: Icon + Title */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 3,
        // @ts-ignore
        WebkitAppRegion: 'no-drag',
      }}>
        <img
          src="../assets/icon.png"
          alt=""
          style={{ width: 16, height: 16, objectFit: 'contain' }}
        />
        <span style={{
          fontSize: 12, fontWeight: 700,
          color: 'var(--muted)',
          fontFamily: 'var(--font-ui)',
        }}>
          MarkItDown-GUI
        </span>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Right: Window controls */}
      <div style={{
        display: 'flex',
        // @ts-ignore
        WebkitAppRegion: 'no-drag',
      }}>
        <WinButton onClick={handleMinimize} title="最小化">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect x="1" y="4.5" width="8" height="1" fill="currentColor"/>
          </svg>
        </WinButton>
        <WinButton onClick={handleMaximize} title={isMaximized ? '还原' : '最大化'}>
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect x="2.5" y="0.5" width="7" height="7" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1"/>
              <rect x="0.5" y="2.5" width="7" height="7" rx="0.5" fill="var(--bg)" stroke="currentColor" strokeWidth="1"/>
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect x="0.5" y="0.5" width="9" height="9" rx="0.5" fill="none" stroke="currentColor" strokeWidth="1"/>
            </svg>
          )}
        </WinButton>
        <WinButton onClick={handleClose} title="关闭" isClose>
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        </WinButton>
      </div>
    </div>
  )
}

function WinButton({
  children, onClick, title, isClose
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
  isClose?: boolean
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={title}
      style={{
        width: 36, height: 22,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: isClose && hovered ? 'var(--danger)' : hovered ? 'var(--hover)' : 'transparent',
        border: 'none', cursor: 'pointer',
        color: isClose && hovered ? '#ffffff' : 'var(--muted)',
        fontSize: 14, fontFamily: 'Segoe UI',
        transition: 'background 0.1s, color 0.1s',
      }}
    >
      {children}
    </button>
  )
}
