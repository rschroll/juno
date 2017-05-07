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
const { app, BrowserWindow, Menu, ipcMain } = require('electron');

const { openConnectDialog, onCertificateError } = require('./src/connectdialog.js');
const { openNotebook, openDialog, openServerPane, restartServer } = require('./src/notebook.js');

/***** Application event handlers *****/
// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform != 'darwin') {
    app.quit();
  }
});

app.on('certificate-error', onCertificateError);

ipcMain.on('open-host', (event, arg) => openNotebook(arg) );

ipcMain.on('open-dialog', (event) => openDialog(BrowserWindow.fromWebContents(event.sender)) );

ipcMain.on('restart', (event, cmd) => restartServer(event.sender.browserWindowOptions.parent, cmd) );

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
        },
        {
          label: "Server Settings",
          enabled: false,
          click: (item, focusedWindow) => openServerPane(focusedWindow)
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

app.on('browser-window-focus', (event, window) => {
  let menu = Menu.getApplicationMenu();
  menu.items[0].submenu.items[2].enabled = window.localServer;
});
