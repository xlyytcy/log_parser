// script.js
document.getElementById('logFileInput').addEventListener('change', handleFileSelect, false);

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

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
    document.getElementById('uuidSelect').addEventListener('change', function() {
        const selectedUUID = this.value;
        displayLogLines(uuidMap[selectedUUID]);
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
    lines.forEach(line => {
        const p = document.createElement('p');
        p.textContent = line;
        display.appendChild(p);
    });
}
