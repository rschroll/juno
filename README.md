Juno
====

Juno gives [JupyterLab][1] a window of its
own on your desktop.  It can launch and connect to a JupyterLab
server for a directory on your machine, or it can connect to an
already-running server, local or remote.

[1]: https://github.com/jupyterlab/jupyterlab

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
Juno will then ask for a directory to start a JupyterLab
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
it][4].  Since Juno is only acting as a window to the JupyterLab server, it
shouldn't be capable of causing any data loss.

[4]: https://github.com/rschroll/juno/issues

Legacy Version
--------------
A prior version of Juno worked with the standard [Jupyter notebook][5] server.
It is still available in the [legacy][6] branch, although development has ended.
JupyterLab provides many of the UI features the old branch attempted to
implement, and does it better.

[5]: http://jupyter.org/
[6]: https://github.com/rschroll/juno/tree/legacy

License
-------
Juno is copyright Robert Schroll and released under the BSD license.
See the file LICENSE for details.
