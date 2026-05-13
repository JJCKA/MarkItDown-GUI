import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs'

let mainWindow: BrowserWindow | null = null
let pythonProcess: ChildProcess | null = null
let backendPort = 18720

function killBackendTree() {
  if (!pythonProcess) return
  // On Windows, kill the entire process tree (parent + all children)
  try {
    spawn('taskkill', ['/F', '/T', '/PID', String(pythonProcess.pid)], { stdio: 'ignore' })
  } catch {
    pythonProcess.kill()
  }
  pythonProcess = null
}

function findBackend(): { executable: string; args: string[] } {
  // 1. PyInstaller-bundled exe (production)
  const bundledExe = path.join(process.resourcesPath, 'backend', 'markitdown-backend.exe')
  if (fs.existsSync(bundledExe)) {
    console.log(`[Electron] Using bundled backend: ${bundledExe}`)
    return { executable: bundledExe, args: [] }
  }
  // 2. MDGUI venv Python (development)
  const venvPython = path.join(__dirname, '..', 'MDGUI', 'Scripts', 'python.exe')
  const backendPath = path.join(__dirname, '..', 'backend', 'main.py')
  if (fs.existsSync(venvPython)) {
    console.log(`[Electron] Using venv Python: ${venvPython}`)
    return { executable: venvPython, args: ['-u', backendPath] }
  }
  // 3. PATH fallback
  const backendPathFallback = path.join(__dirname, '..', 'backend', 'main.py')
  return { executable: 'python', args: ['-u', backendPathFallback] }
}

function findFreePort(): Promise<number> {
  return new Promise((resolve) => {
    const net = require('net')
    const server = net.createServer()
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as any).port
      server.close(() => resolve(port))
    })
  })
}

async function startBackend(): Promise<number> {
  const port = await findFreePort()
  backendPort = port
  const { executable, args } = findBackend()

  console.log(`[Electron] Starting backend on port ${port}: ${executable} ${args.join(' ')}`)
  pythonProcess = spawn(executable, args, {
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe']
  })

  pythonProcess.stdout?.on('data', (data: Buffer) => {
    console.log(`[Python] ${data.toString().trim()}`)
  })

  pythonProcess.stderr?.on('data', (data: Buffer) => {
    console.log(`[Python:err] ${data.toString().trim()}`)
  })

  pythonProcess.on('close', (code) => {
    console.log(`[Electron] Python backend exited with code ${code}`)
  })

  // Wait for backend to be ready
  await new Promise<void>((resolve) => {
    let attempts = 0
    const check = setInterval(async () => {
      attempts++
      try {
        const http = require('http')
        const req = http.get(`http://127.0.0.1:${port}/health`, (res: any) => {
          if (res.statusCode === 200) {
            clearInterval(check)
            resolve()
          }
        })
        req.on('error', () => {})
        req.end()
      } catch { /* retry */ }
      if (attempts > 30) {
        clearInterval(check)
        console.warn('[Electron] Backend start timeout, continuing anyway')
        resolve()
      }
    }, 500)
  })

  console.log(`[Electron] Python backend ready on port ${port}`)
  return port
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 550,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#ffffff',
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Window shadow on Windows
  mainWindow.setBackgroundColor('#00000000')

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

// ── IPC handlers ──

ipcMain.handle('fs:stat', async (_event, filepath: string) => {
  try {
    const stat = fs.statSync(filepath)
    return { isDir: stat.isDirectory(), isFile: stat.isFile(), size: stat.size }
  } catch {
    return { isDir: false, isFile: false, size: 0 }
  }
})

ipcMain.handle('fs:readdir', async (_event, dirpath: string) => {
  try {
    const entries = fs.readdirSync(dirpath, { withFileTypes: true })
    return entries
      .filter(e => !e.name.startsWith('.'))
      .map(e => ({
        name: e.name,
        path: path.join(dirpath, e.name),
        isDir: e.isDirectory(),
        isFile: e.isFile(),
      }))
      .sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1
        return a.name.localeCompare(b.name)
      })
  } catch {
    return []
  }
})

ipcMain.handle('backend-port', () => backendPort)

ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
  return mainWindow?.isMaximized()
})
ipcMain.handle('window:close', () => mainWindow?.close())
ipcMain.handle('window:is-maximized', () => mainWindow?.isMaximized() ?? false)

// Folder dialog
ipcMain.handle('dialog:open-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '所有支持格式', extensions: [
        'pdf','docx','doc','pptx','ppt','xlsx','xls','csv','json','xml',
        'yaml','yml','txt','md','html','jpg','jpeg','png','gif','bmp',
        'webp','svg','tiff','mp3','wav','m4a','flac','aac','ogg','wma','zip'
      ]},
      { name: '所有文件', extensions: ['*'] }
    ]
  })
  return result.canceled ? [] : result.filePaths
})

ipcMain.handle('dialog:open-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory']
  })
  return result.canceled ? [] : result.filePaths
})

ipcMain.handle('dialog:save-file', async (_event, defaultName: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath: defaultName,
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: '所有文件', extensions: ['*'] }
    ]
  })
  return result.canceled ? null : result.filePath
})

// ── App lifecycle ──

app.whenReady().then(async () => {
  await startBackend()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  killBackendTree()
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  killBackendTree()
})
