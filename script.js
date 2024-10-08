const logFileInput = document.getElementById('logFileInput');
const dropZone = document.getElementById('dropZone');
const logLevelSelect = document.getElementById('logLevelSelect');
let currentLines = []; // To store the current log lines
let allLines = []; // To store all lines for current UUID
let uuidTimestamps = {}; // To store the first and last timestamp for each UUID
let filteredLines = []; // To store filtered lines

dropZone.addEventListener('click', () => logFileInput.click());
logFileInput.addEventListener('change', handleFileSelect, false);
logLevelSelect.addEventListener('change', filterLogsByLevel);

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

// document.addEventListener('DOMContentLoaded', () => {
//     const jsonBeautifyBtn = document.getElementById('jsonBeautifyBtn');
//     jsonBeautifyBtn.addEventListener('click', beautifyJsonInGrid);
// });


// function beautifyJsonInGrid() {
//     const logDisplay = document.getElementById('logDisplay');
//     const logRows = logDisplay.getElementsByClassName('log-row');
//     if (logRows.length > 0) {
//         const row = logRows[0];
//         const messageCell = row.children[3];
//         const jsonPart = messageCell.textContent.replace('Stringified input: ', '').trim();
//         if (isJsonString(jsonPart)) {
//             const json = JSON.parse(jsonPart);
//             const prettyJson = JSON.stringify(json, null, 4);
//             const pre = document.createElement('pre');
//             pre.style.whiteSpace = 'pre-wrap';
//             pre.textContent = prettyJson;
//             messageCell.innerHTML = '';
//             messageCell.appendChild(pre);
//         }
//     }
// }

function displayLogLines() {
    const display = document.getElementById('logDisplay');
    display.innerHTML = ''; // Clear previous display
    createLogHeader(display); // Add header row
    
    const fragment = document.createDocumentFragment();
    const visibleLines = 100; // Adjust based on your needs

    function renderVisibleLines(startIndex) {
        const endIndex = Math.min(startIndex + visibleLines, filteredLines.length);
        for (let i = startIndex; i < endIndex; i++) {
            const line = filteredLines[i];
            const row = createLogRow(line);
            fragment.appendChild(row);
        }
        display.appendChild(fragment);
    }

    renderVisibleLines(0);

    // Implement infinite scrolling
    display.addEventListener('scroll', () => {
        if (display.scrollTop + display.clientHeight >= display.scrollHeight - 100) {
            renderVisibleLines(display.children.length - 1); // -1 to account for the header
        }
    });
}

function createLogRow(line) {
    const parts = line.split('|');
    const row = document.createElement('div');
    row.classList.add('log-row');
    parts.forEach((part, index) => {
        const cell = document.createElement('p');
        let content = part.trim();
        cell.style.color = getColorForLogLevel(parts[1].trim());

        if (index === 3 && content.startsWith('Stringified input: ')) {
            content = content.replace('Stringified input: ', '');
            if (isJsonString(content) && content.length > 100) {
                cell.innerHTML = `Stringified input: ${content.substring(0, 100)}... <button class="show-more">Show More</button>`;
                cell.querySelector('.show-more').addEventListener('click', () => toggleJsonExpand(cell, content));
            } else {
                cell.textContent = "Stringified input: " + content;
            }
        } else {
            cell.textContent = content;
        }

        row.appendChild(cell);
    });
    return row;
}


function toggleJsonExpand(cell, jsonString) {
    if (cell.classList.contains('expanded')) {
        cell.innerHTML = `Stringified input: ${jsonString.substring(0, 100)}... <button class="show-more">Show More</button>`;
        cell.querySelector('.show-more').addEventListener('click', () => toggleJsonExpand(cell, jsonString));
    } else {
        const json = JSON.parse(jsonString);
        const prettyJson = JSON.stringify(json, null, 4);
        const pre = document.createElement('pre');
        pre.style.whiteSpace = 'pre-wrap';
        pre.textContent = prettyJson;
        cell.innerHTML = '';
        cell.appendChild(pre);
    }
    cell.classList.toggle('expanded');
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

    // Use a Web Worker for parsing to avoid blocking the main thread
    const worker = new Worker(URL.createObjectURL(new Blob([`
        self.onmessage = function(e) {
            const lines = e.data;
            const uuidMap = {};
            const uuidTimestamps = {};

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

            self.postMessage({uuidMap, uuidTimestamps});
        };
    `], {type: 'application/javascript'})));

    worker.onmessage = function(e) {
        const {uuidMap, uuidTimestamps} = e.data;
        updateUUIDSelect(Object.keys(uuidMap));
        document.getElementById('uuidCount').textContent = Object.keys(uuidMap).length;
        document.getElementById('uuidSelect').addEventListener('change', function () {
            const selectedUUID = this.value;
            allLines = uuidMap[selectedUUID];
            filterLogsByLevel(); // Apply current filter
            displayTimeSpent(uuidTimestamps[selectedUUID]);
        });
    };

    worker.postMessage(lines);
}

function displayTimeSpent(timestamps) {
    const timeSpentMs = timestamps.last - timestamps.first;

    // Calculate minutes, seconds, and milliseconds separately
    const minutes = Math.floor(timeSpentMs / 60000);
    const remainingMs = timeSpentMs % 60000;
    const seconds = Math.floor(remainingMs / 1000);
    const milliseconds = remainingMs % 1000;

    // Format the time components to ensure leading zeros where necessary
    const formattedTime = `${padZero(minutes)}:${padZero(seconds)}:${padZero(milliseconds, 3)}`;

    const timeValueField = document.getElementById('timeValue');
    timeValueField.textContent = formattedTime;
}

// Helper function to pad zeros for formatting
function padZero(num, width = 2) {
    const numString = String(num);
    return numString.length >= width ? numString : new Array(width - numString.length + 1).join('0') + numString;
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



function filterLogsByLevel() {
    const selectedLevel = logLevelSelect.value;
    const levels = ['trace', 'debug', 'info', 'warn', 'err', 'critical'];
    
    if (selectedLevel) {
        const minLevelIndex = levels.indexOf(selectedLevel);
        filteredLines = allLines.filter(line => {
            const logLevel = line.split('|')[1].trim().toLowerCase();
            return levels.indexOf(logLevel) >= minLevelIndex;
        });
    } else {
        filteredLines = allLines.slice(); // No filter applied, use all lines
    }
    
    displayLogLines();
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
