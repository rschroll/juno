/* Copyright 2015-2017 Robert Schroll
 *
 * This file is part of Juno and is distributed under the terms of the
 * BSD license. See the file LICENSE for full details.
 */
'use strict';
const { dialog, BrowserWindow } = require('electron');
const { spawn, execSync } = require('child_process');
const process = require('process');
const parseSpawnArgs = require('parse-spawn-args').parse;
const path = require('path');
const fs = require('fs');

const { BUFFER_LEN, JUPYTERLAB_CMD, WEB_DIR } = require('./constants.js')
const settings = require('./settings.js');
const windows = require('./windows.js');
const windowWithSettings = require('./windowwithsettings.js');
const { closeConnectDialog } = require('./connectdialog.js');

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

  let window = windowWithSettings(resource, { webPreferences: {
    nodeIntegration: false,
    preload: path.join(WEB_DIR, 'preload.js'),
  } });

  if (localPath) {
    window.localServer = true;
    startServer(window);
    window.on('closed', () => {
      if (window.server) {
        window.server.removeAllListeners('exit');
        window.server.kill();
      }
    });
  } else {
    window.loadURL(resource);
  }

  // The JupyterLab page will block closing with a beforeunload handler.  Electron
  // doesn't handle this well; see https://github.com/electron/electron/issues/2579
  window.on('close', (event) => {
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
    if (buttons[response] == "Cancel")
      event.preventDefault();
  });

  return true;
}

function startServer(window) {
  console.log("Opening notebook server in " + window.resource);
  let urlFound = false;
  let cmd = parseSpawnArgs(settings.getWindowSettings(window.resource)['cmd']);
  let proc = spawn(cmd[0], cmd.slice(1), {'cwd': window.resource});
  window.server = proc;
  window.buffer = [];

  function appendToBuffer(line) {
    window.buffer = window.buffer.splice(-BUFFER_LEN + 1);
    window.buffer.push(line);
    if (window.serverPane) {
      window.serverPane.webContents.send('output-line', line);
    }
  }

  proc.stdout.on('data', (data) => {
    data = data.toString();
    appendToBuffer(data);
    console.log("Stdout:", data);
  });
  proc.stderr.on('data', (data) => {
    data = data.toString();
    appendToBuffer(data);
    console.log("Server:", data);
    if (!urlFound) {
      let url = data.match(/https?:\/\/localhost:[0-9]*\/\S*/);
      if (url) {
        urlFound = true;
        window.loadURL(url[0]);
      }
    }
  });
  proc.on('error', (error) => {
    console.log(`Server process error:\n${error}`);
    window.server = null;
    appendToBuffer(`Error spawning server process: ${error.errno}\n  ${error.message}\n`)
    openServerPane(window, "Server Failed to Start");
  });
  proc.on('exit', (code, signal) => {
    console.log("Server process ended.");
    window.server = null;
    openServerPane(window, "Server Died");
  });
}

function openDialog(parent) {
  dialog.showOpenDialog(parent, {"properties": ["openDirectory"]},
                        (filenames) => filenames && openNotebook(filenames[0]));
}

function openServerPane(window, title) {
  if (window.serverPane) {
    window.serverPane.show();
    window.serverPane.webContents.send('set-title', title);
    return;
  }

  let serverPane = new BrowserWindow({
    parent: window,
    modal: true,
    width: 800,
    height: 600,
    show: false,
  });
  window.serverPane = serverPane;
  serverPane.setMenu(null);
  serverPane.loadURL(`file://${WEB_DIR}/server.html`);
  serverPane.once('ready-to-show', () => {
    serverPane.show();
    if (title)
      serverPane.webContents.send('set-title', title);
    for (let i in window.buffer)
      serverPane.webContents.send('output-line', window.buffer[i]);
  });
  serverPane.on('closed', () => { window.serverPane = null; });
}

function condaJupyter(env) {
  let cmd = null;
  try {
    cmd = execSync(`source activate ${env} && which jupyter`,
                   {shell: '/bin/bash', timeout: 2000}).slice(0, -1).toString();
  } catch (error) {
    return [null, error.message];
  }
  let args = JUPYTERLAB_CMD.split(' ').splice(1).join(' ');
  return [cmd + ' ' + args, null];
}

function restartServer(window, cmd) {
  settings.updateWindowSettings(window.resource, {cmd: cmd});
  if (window.server) {
    window.server.removeAllListeners('exit');
    window.server.kill();
    window.server = null;
  }
  startServer(window);
}

module.exports = { openNotebook, openDialog, startServer, openServerPane, condaJupyter,
                   restartServer };
