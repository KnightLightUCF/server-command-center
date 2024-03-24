const { app, BrowserWindow } = require('electron');
const psTree = require('ps-tree');
const kill = require('tree-kill');

// Get PID of the current process
const parentPid = process.pid;

// Get all child processes of the current process
function getChildProcesses(parentPid, callback) {
  psTree(parentPid, (err, children) => {
      if (err) {
          callback(err, null);
      } else {
          callback(null, children);
      }
  });
}

function createWindow() {
  // Create the browser window.
  let win = new BrowserWindow ({
    width: 1000,
    height: 650,
    minWidth: 1000,
    minHeight: 650,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      //   devTools: true,
    },
  });

  // Load index.html
  win.loadFile('index.html');

  win.on('close', (event) => {
    // Prevent the window from closing immediately
    event.preventDefault();

    // Function to terminate child processes and perform cleanup
    function cleanupAndClose() {
      getChildProcesses(parentPid, (err, children) => {
        if (err) {
          // Destroy the window if there's an error
          win.destroy();
        } else {

          let childProcesses = children.filter(child => child.COMMAND === 'python.exe');

          if (process.platform === 'darwin') {
            childProcesses = children
          }

          let killPromises = childProcesses.map(process => {
            return new Promise((resolve, reject) => {
              kill(process.PID, 'SIGTERM', (error) => {
                if (error) {
                  reject(error);
                } else {
                  resolve();
                }
              });
            });
          });

          // Wait for all promises to resolve
          Promise.all(killPromises).then(() => {
            // Destroy the window
            win.destroy();
          }).catch(error => {
            // Destroy the window
            win.destroy();
          });
        }
      });
    }

    // Call the cleanup function
    cleanupAndClose();
  });

  // win.openDevTools();
}

app.whenReady().then(createWindow);