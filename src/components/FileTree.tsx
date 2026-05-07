import { useCallback, useEffect, useState } from 'react'
import { useAppStore, FileItem } from '@/stores/appStore'
import { Path } from '@/utils/path'

const SUPPORTED_EXTS = new Set([
  '.pdf','.docx','.doc','.pptx','.ppt','.xlsx','.xls',
  '.txt','.md','.html','.csv','.json','.xml',
  '.jpg','.jpeg','.png','.gif','.bmp','.webp',
  '.mp3','.wav','.m4a','.mp4','.avi','.zip',
])

export default function FileTree() {
  const {
    rootPaths, treeItems, setTreeItems,
    selectedPaths, addSelectedPath, removeSelectedPath, selectSingle,
    convertedPaths,
  } = useAppStore()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!rootPaths.length) {
      setTreeItems([])
      return
    }
    async function build() {
      setLoading(true)
      const items: FileItem[] = []
      for (const rp of rootPaths) {
        try {
          const stat = await window.electronAPI.statPath(rp)
          if (stat.isDir) {
            items.push({ path: rp, name: Path.basename(rp), isDir: true, depth: 0, expanded: false, loaded: false })
          } else if (stat.isFile) {
            const ext = Path.extname(rp).toLowerCase()
            if (SUPPORTED_EXTS.has(ext)) {
              items.push({ path: rp, name: Path.basename(rp), isDir: false, depth: 0, expanded: false, loaded: true })
            }
          }
        } catch { /* skip */ }
      }
      setTreeItems(items)
      setLoading(false)
    }
    build()
  }, [rootPaths, setTreeItems])

  const toggleDir = useCallback(async (idx: number) => {
    const items = [...treeItems]
    const item = items[idx]
    if (!item.isDir) return

    if (item.loaded) {
      item.loaded = false
      const depth = item.depth
      let removeCount = 0
      for (let i = idx + 1; i < items.length; i++) {
        if (items[i].depth > depth) removeCount++
        else break
      }
      items.splice(idx + 1, removeCount)
      setTreeItems(items)
    } else {
      item.loaded = true
      try {
        const entries = await window.electronAPI.readDir(item.path)
        const children: FileItem[] = []
        for (const entry of entries) {
          if (entry.isDir) {
            children.push({
              path: entry.path, name: entry.name,
              isDir: true, depth: item.depth + 1, expanded: false, loaded: false,
            })
          } else if (entry.isFile) {
            const ext = Path.extname(entry.name).toLowerCase()
            if (SUPPORTED_EXTS.has(ext)) {
              children.push({
                path: entry.path, name: entry.name,
                isDir: false, depth: item.depth + 1, expanded: false, loaded: true,
              })
            }
          }
        }
        items.splice(idx + 1, 0, ...children)
        setTreeItems(items)
      } catch {
        item.loaded = false
        setTreeItems([...items])
      }
    }
  }, [treeItems, setTreeItems])

  const handleClick = useCallback((e: React.MouseEvent, path: string, isDir: boolean, idx: number) => {
    if (isDir) { toggleDir(idx); return }
    if (e.ctrlKey || e.metaKey) {
      selectedPaths.includes(path) ? removeSelectedPath(path) : addSelectedPath(path)
    } else if (e.shiftKey && selectedPaths.length > 0) {
      addSelectedPath(path)
    } else {
      selectSingle(path)
    }
  }, [toggleDir, selectedPaths, addSelectedPath, removeSelectedPath, selectSingle])

  if (loading) {
    return (
      <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--faint)', fontSize: 13, fontFamily: 'var(--font-ui)' }}>
        加载中...
      </div>
    )
  }

  if (!treeItems.length) return null

  return (
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '2px 0' }}>
      {treeItems.map((item, idx) => {
        const isSelected = selectedPaths.includes(item.path)
        const isConverted = convertedPaths.includes(item.path)
        const ext = Path.extname(item.path).toLowerCase()
        const depth = item.depth

        return (
          <div
            key={item.path}
            onClick={(e) => handleClick(e, item.path, item.isDir, idx)}
            style={{
              display: 'flex', alignItems: 'center',
              height: 28, minHeight: 28,
              margin: '1px 4px', paddingLeft: 4 + depth * 10, paddingRight: 6,
              borderRadius: 'var(--radius-sm)',
              background: isSelected ? 'var(--selected)' : 'transparent',
              cursor: 'pointer', transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--hover)' }}
            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
          >
            {/* Expand arrow */}
            <span style={{
              width: 14, fontSize: 9, color: 'var(--faint)',
              flexShrink: 0, textAlign: 'center',
            }}>
              {item.isDir ? (item.loaded ? '▾' : '▸') : ''}
            </span>

            {/* Icon — 16px gray line icon */}
            <span style={{
              width: 16, height: 16, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginLeft: item.isDir ? 0 : 14,
              color: 'var(--muted)',
            }}>
              {item.isDir ? <DirIcon /> : <FileIcon ext={ext} />}
            </span>

            {/* Name */}
            <span style={{
              flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontSize: 16, fontFamily: 'var(--font-ui)',
              fontWeight: item.isDir ? 600 : 400,
              color: item.isDir ? 'var(--text)' : 'var(--muted)',
              marginLeft: 4,
            }}>
              {item.name}
            </span>

            {/* Converted checkmark */}
            {isConverted && (
              <span style={{ width: 14, fontSize: 11, color: 'var(--success)', flexShrink: 0, textAlign: 'center' }}>
                ✓
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── SVG line icons — all 16px, strokeWidth 1.5, var(--muted) ──

function DirIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M2 6a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z"/>
    </svg>
  )
}

function FileIcon({ ext }: { ext: string }) {
  if (ext === '.pdf') return <PdfIcon />
  if (ext === '.docx' || ext === '.doc') return <DocIcon />
  if (ext === '.pptx' || ext === '.ppt') return <SlideIcon />
  if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') return <GridIcon />
  if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.gif' || ext === '.bmp' || ext === '.webp') return <ImageIcon />
  if (ext === '.mp3' || ext === '.wav' || ext === '.m4a' || ext === '.ogg') return <AudioIcon />
  if (ext === '.mp4' || ext === '.avi') return <VideoIcon />
  if (ext === '.html') return <GlobeIcon />
  if (ext === '.json' || ext === '.xml') return <BracesIcon />
  // default: generic document
  return <TextIcon />
}

function PdfIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="13" x2="15" y2="13"/>
      <line x1="9" y1="17" x2="13" y2="17"/>
    </svg>
  )
}

function DocIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="13" x2="15" y2="13"/>
      <line x1="9" y1="17" x2="15" y2="17"/>
    </svg>
  )
}

function SlideIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="2" y="4" width="20" height="16" rx="2"/>
      <line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="3" y1="9" x2="21" y2="9"/>
      <line x1="3" y1="15" x2="21" y2="15"/>
      <line x1="9" y1="3" x2="9" y2="21"/>
      <line x1="15" y1="3" x2="15" y2="21"/>
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <circle cx="8.5" cy="8.5" r="1.5"/>
      <polyline points="21 15 16 10 5 21"/>
    </svg>
  )
}

function AudioIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M9 18V5l12-2v13"/>
      <circle cx="6" cy="18" r="3"/>
      <circle cx="18" cy="16" r="3"/>
    </svg>
  )
}

function VideoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <polygon points="23 7 16 12 23 17 23 7"/>
      <rect x="1" y="5" width="15" height="14" rx="2"/>
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  )
}

function BracesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M16 18l6-6-6-6"/>
      <path d="M8 6l-6 6 6 6"/>
    </svg>
  )
}

function TextIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="9" y1="15" x2="15" y2="15"/>
    </svg>
  )
}
