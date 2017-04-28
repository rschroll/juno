/* Copyright 2015-2017 Robert Schroll
 *
 * This file is part of Juno and is distributed under the terms of the
 * BSD license. See the file LICENSE for full details.
 *
 * This file derives from the Electron Quick Start example
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
const process = require('process');

/***** Settings *****/
let settings = {
  sources: [],
  windows: {},
  certificates: {},

  configFile: path.join(app.getPath('userData'), 'config.json'),

  load() {
    let readSettings = {};
    try {
      readSettings = JSON.parse(fs.readFileSync(this.configFile));
    } catch (err) {
      return;
    }
    this.sources = readSettings.sources || this.sources;
    this.windows = readSettings.windows || this.windows;
    this.certificates = readSettings.certificates || this.certificates;
  },

  save() {
    let writeSettings = {
      sources: this.sources,
      windows: this.windows,
      certificates: this.certificates
    };
    fs.writeFile(this.configFile, JSON.stringify(writeSettings, null, '  '),
                 (err) => {
                   if (err)
                     console.log(err);
                 });
  },

  updateSources(source) {
    let index = this.sources.indexOf(source);
    if (index != -1)
      this.sources.splice(index, 1);
    this.sources.splice(0, 0, source);
    this.save();
  },

  updateCertificate(host, cert) {
    this.certificates[host] = cert;
    this.save();
  },

  getWindowSettings(source) {
    let saved = this.windows[source] || {};
    return {
      width: saved.width || 800,
      height: saved.height || 600,
      x: saved.x,  // Null okay here, as that will cause desired centering
      y: saved.y,
    }
  },

  updateWindowSettings(source, newSettings) {
    this.windows[source] = newSettings;
    this.save();
  },
};
settings.load();

/***** Windows *****/
// Keep a global reference of the window objects, if you don't, the windows will
// be closed automatically when the JavaScript object is garbage collected.
let windows = {
  list: [],

  new(resource, settings) {
    let window = new BrowserWindow(settings);
    window.resource = resource;
    window.server = null;
    window.on('closed', () => this.remove(window));
    this.list.push(window);

    return window
  },

  remove(window) {
    let index = this.list.indexOf(window);
    if (index != -1)
      this.list.splice(index, 1);
    else
      console.log("Couldn't find that window!");
  },

  findWindow(resource) {
    for (let i in this.list) {
      let window = this.list[i];
      if (resource == window.resource) {
        return window;
      }
    }
    return null;
  },

  focusWindow(resource) {
    let window = this.findWindow(resource);
    if (window) {
      window.show();
      return true;
    }
    return false
  },

  closeWindow(resource) {
    let window = this.findWindow(resource);
    if (window) {
      window.close();
      return true;
    }
    return false;
  },
};

/***** Functions *****/
function runOnceLoaded(webContents, func) {
  if (webContents.isLoading())
    webContents.on('did-finish-load', func);
  else
    func();
}

function openConnectDialog() {
  if (windows.focusWindow('open-dialog'))
    return true;

  let window = windowWithSettings('open-dialog');
  window.resource = 'open-dialog';
  window.loadURL(`file://${__dirname}/connect.html`);

  let webContents = window.webContents;
  runOnceLoaded(webContents, function () {
    webContents.send('set-sources', settings.sources);
  });

  return true;
}

function closeConnectDialog() {
  windows.closeWindow('open-dialog');
}

function openNotebook(resource) {
  let localPath = false;

  // Check if the resource is a path, not a URL
  if (resource.indexOf("://") == -1) {
    let info;
    resource = path.resolve(resource);
    localPath = true;
    try {
      info = fs.statSync(resource);
    } catch (e) {
      console.log("Could not stat path: " + resource);
      return false;
    }
    if (!info.isDirectory())
      resource = path.dirname(resource);  // TODO: Save filename and open it in notebook
  } else {
    // Normalize trailing slash
    if (resource.slice(-1) != "/")
      resource += "/";
  }
  settings.updateSources(resource);

  // We can't close the connect dialog now, since it may be the parent to an open
  // dialog that has called this function.  Instead, close it soon.
  process.nextTick(closeConnectDialog);

  // See if any existing window matches the resource
  if (windows.focusWindow(resource))
    return true;

  let window = windowWithSettings(resource, { webPreferences: { nodeIntegration: false } });

  if (localPath) {
    console.log("Opening notebook server in " + resource);
    let urlFound = false;
    let proc = spawn('jupyter', ['lab', '--no-browser'], {'cwd': resource});
    window.server = proc;
    proc.stdout.on('data', (data) => console.log("Stdout:", data.toString()) );
    proc.stderr.on('data', (data) => {
      console.log("Server:", data.toString());
      if (!urlFound) {
        let url = data.toString().match(/https?:\/\/localhost:[0-9]*\/\S*/);
        if (url) {
          urlFound = true;
          window.loadURL(url[0]);
        }
      }
    });
    proc.on('close', (code, signal) => {
      console.log("Server process ended.");
      window.server = null;
    });
    window.on('closed', () => {
      if (window.server)
        window.server.kill()
    });
  } else {
    window.loadURL(resource);
  }

  // The JupyterLab page will block closing with a beforeunload handler.  Electron
  // doesn't handle this well; see https://github.com/electron/electron/issues/2579
  window.on('close', () => {
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

  return true;
}

function windowWithSettings(resource, extraSettings) {
  let winSettings = Object.assign(settings.getWindowSettings(resource), extraSettings);
  let window = windows.new(resource, winSettings);

  // Keep track of settings
  function saveWindowSettings() {
    let pos = window.getPosition();
    let size = window.getSize();
    settings.updateWindowSettings(resource, {
      'x': pos[0],
      'y': pos[1],
      'width': size[0],
      'height': size[1]
    });
  }
  window.on('resize', saveWindowSettings);
  window.on('move', saveWindowSettings);

  return window;
}

function openDialog(parent) {
  dialog.showOpenDialog(parent, {"properties": ["openDirectory"]},
                        function (filenames) {
                          if (filenames)
                            openNotebook(filenames[0]);
                        });
}

/***** Application event handlers *****/
// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform != 'darwin') {
    app.quit();
  }
});

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  let host = url.match(/[a-z]*:\/\/([^\/]*)/)[1];
  let certText = certificate.data.toString();
  if (settings.certificates[host] == certText) {
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
    settings.updateCertificate(host, certText);
  } else {
    callback(false);
    openConnectDialog();
    window.destroy();
  }
});

ipcMain.on('open-host', function (event, arg) {
  openNotebook(arg);
});

ipcMain.on('open-dialog', function (event) {
  openDialog(BrowserWindow.fromWebContents(event.sender));
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
  let template = [
    {
      label: "File",
      submenu: [
        {
          label: "New Window",
          accelerator: "CmdOrCtrl+N",
          click: (item, focusedWindow) => openConnectDialog()
        },
        {
          label: "Open Directory",
          accelerator: "CmdOrCtrl+O",
          click: (item, focusedWindow) => openDialog()
        }
      ]
    },
    {
      label: "Debug",
      submenu: [
        {
          label: "Reload",
          accelerator: "CmdOrCtrl+R",
          click: (item, focusedWindow) => focusedWindow && focusedWindow.reload()
        },
        {
          label: "Toggle Developer Tools",
          accelerator: "CmdOrCtrl+Shift+I",
          click: (item, focusedWindow) => focusedWindow && focusedWindow.webContents.toggleDevTools()
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  let resource = process.argv[2];
  if (resource) {
    if (!openNotebook(resource)) {
      console.log("Error: Could not open notebook", resource);
      app.exit(1);
    }
  } else {
    openConnectDialog();
  }
});
