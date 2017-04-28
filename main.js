/* Copyright 2015-2016 Robert Schroll
 *
 * This file is part of Juno and is distributed under the terms of the
 * BSD license. See the file LICENSE for full details.
 *
 * This file derives from the Electron Quick STart example
 * (https://github.com/atom/electron-quick-start), which is in the
 * public domain.
 */
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

let configFile = null;
try {
  configFile = path.join(app.getPath('userData'), 'config.json')
} catch (err) {
  console.log(err);
}

function loadSettings() {
  let settings = {};
  if (configFile) {
    try {
      settings = JSON.parse(fs.readFileSync(configFile));
    } catch (err) {
      // pass
    }
  }
  return {
    sources: settings.sources || [],
    windows: settings.windows || {},
    certificates: settings.certificates || {},
  }
}
global.settings = loadSettings();

function saveSettings() {
  if (configFile)
    fs.writeFile(configFile, JSON.stringify(global.settings, null, '  '), function (err) {
      if (err)
        console.log(err);
    });
}

// Report crashes to our server.
//electron.crashReporter.start();

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

app.on('certificate-error', function(event, webContents, url, error, certificate, callback) {
  let host = url.match(/[a-z]*:\/\/([^\/]*)/)[1];
  let certText = certificate.data.toString();
  if (global.settings.certificates[host] == certText) {
    event.preventDefault();
    callback(true);
    return;
  }

  console.log(url);
  let buttons = ["Continue", "Abort"];
  let window = BrowserWindow.fromWebContents(webContents);
  let details =  + (error == "net::ERR_CERT_AUTHORITY_INVALID") ?
    "If you were expecting a self-signed certificate, this is probably a false alarm." :
    "This may be a sign of a man-in-the-middle attack.";
  let message = `Juno encountered a certificate error when connecting to ${host}, for a certificate claiming to be issued by ${certificate.issuerName}.  The error was

${error}

${details}`;

  let response = dialog.showMessageBox(window, {
    "type": "warning",
    "buttons": buttons,
    "title": "Certificate Error",
    "message": "Certificate Error",
    "detail": message,
    "cancelId": buttons.indexOf("Abort")
  });
  if (buttons[response] == "Continue") {
    event.preventDefault();
    callback(true);
    global.settings.certificates[host] = certText;
    saveSettings();
  } else {
    callback(false);
    webContents.send("set-host", null, null);
    window.host = null;
    window.path = null;
  }
});

ipcMain.on('open-host', function (event, arg) {
  openNotebook(arg);
});

ipcMain.on('open-dialog', function (event) {
  openDialog(BrowserWindow.fromWebContents(event.sender));
});

function runOnceLoaded(webContents, func) {
  if (webContents.isLoading())
    webContents.on('did-finish-load', func);
  else
    func();
}

function openConnectDialog() {
  for (let i in windows) {
    let window = windows[i];
    if (window.host == 'open-dialog') {
      window.show();
      return true;
    }
  }

  let window = createWindow('open-dialog');
  window.host = 'open-dialog';
  window.loadURL(`file://${__dirname}/connect.html`);

  let webContents = window.webContents;
  runOnceLoaded(webContents, function () {
    webContents.send('set-sources', global.settings.sources);
  });

  return true;
}

function closeConnectDialog(source) {
  let index = global.settings.sources.indexOf(source);
  if (index != -1)
    global.settings.sources.splice(index, 1);
  global.settings.sources.splice(0, 0, source);
  saveSettings();

  for (let i in windows) {
    let window = windows[i];
    if (window.host == 'open-dialog') {
      window.close();
      return;
    }
  }
}

function openNotebook(resource) {
  let host = resource;
  let localPath = null;

  if (!resource)
    return openConnectDialog();

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

  // See if any existing window matches the host or path, whichever is requested
  for (let i in windows) {
    let window = windows[i];
    if (host && host == window.host || localPath && localPath == window.path) {
      // Focus the window
      window.show();
      closeConnectDialog(resource);
      return true;
    }
  }

  let window = createWindow(localPath || host);

  function setHost(host, url) {
    window.host = host;
    // window.path set earlier, since we want that done ASAP
    window.loadURL(url);
    // We have to delay this to here, to avoid a crash.  (Don't know why.)
    closeConnectDialog(resource);
  }

  // If the window doesn't have the notebook open, open it.
  if (localPath) {
    console.log("Opening notebook server in " + localPath);
    window.path = localPath;
    let urlFound = false;
    let proc = spawn('jupyter', ['lab', '--no-browser'], {'cwd': localPath});
    window.server = proc;
    proc.stdout.on('data', function (data) { console.log("Stdout:", data.toString()); });
    proc.stderr.on('data', function (data) {
      console.log("Server:", data.toString());
      if (!urlFound) {
        let url = data.toString().match(/(https?:\/\/localhost:[0-9]*\/)\S*/);
        if (url) {
          urlFound = true;
          setHost(url[1], url[0]);
        }
      }
    });
    proc.on('close', function (code, signal) {
      console.log("Server process ended.");
      window.server = null;
    });
  } else {
    setHost(host, host);
  }

  // Focus the window.
  window.show();
  return true;
}

function createWindow(source) {
  let settings = {
    width: 800,
    height: 600,
    x: null,
    y: null,
    webPreferences: {nodeIntegration: source == 'open-dialog' ? true : false}
  }
  let saved = global.settings.windows[source];
  if (saved) {
    if (saved.width)
      settings.width = saved.width;
    if (saved.height)
      settings.height = saved.height;
    if (saved.x !== null)
      settings.x = saved.x;
    if (saved.y !== null)
      settings.y = saved.y;
  }

  // Create the browser window.
  let window = new BrowserWindow(settings);
  window.host = null;
  window.path = null;
  window.server = null;

  // and load the index.html of the app.
  //window.loadURL(`file://${__dirname}/index.html`);

  // Keep track of settings
  function saveWindowSettings() {
    let pos = window.getPosition();
    let size = window.getSize();
    global.settings.windows[source] = {
      'x': pos[0],
      'y': pos[1],
      'width': size[0],
      'height': size[1]
    };
    saveSettings();
  }
  window.on('resize', saveWindowSettings);
  window.on('move', saveWindowSettings);

  // Emitted when the window is closed.
  window.on('closed', function() {
    if (window.server)
      window.server.kill()

    // Dereference the window object.
    let index = windows.indexOf(window);
    if (index != -1)
      windows.splice(index, 1);
    else
      console.log("Couldn't find that window!");
  });

  if (source != 'open-dialog') {
    // The JupyterLab page will block closing with a beforeunload handler.  Electron
    // doesn't handle this well; see https://github.com/electron/electron/issues/2579
    window.on('close', function() {
      let buttons = ["Cancel", "Close", ];
      let message = "Closing the window will discard any unsaved changes.";
      if (window.server)
        message = message.slice(0, -1) + " and close the Jupyter server."

      let response = dialog.showMessageBox(window, {
        "type": "question",
        "buttons": buttons,
        "title": "Close Window",
        "message": "Close Window?",
        "detail": message,
        "cancelId": buttons.indexOf("Cancel"),
        "defaultId": buttons.indexOf("Close")
      });
      if (buttons[response] == "Close")
        window.destroy();
    });
  }

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
