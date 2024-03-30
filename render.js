const { spawn } = require('child_process');
const path = require('path');
const kill = require('tree-kill');
const { Terminal } = require('@xterm/xterm');
const net = require('net');
const os = require('os');
const fs = require('fs');
const { ipcRenderer } = require('electron');
const http = require('http');

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

function trySpawn(command, startFilePath) {
    return new Promise((resolve, reject) => {
        const process = spawn(command, [startFilePath], { windowsHide: os.platform() === 'win32' });

        let commandNotFound = true;

        process.on('error', (err) => {
            if (err.code === 'ENOENT') {
                reject(`${command} not found`); // Reject if command not found
            } else {
                logTerminalData(`Error starting Python process with ${command}: ${err}`);
                reject(err); // Reject on other errors
            }
        });

        process.stdout.on('data', (data) => {
            if (commandNotFound) {
                commandNotFound = false; // Data received, command exists
                resolve(process); // Resolve
            }
            logTerminalData(data.toString());
        });

        process.stderr.on('data', (data) => {
            logTerminalData(data.toString());
        });

        process.on('close', (code) => {
            logTerminalData(`Process exited with code ${code}\r\n`);
            if (commandNotFound) {
                // If the process closes before any output, consider it a failure
                reject(`Process with ${command} exited prematurely.`);
            }
        });
    });
}

async function startPythonProcess(startFilePath) {
    const commands = ['python', 'python3'];

    for (const command of commands) {
        try {
            child = await trySpawn(command, startFilePath);
            // console.log(`${command} command was successful.`);
            return; // Exit the loop and function if successful
        } catch (error) {
            // console.log(error);
        }
    }

    logTerminalData("Failed to find a valid Python command ('python' or 'python3').\r\n");
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
    let requestOptions = {
        hostname: 'localhost',
        port: port,
        timeout: 5000, // 5 seconds timeout
    };

    let req = http.get(requestOptions, (res) => {
        let acceptableStatusCodes = statusID === 'server-status' ? [200, 302] : [200];

        if (acceptableStatusCodes.includes(res.statusCode)) {
            callback('in use', statusID);
        } else {
            console.log(`Received status code ${res.statusCode} for port ${port}`);
            callback('free', statusID);
        }
        res.resume(); // Consume response data to free up memory
    });

    req.on('error', (e) => {
        if (e.code === 'ECONNREFUSED') {
            console.log("Connection refused")
            callback('free', statusID);
        } else {
            console.error(`Error while checking port ${port}: ${e.message}`);
            callback('error', statusID);
        }
    });

    req.on('timeout', () => {
        console.error(`Request to port ${port} timed out`);
        req.abort(); // Abort the request on timeout
        callback('error', statusID);
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
