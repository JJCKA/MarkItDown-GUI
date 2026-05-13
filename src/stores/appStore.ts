import { create } from 'zustand'
import { ConversionResult, HistoryItem } from '@/api/client'

export interface QueueItem {
  path: string
  name: string
  status: 'pending' | 'converting' | 'done' | 'error' | 'cancelled'
  result?: ConversionResult
  error?: string
}

interface ConversionStats {
  totalConversions: number
  totalChars: number
  llmCalls: number
  totalTimeMs: number
  successCount: number
  failCount: number
}

const STATS_KEY = 'markitdown-ui-stats'

function loadStats(): ConversionStats {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (raw) return { ...getDefaultStats(), ...JSON.parse(raw) }
  } catch {}
  return getDefaultStats()
}

function getDefaultStats(): ConversionStats {
  return { totalConversions: 0, totalChars: 0, llmCalls: 0, totalTimeMs: 0, successCount: 0, failCount: 0 }
}

function saveStats(stats: ConversionStats) {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)) } catch {}
}

type ViewState = 'editor' | 'settings' | 'history' | 'stats'

interface ConversionProgress {
  current: number
  total: number
  filename: string
}

export interface FileItem {
  path: string
  name: string
  isDir: boolean
  depth: number
  expanded: boolean
  loaded: boolean
}

interface AppStore {
  // View state
  view: ViewState
  setView: (v: ViewState) => void

  // Sidebar
  sidebarWidth: number
  setSidebarWidth: (w: number) => void
  sidebarVisible: boolean
  toggleSidebar: () => void
  activeTab: 'files' | 'converted'
  setActiveTab: (t: 'files' | 'converted') => void

  // View mode (preview / source toggle)
  viewMode: 'preview' | 'source'
  cycleViewMode: () => void

  // Compare overlay
  compareVisible: boolean
  setCompareVisible: (v: boolean) => void

  // Files
  rootPaths: string[]
  addRootPaths: (paths: string[]) => void
  treeItems: FileItem[]
  setTreeItems: (items: FileItem[]) => void
  selectedPaths: string[]
  setSelectedPaths: (paths: string[]) => void
  addSelectedPath: (path: string) => void
  removeSelectedPath: (path: string) => void
  selectSingle: (path: string) => void
  convertedPaths: string[]
  addConverted: (path: string) => void

  // Conversion
  isConverting: boolean
  setIsConverting: (v: boolean) => void
  activeResult: ConversionResult | null
  setActiveResult: (r: ConversionResult | null) => void
  results: Map<string, ConversionResult>
  setResult: (path: string, r: ConversionResult) => void
  progress: ConversionProgress | null
  setProgress: (p: ConversionProgress | null) => void
  statusText: string
  setStatusText: (t: string) => void
  charCount: string
  setCharCount: (t: string) => void
  elapsedMs: string
  setElapsedMs: (t: string) => void

  // Log
  logs: string[]
  addLog: (msg: string) => void
  clearLogs: () => void
  logVisible: boolean
  toggleLog: () => void

  // Settings
  showLLMPopup: boolean
  setShowLLMPopup: (v: boolean) => void

  // History
  historyItems: HistoryItem[]
  setHistoryItems: (items: HistoryItem[]) => void

  // Navigation flag — skip useEffect auto-select when clicking history/queue items
  skipAutoSelect: boolean
  setSkipAutoSelect: (v: boolean) => void

  // Stats
  stats: ConversionStats
  recordConversion: (result: ConversionResult) => void

  // Queue
  queueItems: QueueItem[]
  queueVisible: boolean
  setQueueVisible: (v: boolean) => void
  initQueue: (paths: string[]) => void
  updateQueueItem: (path: string, update: Partial<QueueItem>) => void
  clearQueue: () => void
  cancelQueue: () => void
}

export const useAppStore = create<AppStore>((set, get) => ({
  view: 'editor',
  setView: (v) => {
    set({ view: v })
    if (v !== 'editor') set({ showLLMPopup: false })
  },

  sidebarWidth: 288,
  setSidebarWidth: (w) => set({ sidebarWidth: Math.max(250, Math.min(600, w)) }),
  sidebarVisible: true,
  toggleSidebar: () => set(s => ({ sidebarVisible: !s.sidebarVisible })),

  activeTab: 'files',
  setActiveTab: (t) => set({ activeTab: t }),

  viewMode: 'preview',
  cycleViewMode: () => set(s => ({
    viewMode: s.viewMode === 'preview' ? 'source' : 'preview'
  })),

  compareVisible: false,
  setCompareVisible: (v) => set({ compareVisible: v }),

  rootPaths: [],
  addRootPaths: (paths) => {
    const existing = get().rootPaths
    const added = paths.filter(p => !existing.includes(p))
    if (added.length) set({ rootPaths: [...existing, ...added] })
  },
  treeItems: [],
  setTreeItems: (items) => set({ treeItems: items }),

  selectedPaths: [],
  setSelectedPaths: (paths) => set({ selectedPaths: paths }),
  addSelectedPath: (path) => {
    const current = get().selectedPaths
    if (!current.includes(path)) set({ selectedPaths: [...current, path] })
  },
  removeSelectedPath: (path) => {
    set(s => ({ selectedPaths: s.selectedPaths.filter(p => p !== path) }))
  },
  selectSingle: (path) => set({ selectedPaths: [path] }),

  convertedPaths: [],
  addConverted: (path) => {
    const converted = get().convertedPaths
    if (!converted.includes(path)) set({ convertedPaths: [...converted, path] })
  },

  isConverting: false,
  setIsConverting: (v) => set({ isConverting: v }),
  activeResult: null,
  setActiveResult: (r) => set({ activeResult: r }),
  results: new Map(),
  setResult: (path, r) => {
    const results = new Map(get().results)
    results.set(path, r)
    set({ results })
  },
  progress: null,
  setProgress: (p) => set({ progress: p }),
  statusText: '就绪',
  setStatusText: (t) => set({ statusText: t }),
  charCount: '',
  setCharCount: (t) => set({ charCount: t }),
  elapsedMs: '',
  setElapsedMs: (t) => set({ elapsedMs: t }),

  logs: [],
  addLog: (msg) => set(s => ({ logs: [...s.logs, msg] })),
  clearLogs: () => set({ logs: [] }),
  logVisible: false,
  toggleLog: () => set(s => ({ logVisible: !s.logVisible })),

  showLLMPopup: false,
  setShowLLMPopup: (v) => set({ showLLMPopup: v }),

  historyItems: [],
  setHistoryItems: (items) => set({ historyItems: items }),

  skipAutoSelect: false,
  setSkipAutoSelect: (v) => set({ skipAutoSelect: v }),

  stats: loadStats(),
  recordConversion: (result) => {
    const current = get().stats
    const updated: ConversionStats = {
      totalConversions: current.totalConversions + 1,
      totalChars: current.totalChars + (result.char_count || 0),
      llmCalls: current.llmCalls + (result.used_llm ? 1 : 0),
      totalTimeMs: current.totalTimeMs + (result.elapsed_ms || 0),
      successCount: current.successCount + (result.success ? 1 : 0),
      failCount: current.failCount + (result.success ? 0 : 1),
    }
    saveStats(updated)
    set({ stats: updated })
  },

  queueItems: [],
  queueVisible: false,
  setQueueVisible: (v) => set({ queueVisible: v }),
  initQueue: (paths) => {
    const items: QueueItem[] = paths.map(p => ({
      path: p,
      name: p.split(/[/\\]/).pop() || p,
      status: 'pending',
    }))
    set({ queueItems: items, queueVisible: true })
  },
  updateQueueItem: (path, update) => {
    set(s => ({
      queueItems: s.queueItems.map(item =>
        item.path === path ? { ...item, ...update } : item
      ),
    }))
  },
  clearQueue: () => set({ queueItems: [], queueVisible: false }),
  cancelQueue: () => {
    set(s => ({
      queueItems: s.queueItems.map(item =>
        item.status === 'pending' ? { ...item, status: 'cancelled' as const } : item
      ),
    }))
  },
}))
