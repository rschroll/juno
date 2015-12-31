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
      return first.split(/[\?#]/)[0] == second.split(/[\?#]/)[0];
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
    
    var SAVE_STATUS = "X-Save-Status: ";
    var CHECKPOINT = "X-Checkpoint: "
    var NEW_NOTEBOOK = "X-New-Notebook: ";
    var KERNEL_LOGO = "X-Kernel-Logo: ";
    var CLOSE = "X-Close";
    var CLIENT_JS_NOTEBOOK = `
      (function () {
        var old_setter = IPython.save_widget.set_save_status;
        IPython.save_widget.set_save_status = function (msg) {
            console.log('${SAVE_STATUS}' + msg);
            return old_setter.apply(this, arguments);
        }
        
        function report_checkpoint() {
            var text = document.querySelector('.checkpoint_status').textContent;
            console.log('${CHECKPOINT}' + text);
        }
        
        var old_checkpoint = IPython.save_widget._render_checkpoint;
        IPython.save_widget._render_checkpoint = function (checkpoint) {
            var retval = old_checkpoint.apply(this, arguments);
            report_checkpoint();
            return retval;
        }
        report_checkpoint();
        
        // For some reason, have to override prototype here.  Also, it looks like
        // we'll have to implement the new notebook creation, since it involves
        // cross-window javascript.
        var KernelSelector = require("notebook/js/kernelselector").KernelSelector;
        KernelSelector.prototype.new_notebook = function (name) {
          var dir = IPython.utils.url_path_split(IPython.notebook.notebook_path)[0];
          console.log('${NEW_NOTEBOOK}' + name + " " + dir);
        }
        
        console.log('${KERNEL_LOGO}' + document.querySelector(".current_kernel_logo").src);
        
        document.querySelector('#toggle_header').click();
      })();
    `
    var CLIENT_JS_EDIT = `
      (function () {
        function report_modified() {
          var text = document.querySelector('.last_modified').textContent;
          console.log('${CHECKPOINT}' + text);
        }
        
        var SaveWidget = require("edit/js/savewidget").SaveWidget;
        var old_render = SaveWidget.prototype._render_last_modified;
        SaveWidget.prototype._render_last_modified = function () {
          var retval = old_render.apply(this, arguments);
          report_modified();
          return retval;
        }
        report_modified();
      })();
    `
    
    function createNotebook(url) {
      let mode = url.split("/")[3];
      let webview = document.createElement("webview");
      webview.src = url;
      self.webviews.appendChild(webview);
      
      let header = document.createElement("li");
      let icon = document.createElement("img");
      header.appendChild(icon);
      let title = document.createElement("span");
      header.appendChild(title);
      let close = document.createElement("i");
      close.classList.add("fa");
      close.classList.add("fa-times");
      header.appendChild(close);
      self.headers.appendChild(header);
      
      let startStatus = 0;  // 1 when "Starting", 2 afterwards
      
      webview.addEventListener("page-title-updated", (mode == "notebooks")
        ? function (event) {
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
          if (starting) {
            startStatus = 1;
          } else if (startStatus == 1) {
            startStatus = 2;
            webview.executeJavaScript(CLIENT_JS_NOTEBOOK);
          }
          title.innerHTML = t;
        }
        : function (event) {
          let t = event.title;
          if (t[0] == "*") {
            header.classList.add("unsaved");
            t = t.slice(1);
          } else {
            header.classList.remove("unsaved");
          }
          title.innerHTML = t;
          
          if (startStatus == 0) {
            startStatus = 1;
          } else if (startStatus == 1) {
            startStatus = 2;
            webview.executeJavaScript(CLIENT_JS_EDIT);
          }
        }
      );
      webview.addEventListener("console-message", function (event) {
        let msg = event.message;
        if (msg.slice(0, SAVE_STATUS.length) == SAVE_STATUS) {
          if (msg.slice(SAVE_STATUS.length) == "(unsaved changes)")
            header.classList.add("unsaved");
          else
            header.classList.remove("unsaved");
        } else if (msg.slice(0, CHECKPOINT.length) == CHECKPOINT) {
          header.title = msg.slice(CHECKPOINT.length);
        } else if (msg.slice(0, NEW_NOTEBOOK.length) == NEW_NOTEBOOK) {
          let args = msg.slice(NEW_NOTEBOOK.length).split(" ");
          riot.newFile("notebook", args[1], args[0]);
        } else if (msg.slice(0, KERNEL_LOGO.length) == KERNEL_LOGO) {
          icon.src = msg.slice(KERNEL_LOGO.length);
        } else if (msg == CLOSE) {
          self.closeNotebook(nb);
        }
      });
      webview.addEventListener("close", function (event) {
        self.closeNotebook(nb);
      });
      webview.addEventListener("new-window", function (event) {
        riot.openUrl(event.url);
      });
      header.addEventListener("click", function (event) {
        self.openNotebook(webview.src);
      });
      close.addEventListener("click", function (event) {
        if (!header.classList.contains("unsaved") ||
            window.confirm("Notebook contains unsaved changes.\n\nClose anyway?")) {
          if (mode == "notebooks") {
            webview.executeJavaScript(`
              function signalClose() {
                console.log('${CLOSE}');
              }
              IPython.notebook.session.delete(signalClose, signalClose)
            `);
          } else {
            self.closeNotebook(nb);
          }
        }
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
        createNotebook(url);
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
    
    closeAll() {
      let modifiedCount = 0;
      for (let i in self.notebooks)
        if (self.notebooks[i].header.classList.contains("unsaved"))
          modifiedCount += 1;
      
      let modifiedText = (modifiedCount == 1) ? "A notebook has" : modifiedCount + " notebooks have";
      if (modifiedCount == 0 ||
          window.confirm(modifiedText + " unsaved changes.\n\nClose anyway?")) {
        return true;
      }
      return false;
    }
    
    toggleDevTools() {
      let webview = self.webviews.querySelector("webview.focused");
      if (webview) {
        if (webview.isDevToolsOpened())
          webview.closeDevTools();
        else
          webview.openDevTools();
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
    li.unsaved span {
      color: red;
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
