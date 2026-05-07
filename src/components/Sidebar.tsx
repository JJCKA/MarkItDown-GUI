import { useState, useCallback, useEffect, useRef } from 'react'
import { useAppStore } from '@/stores/appStore'
import FileTree from './FileTree'
import ConvertedList from './ConvertedList'

export default function Sidebar() {
  const {
    activeTab, setActiveTab,
    rootPaths, addRootPaths,
    view, setView,
    logVisible, toggleLog,
  } = useAppStore()
  const [openMenuOpen, setOpenMenuOpen] = useState(false)

  const handleOpenFiles = useCallback(async () => {
    const paths = await window.electronAPI.openFiles()
    if (paths.length) addRootPaths(paths)
  }, [addRootPaths])

  const handleOpenFolder = useCallback(async () => {
    const paths = await window.electronAPI.openFolder()
    if (paths.length) addRootPaths(paths)
  }, [addRootPaths])

  const openBtnRef = useRef<HTMLDivElement>(null)

  // Close popup on outside click
  useEffect(() => {
    if (!openMenuOpen) return
    const handler = (e: MouseEvent) => {
      if (openBtnRef.current && !openBtnRef.current.contains(e.target as Node)) {
        setOpenMenuOpen(false)
      }
    }
    setTimeout(() => document.addEventListener('mousedown', handler), 50)
    return () => document.removeEventListener('mousedown', handler)
  }, [openMenuOpen])

  const isEmpty = rootPaths.length === 0

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden',
    }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', height: 44, minHeight: 44,
        borderBottom: '5px solid var(--sidebar)',
        position: 'relative',
      }}>
        <TabBtn
          active={activeTab === 'files'}
          onClick={() => setActiveTab('files')}
          label="文件"
        />
        <TabBtn
          active={activeTab === 'converted'}
          onClick={() => setActiveTab('converted')}
          label="已转换"
        />
        <div style={{
          position: 'absolute', bottom: -5, height: 5,
          width: 100,
          left: activeTab === 'files'
            ? 'calc(25% - 50px)'
            : 'calc(75% - 50px)',
          background: 'var(--text)',
          transition: 'left 0.2s ease',
        }} />
      </div>

      {/* Content area — flex-1, fills remaining space */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>

        {/* Empty state */}
        {isEmpty ? (
          <div style={{
            height: '100%', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              color: 'var(--faint)', fontSize: 13,
              fontFamily: 'var(--font-ui)',
              userSelect: 'none',
            }}>
              没有打开的文件夹
            </span>
          </div>
        ) : (
          <>
            {/* Files panel */}
            <div style={{
              display: activeTab === 'files' ? 'flex' : 'none',
              flexDirection: 'column', height: '100%',
            }}>
              <FileTree />
            </div>

            {/* Converted panel */}
            <div style={{
              display: activeTab === 'converted' ? 'flex' : 'none',
              flexDirection: 'column', height: '100%',
            }}>
              <ConvertedList />
            </div>
          </>
        )}
      </div>

      {/* Bottom action bar */}
      <div style={{
        height: 40, minHeight: 40,
        borderTop: 'none',
        display: 'flex', alignItems: 'center',
        padding: '0 4px', background: 'var(--sidebar)',
      }}>
        {/* Open button with inline popup — leftmost */}
        <div ref={openBtnRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setOpenMenuOpen(!openMenuOpen)}
            style={{
              width: 40, height: 32,
              background: openMenuOpen ? 'var(--hover)' : 'transparent',
              border: 'none', borderRadius: 'var(--radius-sm)',
              color: 'var(--muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s',
            }}
            title="打开"
          >
            <FolderOpenIcon />
          </button>
          {openMenuOpen && (
            <div
              style={{
                position: 'fixed', zIndex: 2000,
                bottom: 48, left: 4,
                minWidth: 140,
                background: 'var(--bg)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-popup)',
                border: '1px solid var(--border)',
                overflow: 'hidden',
              }}
            >
              <div
                onClick={() => { handleOpenFiles(); setOpenMenuOpen(false) }}
                style={{
                  height: 36, padding: '0 12px',
                  display: 'flex', alignItems: 'center',
                  cursor: 'pointer', fontSize: 13,
                  fontFamily: 'var(--font-ui)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                打开文件
              </div>
              <div
                onClick={() => { handleOpenFolder(); setOpenMenuOpen(false) }}
                style={{
                  height: 36, padding: '0 12px',
                  display: 'flex', alignItems: 'center',
                  cursor: 'pointer', fontSize: 13,
                  fontFamily: 'var(--font-ui)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                打开文件夹
              </div>
            </div>
          )}
        </div>

        {/* Settings gear */}
        <button
          onClick={() => { if (logVisible) toggleLog(); setView(view === 'settings' ? 'editor' : 'settings') }}
          style={{
            width: 40, height: 32,
            background: view === 'settings' ? 'var(--hover)' : 'transparent',
            border: 'none', borderRadius: 'var(--radius-sm)',
            color: 'var(--muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
          title="设置"
        >
          <GearIcon />
        </button>

        {/* History clock */}
        <button
          onClick={() => { if (logVisible) toggleLog(); setView(view === 'history' ? 'editor' : 'history') }}
          style={{
            width: 40, height: 32,
            background: view === 'history' ? 'var(--hover)' : 'transparent',
            border: 'none', borderRadius: 'var(--radius-sm)',
            color: 'var(--muted)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.15s',
          }}
          title="历史记录"
        >
          <ClockIcon />
        </button>

        <div style={{ flex: 1 }} />
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, height: '100%',
        background: 'transparent', border: 'none',
        fontSize: 18,
        fontWeight: active ? 700 : 400,
        color: active ? 'var(--text)' : 'var(--faint)',
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        transition: 'color 0.2s',
      }}
    >
      {label}
    </button>
  )
}

function FolderOpenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z"/>
      <line x1="12" y1="11" x2="12" y2="17"/>
      <line x1="9" y1="14" x2="15" y2="14"/>
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}
