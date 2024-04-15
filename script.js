const logFileInput = document.getElementById('logFileInput');
const dropZone = document.getElementById('dropZone');
const jsonBeautifyBtn = document.getElementById('jsonBeautifyBtn');
const logLevelSelect = document.getElementById('logLevelSelect');
const filterLogLevelBtn = document.getElementById('filterLogLevelBtn');
let currentLines = []; // To store the current log lines
let allLines = []; // To store all lines for current UUID

dropZone.addEventListener('click', () => logFileInput.click());
logFileInput.addEventListener('change', handleFileSelect, false);
filterLogLevelBtn.addEventListener('click', filterLogsByLevel);

dropZone.addEventListener('dragover', function(event) {
    event.stopPropagation();
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', function(event) {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', function(event) {
    event.stopPropagation();
    event.preventDefault();
    dropZone.classList.remove('dragover');
    const files = event.dataTransfer.files; // FileList object.
    if (files.length > 0) {
        handleFileSelect({ target: { files: files } });
    }
});

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }
    document.getElementById('fileNameDisplay').textContent = `Selected file: ${file.name}`;

    const reader = new FileReader();
    reader.onload = function(fileEvent) {
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
            if (!uuidMap[uuid]) {
                uuidMap[uuid] = [];
            }
            uuidMap[uuid].push(line);
        }
    });

    updateUUIDSelect(Object.keys(uuidMap));
    document.getElementById('uuidCountDisplay').textContent = `Number of UUIDs: ${Object.keys(uuidMap).length}`;
    document.getElementById('uuidSelect').addEventListener('change', function() {
        const selectedUUID = this.value;
        allLines = uuidMap[selectedUUID];
        currentLines = allLines.slice(); // Clone all lines
        displayLogLines(currentLines);
        jsonBeautifyBtn.disabled = true; // Disable beautify button by default
        jsonBeautifyBtn.onclick = null; // Clear previous click handlers
    });
}

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
    lines.forEach((line, index) => {
        const p = document.createElement('p');
        const logLevel = line.split('|')[1].trim();
        p.textContent = line;
        p.style.color = getColorForLogLevel(logLevel);
        display.appendChild(p);
        p.onclick = () => selectLineForJson(line, index);
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

function selectLineForJson(line, index) {
    const jsonPart = line.split('|')[3].replace('Stringified input: ', '').trim();
    if (isJsonString(jsonPart)) {
        jsonBeautifyBtn.disabled = false;
        jsonBeautifyBtn.onclick = () => {
            beautifyJson(jsonPart);
        };
    } else {
        jsonBeautifyBtn.disabled = true;
        jsonBeautifyBtn.onclick = null;
    }
}

function beautifyJson(jsonString) {
    const json = JSON.parse(jsonString);
    const prettyJson = JSON.stringify(json, null, 4);
    const display = document.getElementById('logDisplay');
    display.innerHTML = `<pre style="white-space: pre-wrap; color: #4CAF50;">${prettyJson}</pre>`; // Display the formatted JSON in green
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
