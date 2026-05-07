/**
 * Minimal path utilities for the renderer process.
 * In Electron, we work with full absolute paths from the main process.
 * This avoids importing Node's path module directly in the renderer.
 */

export const Path = {
  basename(filepath: string): string {
    const normalized = filepath.replace(/\\/g, '/')
    return normalized.split('/').pop() || filepath
  },

  dirname(filepath: string): string {
    const normalized = filepath.replace(/\\/g, '/')
    const parts = normalized.split('/')
    parts.pop()
    return parts.join('/') || '.'
  },

  extname(filepath: string): string {
    const name = Path.basename(filepath)
    const idx = name.lastIndexOf('.')
    return idx > 0 ? name.slice(idx) : ''
  },

  stem(filepath: string): string {
    const name = Path.basename(filepath)
    const idx = name.lastIndexOf('.')
    return idx > 0 ? name.slice(0, idx) : name
  },

  join(...parts: string[]): string {
    return parts.map(p => p.replace(/\\/g, '/').replace(/\/+$/, '')).join('/')
  },
}
