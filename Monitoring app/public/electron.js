const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { initDatabase } = require('../src/database/connection');
const { setupAuthIPC } = require('../src/ipc/auth');
const { setupMonitoringIPC } = require('../src/ipc/monitoring');
const { setupReportsIPC } = require('../src/ipc/reports');

// Keep a global reference of the window object
let mainWindow;
let monitoringWindows = {};

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, '../src/preload.js')
    },
    icon: path.join(__dirname, '../build/icon.png'),
    show: false
  });

  // Load the app
  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open the DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Set up application menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            shell.openExternal('https://github.com/your-repo');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  // Initialize the database
  initDatabase();
  
  // Set up IPC handlers
  setupAuthIPC();
  setupMonitoringIPC();
  setupReportsIPC();
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC handler for creating employee monitoring window
ipcMain.handle('create-monitoring-window', (event, employeeId) => {
  if (monitoringWindows[employeeId]) {
    // Focus existing window if it's already open
    monitoringWindows[employeeId].focus();
    return true;
  }

  const monitoringWindow = new BrowserWindow({
    width: 400,
    height: 300,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../src/preload.js')
    },
    icon: path.join(__dirname, '../build/icon.png'),
    show: false
  });

  monitoringWindow.loadURL(
    isDev
      ? `http://localhost:3000/employee-monitor/${employeeId}`
      : `file://${path.join(__dirname, '../build/index.html#/employee-monitor/${employeeId}')}`
  );

  monitoringWindow.once('ready-to-show', () => {
    monitoringWindow.show();
  });

  monitoringWindow.on('closed', () => {
    delete monitoringWindows[employeeId];
  });

  monitoringWindows[employeeId] = monitoringWindow;
  return true;
});

// IPC handler for closing employee monitoring window
ipcMain.handle('close-monitoring-window', (event, employeeId) => {
  if (monitoringWindows[employeeId]) {
    monitoringWindows[employeeId].close();
    delete monitoringWindows[employeeId];
    return true;
  }
  return false;
});