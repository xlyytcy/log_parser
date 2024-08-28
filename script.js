let allLines = [];
let filteredLines = [];
let uuidTimestamps = {};

const logFileInput = document.getElementById('logFileInput');
const dropZone = document.getElementById('dropZone');
const logLevelSelect = document.getElementById('logLevelSelect');
const uuidSelect = document.getElementById('uuidSelect');

dropZone.addEventListener('click', () => logFileInput.click());
logFileInput.addEventListener('change', handleFileSelect);
logLevelSelect.addEventListener('change', filterLogs);
uuidSelect.addEventListener('change', filterLogs);

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
    uuidTimestamps = {};

    allLines = lines.filter(line => line.trim() !== '').map(line => {
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
        return line;
    });

    updateUUIDSelect(Object.keys(uuidMap));
    document.getElementById('uuidCount').textContent = Object.keys(uuidMap).length;
    filterLogs();
}

function updateUUIDSelect(uuids) {
    uuidSelect.innerHTML = '<option value="">All UUIDs</option>';
    uuids.forEach(uuid => {
        const option = document.createElement('option');
        option.value = uuid;
        option.textContent = uuid;
        uuidSelect.appendChild(option);
    });
}

function filterLogs() {
    const selectedLevel = logLevelSelect.value;
    const selectedUUID = uuidSelect.value;
    const levels = ['trace', 'debug', 'info', 'warn', 'error', 'critical'];

    filteredLines = allLines.filter(line => {
        const parts = line.split('|');
        const logLevel = parts[1].trim().toLowerCase();
        const uuid = parts[4].trim();

        const levelMatch = selectedLevel ? levels.indexOf(logLevel) >= levels.indexOf(selectedLevel) : true;
        const uuidMatch = selectedUUID ? uuid === selectedUUID : true;

        return levelMatch && uuidMatch;
    });

    displayLogLines();
    if (selectedUUID) {
        displayTimeSpent(uuidTimestamps[selectedUUID]);
    } else {
        document.getElementById('timeSpent').textContent = '';
    }
}

function displayTimeSpent(timestamps) {
    if (!timestamps) return;

    const timeSpentMs = timestamps.last - timestamps.first;
    const minutes = Math.floor(timeSpentMs / 60000);
    const seconds = Math.floor((timeSpentMs % 60000) / 1000);
    const milliseconds = timeSpentMs % 1000;

    const formattedTime = `${padZero(minutes)}:${padZero(seconds)}.${padZero(milliseconds, 3)}`;
    document.getElementById('timeSpent').textContent = formattedTime;
}

function padZero(num, width = 2) {
    return num.toString().padStart(width, '0');
}

function displayLogLines() {
    const display = document.getElementById('logDisplay');
    display.innerHTML = '';
    createLogHeader(display);

    const fragment = document.createDocumentFragment();
    filteredLines.forEach(line => {
        const row = createLogRow(line);
        fragment.appendChild(row);
    });
    display.appendChild(fragment);
}

function createLogHeader(display) {
    const headerTitles = ["Timestamp", "Level", "Source", "Message", "UUID", "Custom String"];
    const header = document.createElement('div');
    header.classList.add('log-header');
    headerTitles.forEach(title => {
        const cell = document.createElement('div');
        cell.textContent = title;
        header.appendChild(cell);
    });
    display.appendChild(header);
}

function createLogRow(line) {
    const parts = line.split('|');
    const row = document.createElement('div');
    row.classList.add('log-row');
    parts.forEach((part, index) => {
        const cell = document.createElement('div');
        let content = part.trim();
        if (index === 3 && content.startsWith('Stringified input: ')) {
            content = content.replace('Stringified input: ', '');
            try {
                const json = JSON.parse(content);
                const prettyJson = JSON.stringify(json, null, 2);
                const jsonContainer = document.createElement('div');
                jsonContainer.classList.add('json-content');
                jsonContainer.innerHTML = `<pre>${prettyJson}</pre>`;
                cell.appendChild(jsonContainer);

                const showMoreBtn = document.createElement('button');
                showMoreBtn.textContent = 'Show More';
                showMoreBtn.classList.add('show-more');
                showMoreBtn.addEventListener('click', () => toggleJsonExpand(jsonContainer));
                cell.appendChild(showMoreBtn);
            } catch (e) {
                cell.textContent = "Stringified input: " + content;
            }
        } else {
            cell.textContent = content;
        }
        row.appendChild(cell);
    });
    return row;
}

function toggleJsonExpand(jsonContainer) {
    const isExpanded = jsonContainer.style.maxHeight === 'none';
    if (isExpanded) {
        jsonContainer.style.maxHeight = '100px';
        jsonContainer.parentNode.querySelector('.show-more').textContent = 'Show More';
    } else {
        jsonContainer.style.maxHeight = 'none';
        jsonContainer.parentNode.querySelector('.show-more').textContent = 'Show Less';
    }
}

// Initialize the display with empty state
displayLogLines();