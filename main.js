'use strict';
const electron = require('electron');
const app = electron.app;  // Module to control application life.
const BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.
const Menu = electron.Menu;
const ipcMain = electron.ipcMain;
const spawn = require('child_process').spawn;
const path = require('path');
const fs = require('fs');

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
  event.returnValue = openNotebook(arg);
});

function openNotebook(resource) {
  // resource may be a server to connect to or a file path to start a server at.
  if (resource.indexOf("://") != -1) {
    createNotebookWindow(resource);
    return true;
  }
  
  let info;
  let cwd = path.resolve(resource);
  try {
    info = fs.statSync(cwd);
  } catch (e) {
    return false;
  }
  if (!info.isDirectory())
    cwd = path.dirname(cwd);  // TODO: Save filename and open it in notebook
  
  let urlFound = false;
  let proc = spawn('jupyter', ['notebook', '--no-browser'], {'cwd': cwd});
  proc.stderr.on('data', function (data) {
    console.log("Server:", data.toString());
    if (!urlFound) {
      let url = data.toString().match(/https?:\/\/localhost:[0-9]*/);
      if (url) {
        urlFound = true;
        createNotebookWindow(url[0], proc);  // TODO: Pass cwd to be saved instead of host
      }
    }
  });
  return true;
}

function createNotebookWindow(host, proc) {
  // Create the browser window.
  let window = new BrowserWindow({width: 800, height: 600});
  if (proc) {
    window.server = proc;
    window.server.on('close', function (code, signal) {
      console.log("Server process ended.");
      window.server = null;
    });
  }

  // and load the index.html of the app.
  window.loadURL(`file://${__dirname}/index.html`);

  window.webContents.on('did-finish-load', function() {
    window.webContents.send('set-host', host);
  });

  // Emitted when the window is closed.
  window.on('closed', function() {
    if (window.server)
      window.server.kill()
    
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
  if (!host) {
    createConnectWindow();
  } else {
    if (!openNotebook(host)) {
      console.log("Error: Could not open notebook", host);
      app.exit(1);
    }
  }
});
