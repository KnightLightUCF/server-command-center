const { shell } = require('electron');

document.getElementById('settings-gear').addEventListener('click', () => {
    document.getElementById('settings-modal').style.display = 'block';
});

document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('settings-modal').style.display = 'none';
});

// Clicking outside the modal closes it
window.onclick = function(event) {
    if (event.target == document.getElementById('settings-modal')) {
        document.getElementById('settings-modal').style.display = 'none';
    }
};

document.getElementById('port-server').addEventListener('change', function() {
    let serverPort = document.getElementById('port-server').value;
    let livePort = document.getElementById('port-live').value;

    // Save settings to a JSON file
    let settings = { serverPort, livePort };
    let settingsFilePath = path.join(__dirname, 'settings.json');
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings), 'utf-8');

    // Update port checks
    startStatusUpdateLoop(serverPort, 'server-status', livePort, 'live-status');
});

document.getElementById('port-live').addEventListener('change', function() {
    let serverPort = document.getElementById('port-server').value;
    let livePort = document.getElementById('port-live').value;

    // Save settings to a JSON file
    let settings = { serverPort, livePort };
    let settingsFilePath = path.join(__dirname, 'settings.json');
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings), 'utf-8');

    // Update port checks
    startStatusUpdateLoop(serverPort, 'server-status', livePort, 'live-status');
});

const settingsPath = path.join(__dirname, 'settings.json');

function getPortFromSettings(portName, callback) {
    fs.readFile(settingsPath, (err, data) => {
        if (err) {
            console.log(err);
            return;
        }

        try {
            let settings = JSON.parse(data);
            let returnData = settings[portName];
            console.log(returnData)
            callback(returnData);
        } catch (error) {
            // console.log(error);
        }
    });
}

document.getElementById('serverLink').addEventListener('click', (e) => {
    e.preventDefault(); // Prevent the default navigation within app
    getPortFromSettings("serverPort", (port) => {
        shell.openExternal(`http://localhost:${port}`);
    });
});

document.getElementById('liveLink').addEventListener('click', (e) => {
    e.preventDefault(); // Prevent the default navigation within the app
    getPortFromSettings("livePort", (port) => {
        shell.openExternal(`http://localhost:${port}`);
    });
});

ipcRenderer.send('get-app-version');
ipcRenderer.on('app-version', (event, version) => {
  document.getElementById('appVersion').innerText = version;
});