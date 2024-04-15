const logFileInput = document.getElementById('logFileInput');
const dropZone = document.getElementById('dropZone');
const jsonBeautifyBtn = document.getElementById('jsonBeautifyBtn');
const logLevelSelect = document.getElementById('logLevelSelect');
const filterLogLevelBtn = document.getElementById('filterLogLevelBtn');
let currentLines = []; // To store the current log lines
let allLines = []; // To store all lines for current UUID
let selectedIndex = -1; // Index of the selected line for JSON beautification
let uuidTimestamps = {}; // To store the first and last timestamp for each UUID

dropZone.addEventListener('click', () => logFileInput.click());
logFileInput.addEventListener('change', handleFileSelect, false);
filterLogLevelBtn.addEventListener('click', filterLogsByLevel);

dropZone.addEventListener('dragover', function (event) {
    event.stopPropagation();
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', function (event) {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', function (event) {
    event.stopPropagation();
    event.preventDefault();
    dropZone.classList.remove('dragover');
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect({ target: { files: files } });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const logDisplay = document.getElementById('logDisplay');
    createLogHeader(logDisplay);
});

function createLogHeader(display) {
    const headerTitles = ["Timestamp", "Level", "Source", "Message", "Step ID", "Custom String"];
    const header = document.createElement('div');
    header.classList.add('log-header');
    headerTitles.forEach(title => {
        const cell = document.createElement('p');
        cell.textContent = title;
        header.appendChild(cell);
    });
    display.appendChild(header);
}

document.addEventListener('DOMContentLoaded', () => {
    const jsonBeautifyBtn = document.getElementById('jsonBeautifyBtn');
    jsonBeautifyBtn.addEventListener('click', beautifyJsonInGrid);
});

function beautifyJsonInGrid() {
    const logDisplay = document.getElementById('logDisplay');
    const logRows = logDisplay.getElementsByClassName('log-row');
    Array.from(logRows).forEach(row => {
        const messageCell = row.children[3]; // Assuming the JSON string is in the "Message" column
        const jsonPart = messageCell.textContent.replace('Stringified input: ', '').trim();
        if (isJsonString(jsonPart)) {
            const json = JSON.parse(jsonPart);
            const prettyJson = JSON.stringify(json, null, 4);
            const pre = document.createElement('pre');
            pre.style.whiteSpace = 'pre-wrap';
            pre.textContent = prettyJson;
            messageCell.innerHTML = ''; // Clear the existing content
            messageCell.appendChild(pre); // Insert beautified JSON
        }
    });
}

function displayLogLines(lines) {
    const display = document.getElementById('logDisplay');
    display.innerHTML = ''; // Clear previous display
    createLogHeader(display); // Add header row
    lines.forEach((line, index) => {
        const parts = line.split('|');
        const row = document.createElement('div');
        row.classList.add('log-row');
        parts.forEach((part, idx) => {
            const cell = document.createElement('p');
            if (idx === 3 && isJsonString(part.replace('Stringified input: ', '').trim())) { // For JSON part
                const jsonPart = part.replace('Stringified input: ', '').trim();
                const pre = document.createElement('pre');
                pre.textContent = jsonPart;
                cell.appendChild(pre);
            } else {
                cell.textContent = part.trim();
            }
            cell.style.color = getColorForLogLevel(parts[1].trim()); // Color based on log level
            row.appendChild(cell);
        });
        display.appendChild(row);
    });
}

function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}


function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    document.getElementById('fileName').textContent = file.name;
    const reader = new FileReader();
    reader.onload = function (fileEvent) {
        const content = fileEvent.target.result;
        parseLogFile(content);
    };
    reader.readAsText(file);
}

function parseLogFile(content) {
    const lines = content.split('\n');
    const uuidMap = {};

    lines.forEach(line => {
        const parts = line.split('|');
        if (parts.length > 4) {
            const uuid = parts[4].trim();
            const timestamp = parseInt(parts[0].trim());
            if (!uuidMap[uuid]) {
                uuidMap[uuid] = [];
                uuidTimestamps[uuid] = { first: timestamp, last: timestamp };
            }
            uuidMap[uuid].push(line);
            if (timestamp < uuidTimestamps[uuid].first) {
                uuidTimestamps[uuid].first = timestamp;
            }
            if (timestamp > uuidTimestamps[uuid].last) {
                uuidTimestamps[uuid].last = timestamp;
            }
        }
    });

    updateUUIDSelect(Object.keys(uuidMap));
    document.getElementById('uuidCount').textContent = Object.keys(uuidMap).length;
    document.getElementById('uuidSelect').addEventListener('change', function () {
        const selectedUUID = this.value;
        allLines = uuidMap[selectedUUID];
        currentLines = allLines.slice(); // Clone all lines
        displayLogLines(currentLines);
        displayTimeSpent(uuidTimestamps[selectedUUID]); // Display time spent
    });
}

function displayTimeSpent(timestamps) {
    const timeSpentMs = timestamps.last - timestamps.first;
    const minutes = Math.floor(timeSpentMs / 60000);
    const seconds = ((timeSpentMs % 60000) / 1000).toFixed(0);
    const milliseconds = timeSpentMs % 1000;
    const timeSpentField = document.getElementById('timeSpent');
    timeSpentField.textContent = `Time spent: ${minutes}:${seconds}:${milliseconds}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const timeSpentField = document.createElement('p');
    timeSpentField.id = 'timeSpent';
    timeSpentField.style.fontWeight = 'bold';
    document.body.insertBefore(timeSpentField, document.getElementById('logDisplay'));
});

function updateUUIDSelect(uuids) {
    const select = document.getElementById('uuidSelect');
    select.innerHTML = '<option value="">Select UUID</option>'; // Reset the select
    uuids.forEach(uuid => {
        const option = document.createElement('option');
        option.value = uuid;
        option.textContent = uuid;
        select.appendChild(option);
    });
}

function displayLogLines(lines) {
    const display = document.getElementById('logDisplay');
    display.innerHTML = ''; // Clear previous display
    createLogHeader(display); // Add header row
    lines.forEach((line) => {
        const parts = line.split('|');
        const row = document.createElement('div');
        row.classList.add('log-row');
        parts.forEach(part => {
            const cell = document.createElement('p');
            cell.textContent = part.trim();
            cell.style.color = getColorForLogLevel(parts[1].trim()); // Color based on log level
            row.appendChild(cell);
        });
        display.appendChild(row);
    });
}

function filterLogsByLevel() {
    const selectedLevel = logLevelSelect.value;
    if (selectedLevel) {
        const levels = ['trace', 'debug', 'info', 'warn', 'err', 'critical'];
        const minLevelIndex = levels.indexOf(selectedLevel);
        currentLines = allLines.filter(line => {
            const logLevel = line.split('|')[1].trim();
            return levels.indexOf(logLevel) >= minLevelIndex;
        });
    } else {
        currentLines = allLines.slice(); // No filter applied, clone all lines
    }
    displayLogLines(currentLines);
}

function beautifyJson(jsonString, index) {
    const json = JSON.parse(jsonString);
    const prettyJson = JSON.stringify(json, null, 4);
    currentLines[index] = currentLines[index].replace(jsonString, prettyJson);
    displayLogLines(currentLines); // Redisplay all lines with the beautified JSON in place
}

function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function getColorForLogLevel(logLevel) {
    const colors = {
        'trace': '#888',
        'debug': '#009',
        'info': '#079',
        'warn': '#e90',
        'err': '#c00',
        'critical': '#f00',
        'off': '#000'
    };
    return colors[logLevel] || '#000'; // Default to black if log level is undefined
}
