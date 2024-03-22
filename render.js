const { spawn } = require('child_process');
const path = require('path');
const kill = require('tree-kill');
const { Terminal } = require('@xterm/xterm');
const net = require('net');
const os = require('os');
const fs = require('fs');
const { ipcRenderer } = require('electron');


let terminal = new Terminal({
    rendererType: 'dom',
    convertEol: true, // Make sure that all line ends are converted to line feeds
    windowsMode: os.platform() === 'win32', // Set based on the platform
    wordWrap: true, // Enable word wrapping
    cols: 100, // Set the width of the terminal (number of characters per line)
});

terminal.open(document.getElementById('terminal-container'));

let startFilePath;

// Detect the os
const platform = os.platform();

if (platform === 'win32') { // Windows
    startFilePath = path.join(__dirname, 'server', 'windows', 'windows_setup.py');
} else if (platform === 'darwin') { // macOS
    startFilePath = path.join(__dirname, 'server', 'mac', 'mac_setup.py');
} else {
    logTerminalData('Unsupported platform');
}

process.chdir(path.dirname(startFilePath));

let child;

function startPythonProcess(startFilePath) {
    const commands = ['python', 'python3'];
    let commandFound = false;

    commands.forEach((command) => {
        if (!commandFound) {
            try {
                // Try to spawn the Python process
                child = spawn(command, [startFilePath], { windowsHide: os.platform() === 'win32' });

                // If the 'error' event is not triggered, command is found
                child.on('error', (err) => {
                    if (err.code === 'ENOENT') {
                        logTerminalData(`${command} not found, trying next option...`);
                    } else {
                        logTerminalData(`Error starting Python process: ${err}`);
                    }
                });

                child.stdout.on('data', (data) => {
                    logTerminalData(data.toString());
                });

                child.stderr.on('data', (data) => {
                    logTerminalData(data.toString());
                });

                child.on('close', (code) => {
                    logTerminalData(`Process exited with code ${code}\r\n`);
                });

                commandFound = true;
            } catch (error) {
                logTerminalData(`Error trying to execute ${command}: ${error}`);
            }
        }
    });

    if (!commandFound) {
        logTerminalData("Failed to find a valid Python command ('python' or 'python3').\r\n");
    }
}

document.getElementById('start').addEventListener('click', function () {
    startPythonProcess(startFilePath);
});

document.getElementById('stop').addEventListener('click', function () {
    if (child) {
        kill(child.pid, 'SIGTERM', function (err) {
            if (err) {
                logTerminalData('Error stopping the server.\r\n');
            } else {
                logTerminalData('Server stopped successfully.\r\n');
            }
        });
    }
});

document.getElementById('restart').addEventListener('click', function () {
    terminal.write('Server restarting...\r\n');

    if (child) {
        kill(child.pid, 'SIGTERM', function (err) {
            if (err) {
                terminal.write('Error stopping the server.\r\n');
            } else {
                terminal.write('Server stopped successfully.\r\n');

                setTimeout(() => {
                    startPythonProcess(startFilePath);
                }, 1000);
            }
        });
    }
});


let logContent = '';

function stripAnsiCodes(str) {

    const ansiEscapeCodesPattern = new RegExp([
        '(\\u001B\\u005B[\\d;]*m)', // Match ANSI color codes
        '(\\u001B\\u005B\\d*G)', // Match cursor horizontal absolute codes
        '(\\u001B\\u005B\\d*J)', // Match erase display codes
        '(\\u001B\\u005B\\d*K)', // Match erase in line codes
        '(\\u001B\\u005B\\d*;\\d*H)', // Match cursor position codes
        '(\\u001B\\u005B\\d*A)', // Match cursor up codes
        '(\\u001B\\u005B\\d*B)', // Match cursor down codes
        '(\\u001B\\u005B\\d*C)', // Match cursor forward codes
        '(\\u001B\\u005B\\d*D)', // Match cursor back codes
        '(\\u001B\\u005B\\d*;\\d*H)', // Match cursor position codes
        '(\\u001B\\u005B\\d*;\\d*f)' // Match horizontal and vertical position codes
    ].join('|'), 'g');

    return str.replace(ansiEscapeCodesPattern, '');
}

function logTerminalData(data) {
    let timestamp = new Date().toISOString();
    let semiCleanData = stripAnsiCodes(data); // Strip ANSI codes

    let cleanData = semiCleanData.replace(/\\u25b2/g, '');

    let logEntry = `${timestamp}: ${cleanData}`;

    logContent += logEntry;

    terminal.write(data)
}

document.getElementById('saveLogs').addEventListener('click', function () {
    let timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    let logFileName = `server-logs-${timestamp}.txt`;

    let logsFolderPath = path.join(__dirname, 'logs');
    let logFilePath = path.join(logsFolderPath, logFileName);

    if (!fs.existsSync(logsFolderPath)) {
        fs.mkdirSync(logsFolderPath);
    }

    fs.writeFile(logFilePath, logContent, (err) => {
        if (err) {
            // console.error('Failed to save logs:', err);
            logTerminalData('Failed to save logs.\r\n');
        } else {
            logTerminalData('Logs saved successfully.\r\n');
            openFileLocation(logFilePath);
        }
    });
});

function openFileLocation(filePath) {
    let command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
    let args = process.platform === 'win32' ? ["/select,", filePath] : [path.dirname(filePath)];

    spawn(command, args);
}

function checkPortStatus(port, statusID, callback) {
    let server = net.createServer();
    server.listen(port, '127.0.0.1');
    server.on('listening', () => {
        server.close();
        callback('free', statusID);
    });
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            callback('in use', statusID);
        } else {
            callback('error', statusID);
        }
    });
}

function displayServerStatus(status, statusID) {
    let statusDiv = document.getElementById(statusID);
    if (status === 'in use') {
        statusDiv.textContent = 'IN USE';
        statusDiv.style.backgroundColor = "#008000"; // Green
    } else if (status === 'free') {
        statusDiv.textContent = 'STOPPED';
        statusDiv.style.backgroundColor = "#ff0000"; // Red
    } else {
        statusDiv.textContent = 'ERROR';
        statusDiv.style.backgroundColor = '#ff9800'; // Orange
    }
}

// Function to check port status and update display
function updateServerStatus(port, statusID) {
    checkPortStatus(port, statusID, displayServerStatus);
}

ipcRenderer.on('quit-app', () => {
    stopServer();
});

function stopServer() {
    if (child) {
        kill(child.pid, 'SIGTERM', (err) => {
            if (err) {
                console.error('Failed to stop the server:', err);
            }
        });
    }
}

function loadSettings() {
    const settingsFilePath = path.join(__dirname, 'settings.json');
    if (fs.existsSync(settingsFilePath)) {
        const settingsData = fs.readFileSync(settingsFilePath, 'utf-8');
        const settings = JSON.parse(settingsData);

        document.getElementById('port-server').value = settings.serverPort;
        document.getElementById('port-live').value = settings.livePort;

        updateServerStatus(settings.serverPort, 'server-status');
        updateServerStatus(settings.livePort, 'live-status');
        startStatusUpdateLoop(settings.serverPort, 'server-status', settings.livePort, 'live-status');
    }
}

let serverStatusUpdateInterval;
let liveStatusUpdateInterval;

function startStatusUpdateLoop(serverPort, serverStatusID, livePort, liveStatusID) {
    // Clear existing intervals
    if (serverStatusUpdateInterval || liveStatusUpdateInterval) {
        clearInterval(serverStatusUpdateInterval);
        clearInterval(liveStatusUpdateInterval);
    }

    try {
        document.getElementById("serverPortNum").textContent = `PORT ${serverPort}`;
        document.getElementById("livePortNum").textContent = `PORT ${livePort}`;
    } catch (errror) {
        // console.log(error);
    }

    serverStatusUpdateInterval = setInterval(function () {
        updateServerStatus(serverPort, serverStatusID);
    }, 3000);

    liveStatusUpdateInterval = setInterval(function () {
        updateServerStatus(livePort, liveStatusID);
    }, 3000);
}

loadSettings();
