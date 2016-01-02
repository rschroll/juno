Juno
====

Juno gives [Jupyter (formerly IPython) notebooks][1] a window of their
own on your desktop.  It can launch and connect to a Jupyter notebook
server for a directory on your machine, or it can connect to an
already-running server, local or remote.

[1]: http://jupyter.org/

Building
--------
Juno is in early development, so the only way to get it is to clone this
repository and build it yourself.  To do this, you'll need [Git][2] and
[Node.js][3] installed on your computer. From the command line,
```bash
# Clone this repository
$ git clone https://github.com/rschroll/juno
# Enter the newly-created directory
$ cd juno
# Install dependencies
$ npm install
```
This last step may take a few minutes as Node downloads and configures
the dependencies Juno needs.

[2]: https://git-scm.com/
[3]: https://nodejs.org/en/download/

Running
-------
From the `juno` directory, run
```bash
$ npm start
```
This causes a bit of Javascript to be compiled and then launches the
application.  Juno will then ask for a directory to start a Jupyter
server in or the host and port of an already-running server.  You can
skip this step by passing this as an argument:
```bash
$ npm start ~/notebooks
$ npm start http://localhost:8888
```

Bugs
----
Juno is new and largely untested, so there are surely plenty of bugs and
unimplemented features.  Whenever you encounter one, please [report
it][4].  Since Juno is only acting as a window to the Jupyter server, it
shouldn't be capable of causing any data loss.  You should probably be
aware of these issues:

- Closing the a notebook's tab will stop the kernel associated with that
notebook.  This is *probably* what you want to happen, but it may
surprise you when connecting to an running server with notebooks open in
a web browser.  If you close the whole window, however, the kernels will
not be stopped.  This is another bug, but it may be useful for now.

- If you wish to use Juno's "New (Notebook|File|Directory)" features,
you must configure your server to allow connections from "file://".  In
your `~/.jupyter/jupyter_notebook_config.py` file, add the lines
```python
c = get_config()
c.NotebookApp.allow_origin = 'file://'
```
This may have security implications for public-facing servers.

[4]: https://github.com/rschroll/juno/issues


License
-------
Juno is copyright Robert Schroll and released under the BSD license.
See the file LICENSE for details.

Font Awesome is copyright Dave Gandy and released under the SIL OFP 1.1
and MIT licenses.  See http://fontawesome.io/license/ for details.

Riot is copyright Muut Inc. and others and released under the MIT
license.
