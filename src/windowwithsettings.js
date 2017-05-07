/* Copyright 2015-2017 Robert Schroll
 *
 * This file is part of Juno and is distributed under the terms of the
 * BSD license. See the file LICENSE for full details.
 */
'use strict';
const settings = require('./settings.js');
const windows = require('./windows.js');

module.exports = (resource, extraSettings) => {
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
