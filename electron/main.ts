import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { spawn, ChildProcess } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let mainWindow: BrowserWindow | null = null
let serverProcess: ChildProcess | null = null

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        frame: false, // 隐藏默认边框
        transparent: false,
        backgroundColor: '#ffffff',
        roundedCorners: true, // 启用圆角
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            sandbox: false,
            webSecurity: false
        }
    })

    // 开发环境加载 Vite 服务器，生产环境加载打包文件
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
        mainWindow.webContents.openDevTools()
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    }

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

// 窗口控制 IPC 处理
ipcMain.on('window-minimize', () => {
    if (mainWindow) {
        mainWindow.minimize()
    }
})

ipcMain.on('window-maximize', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize()
        } else {
            mainWindow.maximize()
        }
    }
})

ipcMain.on('window-close', () => {
    if (mainWindow) {
        mainWindow.close()
    }
})

// 打开外部链接
ipcMain.on('open-external', (event, url) => {
    shell.openExternal(url)
})

// 启动后端服务器
function startBackendServer() {
    // 生产环境下，后端可执行文件在 resources/server 目录
    // 开发环境下，需要从 ../server 目录启动
    const isDev = process.env.VITE_DEV_SERVER_URL !== undefined

    const logDir = path.join(app.getPath('userData'), 'logs')
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
    const logFile = path.join(logDir, 'backend.log')
    const logStream = fs.createWriteStream(logFile, { flags: 'a' })

    let serverPath: string
    let command: string
    let args: string[]
    let serverCwd: string

    if (isDev) {
        // 开发环境：直接运行后端项目（需要 npm run build:server）
        const parentDir = path.resolve(__dirname, '../../server')
        serverPath = path.join(parentDir, 'dist', 'server.js')
        command = 'node'
        args = [serverPath]
        serverCwd = parentDir
    } else {
        // 生产环境：先检查是否有 pkg 打包的 .exe，否则用 node 运行 .js
        const serverExePath = path.join(process.resourcesPath, 'server', 'constella-server.exe')
        const serverJsPath = path.join(process.resourcesPath, 'server', 'server.js')
        serverCwd = path.join(process.resourcesPath, 'server')

        if (fs.existsSync(serverExePath)) {
            // 使用 pkg 打包的可执行文件
            serverPath = serverExePath
            command = serverExePath
            args = []
        } else if (fs.existsSync(serverJsPath)) {
            // 降级：使用 Node.js 运行 JavaScript
            serverPath = serverJsPath
            command = 'node'
            args = [serverJsPath]
        } else {
            console.error('[Electron] Backend executable not found at:', serverExePath)
            console.error('[Electron] Backend script not found at:', serverJsPath)
            return
        }
    }

    console.log('[Electron] ========== Backend Server Starting ==========')
    console.log('[Electron] Environment:', isDev ? 'development' : 'production')
    console.log('[Electron] Server Path:', serverPath)
    console.log('[Electron] Server Command:', command)
    console.log('[Electron] App Resources Path:', process.resourcesPath)
    console.log('[Electron] Server Working Directory:', serverCwd)

    try {
        serverProcess = spawn(command, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: false,
            cwd: serverCwd,
            env: {
                ...process.env,
                NODE_ENV: isDev ? 'development' : 'production'
            }
        })

        if (!serverProcess || !serverProcess.pid) {
            console.error('[Electron] Failed to spawn backend process')
            return
        }

        console.log(`[Electron] Backend process spawned with PID: ${serverProcess.pid}`)

        serverProcess.stdout?.on('data', (data) => {
            console.log(`[Backend] ${data}`)
            if (!isDev) logStream.write(`[Backend] ${data}\n`)
        })

        serverProcess.stderr?.on('data', (data) => {
            console.error(`[Backend Error] ${data}`)
            if (!isDev) logStream.write(`[Backend Error] ${data}\n`)
        })

        serverProcess.on('error', (error) => {
            console.error('[Electron] Failed to start backend server:', error)
        })

        serverProcess.on('exit', (code, signal) => {
            console.warn(`[Electron] Backend server exited with code ${code} and signal ${signal}`)
        })

        console.log('[Electron] Backend server started successfully')
    } catch (error) {
        console.error('[Electron] Error starting backend:', error)
    }
}

app.whenReady().then(() => {
    // 启动后端服务器
    startBackendServer()

    // 等待后端启动后再创建窗口
    setTimeout(() => {
        createWindow()
    }, 1000)

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    // 关闭窗口时，结束后端进程
    if (serverProcess && !serverProcess.killed) {
        serverProcess.kill()
    }
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('before-quit', () => {
    // 确保后端进程被正确终止
    if (serverProcess && !serverProcess.killed) {
        serverProcess.kill()
    }
})
