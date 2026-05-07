import { create } from 'zustand'
import { ConversionResult, HistoryItem } from '@/api/client'

type ViewState = 'editor' | 'settings' | 'history'

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

  // View mode
  isSourceMode: boolean
  toggleSourceMode: () => void

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

  isSourceMode: false,
  toggleSourceMode: () => set(s => ({ isSourceMode: !s.isSourceMode })),

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
}))
