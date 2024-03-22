const { app, BrowserWindow } = require('electron');

function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
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

  // Load the index.html of the app.
  win.loadFile('index.html');
//   win.openDevTools();
}

app.whenReady().then(createWindow);

