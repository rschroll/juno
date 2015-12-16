/* Copyright 2014-2015 Robert Schroll
 *
 * This file is part of Crosswords and is distributed under the terms
 * of the GPL. See the file LICENSE for full details.
 */
<file-list>
  <select onchange={ onSelect }>
    <option each={ levels } selected={ path == dir }>/{ path }</option>
  </select>
  
  <ul class={ hideDirectories: hideDirectories, hideNotebooks: hideNotebooks, hideFiles: hideFiles }>
    <li each={ files } class={ parent.liClass(type, path) } onclick={ parent.onClick }>
      { name }
    </li>
  </ul>
  
  <script>
    'use strict';
    var self = this;
    
    self.files = [];
    self.levels = [{path: ""}];
    self.dir = "";
    self.host = undefined;
    self.hideDirectories = self.hideNotebooks = self.hideFiles = false;
    
    onClick(event) {
      if (event.item.type == "directory") {
        self.loadFiles(event.item.path);
      } else if (event.item.type == "header") {
        let attr = "hide" + event.item.name;
        self[attr] = !self[attr];
      } else {
        riot.openUrl(self.host + event.item.type + "s/" + event.item.path);
      }
    }
    
    onSelect(event) {
      self.loadFiles(self.levels[event.target.selectedIndex]["path"]);
    }
    
    loadFiles(dir, host) {
      if (host !== undefined) {
        self.host = host;
        if (self.host.slice(-1) != "/")
          self.host += "/";
      }
      if (self.host === undefined)
        throw "Host not set."
      
      let xhr = new XMLHttpRequest();
      xhr.open("GET", self.host + "api/contents/" + dir + "?type=directory&_=" + Date.now());
      xhr.responseType = "json";
      xhr.addEventListener("load", function (event) {
        if (xhr.responseType !== "json") {
          console.log("Unexpected response: " + xhr.responseType);
        } else {
          if (xhr.responseURL.slice(self.host.length, self.host.length + 5) == "login") {
            riot.login(xhr.responseURL, function () { self.loadFiles(dir, host); });
            return;
          }
          
          let files = xhr.response["content"];
          let currentType = "";
          let display = {"directory": "Directories", "notebook": "Notebooks", "file": "Files"};
          if (dir) {
            let parent = dir.split("/").slice(0, -1).join("/");
            files.splice(0, 0, {"name": "..", "path": parent, "type": "directory"});
          }
          // Loop needs to be explicit since files will grow in length during it
          for (let i=0; i<files.length; i++) {
            let type = files[i]["type"];
            if (type !== currentType) {
              files.splice(i, 0, {"name": display[type], "path": type, "type": "header"})
              currentType = type;
            }
          }
          
          let levels = self.levels;
          if (self.levels[self.levels.length - 1]["path"].slice(0, dir.length) != dir) {
            // We're not longer in one of the levels, so re-configure the combo box
            let components = dir.split("/");
            let pathText = "";
            levels = [{"path": ""}];
            if (dir) {
              for (let i in components) {
                levels.push({"path": components.slice(0, i+1).join("/")});
              }
            }
          }
          
          self.update({"files": files, "levels": levels, "dir": dir});
        }
      });
      xhr.send()
    }
    
    liClass(type, path) {
      if (type == "directory")
        return type + " typcn typcn-folder";
      if (type == "notebook")
        return type + " typcn typcn-document-text";
      if (type == "file")
        return type + " typcn typcn-document";
      if (type == "header")
        return type + " header-" + path + " typcn typcn-chevron-right-outline";
      return type;
    }
  </script>
  
  <style scoped>
    :scope {
      position: fixed;
      left: 0;
      width: 200px;
      top: 0;
      bottom: 0;
    }
    
    select {
      position: absolute;
      left: 0;
      width: 100%;
      top: 0;
      height: 2em;
    }
    
    ul {
      position: absolute;
      left: 0;
      right: 0;
      top: 2em;
      bottom: 0;
      overflow: auto;
      margin: 0;
      padding: 0;
      list-style-type: none;
    }
    
    li {
      padding: 0.2em 0.5em 0.2em 1.5em;
      cursor: pointer;
      white-space: nowrap;
    }
    li.header {
      background-color: #eee;
      padding-left: 0.5em;
      cursor: default;
    }
    li.header:before{
      transform: rotate(90deg);
    }
    
    .hideDirectories .directory,
    .hideNotebooks .notebook,
    .hideFiles .file {
      display: none;
    }
    .hideDirectories .header-directory:before,
    .hideNotebooks .header-notebook:before,
    .hideFiles .header-file:before {
      transform: rotate(0deg);
    }
  </style>
</file-list>
