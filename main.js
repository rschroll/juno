'use strict';
const electron = require('electron');
const app = electron.app;  // Module to control application life.
const BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.
const Menu = electron.Menu;
const ipcMain = electron.ipcMain;

app.commandLine.appendSwitch('ignore-certificate-errors')

// Report crashes to our server.
electron.crashReporter.start();

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let windows = [];

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform != 'darwin') {
    app.quit();
  }
});

ipcMain.on('open-host', function (event, arg) {
  createNotebookWindow(arg);
});

function createNotebookWindow(host) {
  // Create the browser window.
  let window = new BrowserWindow({width: 800, height: 600});

  // and load the index.html of the app.
  window.loadURL(`file://${__dirname}/index.html`);

  window.webContents.on('did-finish-load', function() {
    window.webContents.send('set-host', host);
  });

  // Emitted when the window is closed.
  window.on('closed', function() {
    // Dereference the window object.
    let index = windows.indexOf(window);
    if (index != -1)
      windows.splice(index, 1);
  });
  
  windows.push(window);
}

function createConnectWindow() {
  let window = new BrowserWindow({width: 300, height: 100});
  window.loadURL(`file://${__dirname}/connect.html`);
  
  window.on('closed', function () {
    let index = windows.indexOf(window);
    if (index != -1)
      windows.splice(index, 1);
  });
  
  windows.push(window);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
  let template = [
    {
      label: "Debug",
      submenu: [
        {
          label: "Reload",
          accelerator: "CmdOrCtrl+R",
          click: function(item, focusedWindow) {
            if (focusedWindow)
              focusedWindow.reload();
          }
        },
        {
          label: "Toggle Developer Tools",
          accelerator: "CmdOrCtrl+Shift+I",
          click: function(item, focusedWindow) {
            if(focusedWindow)
              focusedWindow.webContents.toggleDevTools();
          }
        },
        {
          label: "Toggle Developer Tools for Current Notebook",
          accelerator: "Alt+Shift+I",
          click: function(item, focusedWindow) {
            if (focusedWindow)
              focusedWindow.webContents.send('toggle-dev-tools');
          }
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  
  let host = process.argv[2];
  if (!host)
    createConnectWindow();
  else
    createNotebookWindow(host);
});
