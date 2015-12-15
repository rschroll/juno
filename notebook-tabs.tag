/* Copyright 2014-2015 Robert Schroll
 *
 * This file is part of Crosswords and is distributed under the terms
 * of the GPL. See the file LICENSE for full details.
 */
<notebook-tabs>
  <ul name="headers"></ul>
  <div name="webviews"></div>
  
  <script>
    // We can't use riot's rebuilding of the DOM, since that reloads the webviews.  Instead,
    // we do everything by hand.  There's not much point to actually using riot here....
    'use strict';
    var self = this;
    
    // List of objects.  Each contains "webview" (a webview), "header" (a li)
    self.notebooks = [];
    
    function urlsAreEquivalent(first, second) {
      return first.split("#")[0] == second.split("#")[0];
    }
    
    function focusNotebook(nb) {
      nb.webview.classList.add("focused");
      nb.header.classList.add("focused");
    }
    
    function unfocusNotebook(nb) {
      nb.webview.classList.remove("focused");
      nb.header.classList.remove("focused");
    }
    
    function setStatus(icon, busy) {
      if (busy)
        icon.classList.add("busy");
      else
        icon.classList.remove("busy");
    }
    
    function createNotebook(url) {
      let webview = document.createElement("webview");
      webview.src = url;
      self.webviews.appendChild(webview);
      
      let header = document.createElement("li");
      let icon = document.createElement("img");
      icon.src = "http://localhost:8888/kernelspecs/python2/logo-64x64.png";
      header.appendChild(icon);
      let title = document.createElement("span");
      header.appendChild(title);
      let close = document.createElement("i");
      close.classList.add("typcn");
      close.classList.add("typcn-times");
      header.appendChild(close);
      self.headers.appendChild(header);
      
      webview.addEventListener("page-title-updated", function (event) {
        let t = event.title;
        let re = /\(([^\)]*)\) (.*)/;
        let match = t.match(re);
        let busy = false;
        let starting = false;
        while (match) {
          if (match[1] == "Busy")
            busy = true;
          else if (match[1] == "Starting")
            starting = true;
          t = match[2];
          match = t.match(re);
        }
        setStatus(icon, busy);
        title.innerHTML = t;
      });
      header.addEventListener("click", function (event) {
        self.openNotebook(webview.src);
      });
      close.addEventListener("click", function (event) {
        self.closeNotebook(nb);
        event.stopPropagation();
      });

      let nb = {"webview": webview, "header": header};
      focusNotebook(nb);
      self.notebooks.push(nb);
    }
    
    openNotebook(url) {
      let found = false;
      for (let i in self.notebooks) {
        let nb = self.notebooks[i];
        if (urlsAreEquivalent(url, nb.webview.src)) {
          focusNotebook(nb);
          found = true;
        } else {
          unfocusNotebook(nb);
        }
      }
      if (!found)
        createNotebook(url)
    }
    
    closeNotebook(nb) {
      let i = self.notebooks.indexOf(nb);
      self.notebooks.splice(i, 1);
      self.headers.removeChild(nb.header);
      self.webviews.removeChild(nb.webview);
      if (nb.header.classList.contains("focused")) {
        if (i > 0)
          i -= 1;
        if (self.notebooks.length > 0)
          self.openNotebook(self.notebooks[i].webview.src);
      }
    }
  </script>
  
  <style scoped>
    :scope {
      position: fixed;
      left: 200px;
      right: 0;
      top: 0;
      bottom: 0;
    }
    
    ul {
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      height: 2em;
      margin: 0;
      padding-left: 0;
      padding-top: 0.5em;
      overflow: visible;
      background-color: #ddd;
      border-bottom: thin solid #aaa;
      box-sizing: border-box;
    }
    li {
      display: inline-block;
      height: 1.5em;
      line-height: 1.5em;
      padding: 0 0.5em;
      background-color: #eee;
      border: thin solid #aaa;
      border-radius: 0.5em 0.5em 0 0;
      box-sizing: border-box;
      cursor: default;
    }
    li.focused {
      background-color: #fff;
      border-bottom: none;
    }
    
    li img {
      height: 1em;
      vertical-align: text-bottom;
    }
    li img.busy {
      -webkit-animation: pulse 1s infinite;
    }
    @-webkit-keyframes pulse {
      0%, 100% {
        -webkit-filter: grayscale(100%);
      }
      50% {
        -webkit-filter: grayscale(0%);
      }
    }
    li span {
      margin: 0 0.5em;
    }
    li i {
      border: thin solid rgba(0,0,0,0);
      border-radius: 0.2em;
    }
    li i:hover {
      border: thin solid #ccc;
    }
    
    div {
      position: absolute;
      left: 0;
      right: 0;
      top: 2em;
      bottom: 0;
    }
    webview {
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      display: none;
    }
    webview.focused {
      display: block;
    }
  </style>
</notebook-tabs>
