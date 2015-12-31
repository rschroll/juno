'use strict';
const electron = require('electron');
const app = electron.app;  // Module to control application life.
const BrowserWindow = electron.BrowserWindow;  // Module to create native browser window.
const Menu = electron.Menu;
const ipcMain = electron.ipcMain;
const dialog = electron.dialog;
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
  openNotebook(arg);
});

ipcMain.on('open-dialog', function (event) {
  openDialog(BrowserWindow.fromWebContents(event.sender));
});

function openNotebook(resource) {
  let host = resource;
  let localPath = null;
  
  if (resource) {
    // Check if the resource is a path, not a URL
    if (resource.indexOf("://") == -1) {
      let info;
      localPath = path.resolve(resource);
      host = null;
      try {
        info = fs.statSync(localPath);
      } catch (e) {
        console.log("Could not stat path: " + localPath);
        return false;
      }
      if (!info.isDirectory())
        localPath = path.dirname(localPath);  // TODO: Save filename and open it in notebook
    } else {
      // Normalize trailing slash
      if (host.slice(-1) != "/")
        host += "/";
    }
  }
  
  // See if any existing window matches the host or path, whichever is requested
  let window = null;
  let empty = null;
  for (let i in windows) {
    let win = windows[i];
    if (host && host == win.host || localPath && localPath == win.path) {
      window = win;
      break;
    }
    if (!win.host && !win.path)
      empty = win;
  }
  
  // If we didn't find an appropriate window, see if there are any windows that aren't
  // displaying notebooks, and use that.
  if (!window)
    window = empty;
  // And if not, create a new window.
  if (!window)
    window = createWindow();
  
  function setHost(host) {
    window.host = host;
    
    let webContents = window.window.webContents;
    function sendToClient() {
      webContents.send('set-host', host);
    }
    if (webContents.isLoading())
      webContents.on('did-finish-load', sendToClient);
    else
      sendToClient();
  }
  
  // If the window doesn't have the notebook open, open it.
  if (localPath && !window.path) {
    console.log("Opening notebook server in " + localPath);
    window.path = localPath;
    let urlFound = false;
    let proc = spawn('jupyter', ['notebook', '--no-browser'], {'cwd': localPath});
    window.server = proc;
    proc.stdout.on('data', function (data) { console.log("Stdout:", data.toString()); });
    proc.stderr.on('data', function (data) {
      console.log("Server:", data.toString());
      if (!urlFound) {
        let url = data.toString().match(/https?:\/\/localhost:[0-9]*\//);
        if (url) {
          urlFound = true;
          setHost(url[0]);
        }
      }
    });
    proc.on('close', function (code, signal) {
      console.log("Server process ended.");
      window.server = null;
    });
  } else if (!window.host) {
    setHost(host);
  }
  
  // Focus the window.
  window.window.show();
  return true;
}

function createWindow() {
  // Create the browser window.
  let window = {
    "window": new BrowserWindow({width: 800, height: 600}),
    "host": null,
    "path": null,
    "server": null
  };

  // and load the index.html of the app.
  window.window.loadURL(`file://${__dirname}/index.html`);

  // Emitted when the window is closed.
  window.window.on('closed', function() {
    if (window.server)
      window.server.kill()
    
    // Dereference the window object.
    let index = windows.indexOf(window);
    if (index != -1)
      windows.splice(index, 1);
    else
      console.log("Couldn't find that window!");
  });
  
  windows.push(window);
  return window;
}

function openDialog(parent) {
  dialog.showOpenDialog(parent, {"properties": ["openDirectory"]},
                        function (filenames) {
                          if (filenames)
                            openNotebook(filenames[0]);
                        });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function() {
  let template = [
    {
      label: "File",
      submenu: [
        {
          label: "New Window",
          accelerator: "CmdOrCtrl+N",
          click: function(item, focusedWindow) {
            openNotebook(null);
          }
        },
        {
          label: "Open Directory",
          accelerator: "CmdOrCtrl+O",
          click: function(item, focusedWindow) {
            openDialog(focusedWindow);
          }
        }
      ]
    },
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
  if (!openNotebook(host)) {
    console.log("Error: Could not open notebook", host);
    app.exit(1);
  }
});
