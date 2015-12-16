/* Copyright 2014-2015 Robert Schroll
 *
 * This file is part of Crosswords and is distributed under the terms
 * of the GPL. See the file LICENSE for full details.
 */
<login-view>
  <webview src={ url } if={ shown } name="webview"></webview>
  
  <script>
    'use strict';
    var self = this;
    
    self.url = "";
    self.shown = false;
    self.callback = null;
    
    self.webview.addEventListener("load-commit", function (event) {
      if (event.url != self.url) {
        self.update({"shown": false});
        self.callback();
      }
    });
    
    login(url, callback) {
      self.update({"url": url, "callback": callback, "shown": true});
    }
  </script>
  
  <style scoped>
    webview {
      position: fixed;
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
    }
  </style>
</login-view>
