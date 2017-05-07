/* Copyright 2015-2017 Robert Schroll
 *
 * This file is part of Juno and is distributed under the terms of the
 * BSD license. See the file LICENSE for full details.
 */
'use strict';
const { BrowserWindow } = require('electron');

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

module.exports = windows;
