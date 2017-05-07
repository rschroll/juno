/* Copyright 2015-2017 Robert Schroll
 *
 * This file is part of Juno and is distributed under the terms of the
 * BSD license. See the file LICENSE for full details.
 */
'use strict';
const { dialog, BrowserWindow } = require('electron');

const { WEB_DIR } = require('./constants.js');
const settings = require('./settings.js');
const windows = require('./windows.js');
const windowWithSettings = require('./windowwithsettings.js');

function openConnectDialog() {
  if (windows.focusWindow('open-dialog'))
    return true;

  let window = windowWithSettings('open-dialog');
  window.resource = 'open-dialog';
  window.loadURL(`file://${WEB_DIR}/connect.html`);

  let webContents = window.webContents;
  webContents.once('did-finish-load', () => webContents.send('set-sources', settings.sources) );

  return true;
}

function closeConnectDialog() {
  windows.closeWindow('open-dialog');
}

function onCertificateError(event, webContents, url, error, certificate, callback) {
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
}

module.exports = { openConnectDialog, closeConnectDialog, onCertificateError };
