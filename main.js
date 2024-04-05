const { app, BrowserWindow, dialog} = require('electron');
const psTree = require('ps-tree');
const kill = require('tree-kill');

const fs = require('fs');
const fetch = require('node-fetch');
const os = require('os');
const path = require('path');
const AdmZip = require('adm-zip');
const { promisify } = require('util');

const renameAsync = promisify(fs.rename);
const readdirAsync = promisify(fs.readdir);
const statAsync = promisify(fs.stat);



// Get PID of the current process
const parentPid = process.pid;


function checkVersion() {
  // Read local package.json file to get the app version
  const localPackageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  const localVersion = localPackageJson.version;

  console.log(localVersion);

  const url = `https://raw.githubusercontent.com/KnightLightUCF/server-command-center/main/package.json`;

  fetch(url)
      .then(response => {
          if (!response.ok) {
              throw new Error(`Failed to fetch package.json from GitHub: ${response.statusText}`);
          }
          return response.json();
      })
      .then(data => {
          const githubVersion = data.version;
          console.log(`Local Version: ${localVersion}`);
          console.log(`GitHub Version: ${githubVersion}`);

          // Compare versions
          if (localVersion !== githubVersion) {
              console.log('Versions do not match!');
              updateRequired = true;

              // Show modal to inform the user about the version mismatch
              dialog.showMessageBox({
                  type: 'info',
                  title: 'Version Mismatch',
                  message: 'The version of the application is out of sync with the latest version on GitHub.',
                  buttons: ['Continue', 'Download Latest']
              }).then(({ response }) => {
                  if (response === 1) {
                      // Download latest version
                      downloadLatestVersion();
                  }
              });
          } else {
              console.log('Versions match!');
          }
      })
      .catch(error => {
          console.error('Error fetching package.json from GitHub:', error);
      });

  function downloadLatestVersion() {
      const zipUrl = `https://github.com/KnightLightUCF/server-command-center/archive/main.zip`;
      const tempDir = fs.mkdtempSync(path.join(app.getPath('temp'), 'app-update-')); // Create temporary directory in system's temp directory
      const zipPath = path.join(tempDir, 'latest.zip');
      console.log(tempDir)

      fetch(zipUrl)
          .then(response => {
              if (!response.ok) {
                  throw new Error(`Failed to fetch latest code from GitHub: ${response.statusText}`);
              }
              return response.buffer();
          })
          .then(buffer => {
              fs.writeFileSync(zipPath, buffer);

              // Extract the zip file
              const zip = new AdmZip(zipPath);
              zip.extractAllTo(tempDir, true);

              console.log('Latest version downloaded and extracted successfully!');

              // Cleanup: Delete the downloaded zip file
              replaceFiles(tempDir + '/server-command-center-main', __dirname);

              fs.unlinkSync(zipPath);
              // Close the Electron app
              app.quit();
              // Replace the application files with the latest version
              // console.log(path.)
              console.log(path.basename(__dirname))
              // replaceFiles(tempDir + '/server-command-center-main', __dirname);

              // Relaunch the Electron app
              app.relaunch();
              app.exit();

          })
          .catch(error => {
              console.error('Error downloading latest code from GitHub:', error);
          });
  };
  async function replaceFiles(tempDir, appDir) {
      try {
          console.log("App Dir: " + appDir)
          // Get the list of files from the temporary directory
          const tempFiles = await readdirAsync(tempDir);
          // console.log(tempDir)
          console.log(tempFiles)
          // console.log(appDir)

          const filesToReplace = tempFiles.filter(file => file !== '.DS_Store');

          // Loop through each file in the temporary directory
          for (const file of filesToReplace) {
              const tempFilePath = path.join(tempDir, file);
              const appFilePath = path.join(appDir, file);
              console.log("File " + file + " Path: " + appFilePath)

              // Check if the file is a directory or a file
              const stats = await statAsync(tempFilePath);
              if (stats.isDirectory()) {
                  // If the file is a directory, recursively call replaceFiles
                  await replaceFiles(tempFilePath, appFilePath);
              } else {
                  // If the file is a file, replace it
                  await renameAsync(tempFilePath, appFilePath);
                  console.log("Replaced file successfully")
              }
          }
      } catch (error) {
          console.error('Error replacing files:', error);
      }
  };
}

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
  checkVersion();
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