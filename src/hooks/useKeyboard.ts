import { useEffect, useCallback } from 'react'
import { useAppStore } from '@/stores/appStore'

/**
 * Global keyboard shortcuts — mirrors Typora / VS Code conventions.
 *
 * Shortcuts:
 *   Ctrl+O         Open files
 *   Ctrl+Shift+O   Open folder
 *   Ctrl+S         Export Markdown
 *   Ctrl+C         Copy (in editor context handled natively)
 *   Ctrl+Enter     Basic conversion
 *   Ctrl+Shift+Enter  LLM conversion
 *   Ctrl+B         Toggle sidebar
 *   Ctrl+,         Open settings
 *   Ctrl+H         Toggle history
 *   Ctrl+J         Toggle log panel
 *   Escape         Close popups / back to editor
 *   Ctrl+Shift+H   Show/hide history panel
 */
export function useKeyboard() {
  const {
    selectedPaths, isConverting,
    sidebarVisible, toggleSidebar,
    view, setView,
    viewMode, cycleViewMode,
    compareVisible, setCompareVisible,
    logVisible, toggleLog,
    showLLMPopup, setShowLLMPopup,
    activeResult,
  } = useAppStore()

  const handleKeyDown = useCallback(async (e: KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey

    // Ctrl+O — Open files
    if (mod && e.key === 'o' && !e.shiftKey) {
      e.preventDefault()
      const paths = await window.electronAPI.openFiles()
      if (paths.length) useAppStore.getState().addRootPaths(paths)
      return
    }

    // Ctrl+Shift+O — Open folder
    if (mod && e.shiftKey && e.key === 'O') {
      e.preventDefault()
      const paths = await window.electronAPI.openFolder()
      if (paths.length) useAppStore.getState().addRootPaths(paths)
      return
    }

    // Ctrl+S — Export
    if (mod && e.key === 's') {
      e.preventDefault()
      if (!activeResult) return
      const defaultName = (activeResult.title || 'output') + '.md'
      const filePath = await window.electronAPI.saveFile(defaultName)
      if (filePath) {
        const port = await window.electronAPI.getBackendPort()
        await fetch(`http://127.0.0.1:${port}/api/export`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: filePath, content: activeResult.markdown }),
        })
      }
      return
    }

    // Ctrl+Enter — Basic convert
    if (mod && e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isConverting || !selectedPaths.length) return
      // Trigger conversion via DOM event on the convert button
      const btn = document.querySelector('[data-action="convert-basic"]') as HTMLButtonElement
      btn?.click()
      return
    }

    // Ctrl+Shift+Enter — LLM convert
    if (mod && e.shiftKey && e.key === 'Enter') {
      e.preventDefault()
      if (isConverting || !selectedPaths.length) return
      const btn = document.querySelector('[data-action="convert-llm"]') as HTMLButtonElement
      btn?.click()
      return
    }

    // Ctrl+B — Toggle sidebar
    if (mod && e.key === 'b') {
      e.preventDefault()
      toggleSidebar()
      return
    }

    // Ctrl+, — Settings
    if (mod && e.key === ',') {
      e.preventDefault()
      setView(view === 'settings' ? 'editor' : 'settings')
      return
    }

    // Ctrl+H — History
    if (mod && e.key === 'h') {
      e.preventDefault()
      setView(view === 'history' ? 'editor' : 'history')
      return
    }

    // Ctrl+J — Toggle log
    if (mod && e.key === 'j') {
      e.preventDefault()
      toggleLog()
      return
    }

    // Escape — close popups / back
    if (e.key === 'Escape') {
      if (showLLMPopup) {
        setShowLLMPopup(false)
        return
      }
      if (view !== 'editor') {
        setView('editor')
        return
      }
    }
    // Ctrl+Shift+V — Toggle compare view
    if (mod && e.shiftKey && e.key === 'V') {
      e.preventDefault()
      setCompareVisible(!compareVisible)
      return
    }
  }, [
    selectedPaths, isConverting, sidebarVisible, toggleSidebar,
    view, setView, viewMode, cycleViewMode,
    compareVisible, setCompareVisible,
    logVisible, toggleLog,
    showLLMPopup, setShowLLMPopup, activeResult,
  ])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}
