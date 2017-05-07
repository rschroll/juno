/* Copyright 2015-2017 Robert Schroll
 *
 * This file is part of Juno and is distributed under the terms of the
 * BSD license. See the file LICENSE for full details.
 */
'use strict';
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

const { JUPYTERLAB_CMD } = require('./constants.js');

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
      cmd: saved.cmd || JUPYTERLAB_CMD,
    }
  },

  updateWindowSettings(source, newSettings) {
    if (newSettings['cmd'] == JUPYTERLAB_CMD)
      // Don't store the default, so we can update the default in a new version
      newSettings['cmd'] = "";
    if (!this.windows[source])
      this.windows[source] = {};
    Object.assign(this.windows[source], newSettings);
    this.save();
  },
};
settings.load();

module.exports = settings;
