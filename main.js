const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')

const createWindow = () => {
    const win = new BrowserWindow({
        width: 1200,
        height: 900,
        backgroundColor: '#0f172a', // Deep dark blue
        title: '지만이의 스톤피디아',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    // Remove menu
    win.setMenuBarVisibility(false)

    win.loadFile('index.html')
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// IPC to read pets.json
ipcMain.handle('read-pets', async () => {
    try {
        const filePath = path.join(__dirname, 'pets.json')
        console.log('Reading pets from:', filePath)

        if (filePath && typeof filePath === 'string' && fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8')
            return JSON.parse(data)
        }
        console.warn('pets.json not found at:', filePath)
        return []
    } catch (error) {
        console.error('Error reading pets.json:', error)
        throw error // Propagate to renderer's catch block
    }
})