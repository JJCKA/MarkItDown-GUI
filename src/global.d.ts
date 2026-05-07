export {}

interface FileStat {
  isDir: boolean
  isFile: boolean
  size: number
}

interface DirEntry {
  name: string
  path: string
  isDir: boolean
  isFile: boolean
}

declare global {
  interface Window {
    electronAPI: {
      minimize: () => Promise<void>
      maximize: () => Promise<boolean>
      close: () => Promise<void>
      isMaximized: () => Promise<boolean>
      getBackendPort: () => Promise<number>
      openFiles: () => Promise<string[]>
      openFolder: () => Promise<string[]>
      saveFile: (defaultName: string) => Promise<string | null>
      statPath: (filepath: string) => Promise<FileStat>
      readDir: (dirpath: string) => Promise<DirEntry[]>
    }
  }
}
