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
  
  <div>
    <span class="typcn typcn-document-text" title="New Notebook" onclick={ onNewNotebook }></span>
    <span class="typcn typcn-document" title="New Text File" onclick={ onNewFile }></span>
    <span class="typcn typcn-folder" title="New Directory" onclick={ onNewDirectory }></span>
    <span class="typcn typcn-refresh" title="Refresh" onclick={ onRefresh }></span>
  </div>
  
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
        let mechanism = event.item.type + "s/";
        if (event.item.type == "file" &&
            (!event.item.mimetype || event.item.mimetype.slice(0,4) == "text"))
            // Unknown mimetypes are edited. This logic from the notebook.
          mechanism = "edit/";
        riot.openUrl(self.host + mechanism + event.item.path);
      }
    }
    
    onSelect(event) {
      self.loadFiles(self.levels[event.target.selectedIndex]["path"]);
    }
    
    onRefresh(event) {
      self.loadFiles(self.dir);
    }
    
    onNewNotebook(event) {
      self.newFile("notebook", self.dir);
    }
    
    onNewFile(event) {
      self.newFile("file", self.dir);
    }
    
    onNewDirectory(event) {
      self.newFile("directory", self.dir);
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
    
    newFile(type, directory, kernel_name) {
      let xhr = new XMLHttpRequest();
      let body = {"type": type};
      if (type == "file")
        body["ext"] = ".txt";
      let bodyString = JSON.stringify(body);
      
      xhr.open("POST", self.host + "api/contents/" + directory);
      xhr.setRequestHeader("Content-type", "application/json; charset=UTF-8");
      xhr.responseType = "json";
      xhr.addEventListener("load", function (event) {
        if (xhr.status != 201 || !xhr.response) {
          console.log("Problem creating a new file: Error code " + xhr.status + " (" + xhr.statusText +
                      ") received.\nNote that you must set 'NotebookApp.allow_origin' to 'file://' " +
                      "or '*' in order for file creation to work.");
          return;
        }
        
        if (type == "directory") {
          self.loadFiles(xhr.response.path);
        } else {
          let mechanism = (type == "noteboook") ? "notebooks/" : "edit/";
          let newUrl = self.host + mechanism + xhr.response.path;
          if (kernel_name !== undefined)
            newUrl += "?kernel_name=" + kernel_name;
          riot.openUrl(newUrl);
          
          if (directory == self.dir)
            self.loadFiles(self.dir);
        }
      });
      xhr.send(bodyString);
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
      bottom: 2em;
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
    
    div {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 2em;
      background-color: #ddd;
    }
    div span {
      border: thin solid #aaa;
      background-color: #eee;
      font-size: 1.33em;
      line-height: 1.2; /* Default, but just to be safe */
      border-radius: 0.2em;
      padding: 0.1em;
      margin: 0.05em;
      float: left;
    }
    div span:hover {
      background-color: #f8f8f8;
    }
    div span:active::before {
      transform: translate(1px, 1px);
    }
    div span:first-child {
      margin-left: 0.1em;
    }
    div span:last-child {
      float: right;
      margin-right: 0.1em;
    }
  </style>
</file-list>
