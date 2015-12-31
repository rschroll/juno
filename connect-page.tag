<connect-page if={ shown }>
  <div class="body">
    <h1>Recent Notebooks</h1>
    <ul id="hosts">
      <li each={ hosts }><a href={ host } onclick={ parent.onClick }>{ riot.formatPath(host) }</a></li>
    </ul>
    <h2>Open local notebook</h2>
    <form>
      <input type="button" value="Open Directory" onclick={ onDirectory } />
    </form>
    <h2>Connect to server</h2>
    <form id="host-form" onsubmit={ onHostSubmit }>
      <input type="url" id="host-input" placeholder="http://localhost:8888" required />
      <input type="submit" value="Connect" />
    </form>
  </div>


  <script>
    'use strict';
    var self = this;
    
    self.shown = false;
    self.hosts = [];
    
    function connect(host) {
      require("electron").ipcRenderer.send('open-host', host);
    }
    
    onClick(event) {
      connect(event.item.host);
    }
    
    onHostSubmit(event) {
      connect(document.querySelector("#host-input").value);
    }
    
    onDirectory(event) {
      require("electron").ipcRenderer.send('open-dialog');
    }
    
    open() {
      let hostlist = [];
      try {
        hostlist = JSON.parse(localStorage.recentHosts);
      } catch (e) {
        // pass
      }
      let hosts = [];
      for (let i in hostlist)
        hosts.push({"host": hostlist[i]});
      
      self.update({"hosts": hosts, "shown": true});
    }
    
    close() {
      self.update({"shown": false});
    }
  </script>
  
  <style scoped>
    :scope {
      position: fixed;
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      background-color: rgba(0,0,0,0.75);
      display: flex;
      justify-content: space-around;
      align-items: center;
    }
    
    .body {
      padding: 1em;
      background-color: #eee;
      border-radius: 0.75em;
    }
    
    h1 {
      font-size: 1.44em;
      margin-top: 0;
    }
    h2 {
      font-size: 1.2em;
      margin-bottom: 0;
    }
    
    ul {
      padding-left: 0;
      list-style: none;
    }
    li {
      margin: 0.4em 0;
    }
    a {
      text-decoration: none;
      color: black;
    }
    a:hover {
      text-decoration: underline;
    }
    
    form:invalid input[type=submit]{
      color: #999;
    }
  </style>
</connect-page>
