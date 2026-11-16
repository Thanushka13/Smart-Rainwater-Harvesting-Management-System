// ==========================================
// AQUADROP - SMART RAINWATER MANAGEMENT
// Demo version with simulated sensor readings
// ==========================================

const DEFAULT_STATE = {
    capacity: 5000,
    water: 3250,
    collectedToday: 420,
    usedToday: 180,
    filterCondition: "Good",
    lastMaintenance: "Not recorded",
    usageRecords: [],
    activities: [],
    alerts: []
};

let state = loadState();
let simulationTimer = null;
let simulationRunning = false;
let latestCalculation = 0;

let collectionChart = null;
let analyticsChart = null;

let sensorData = {
    raining: false,
    flow: 0
};

// ==========================================
// DATA STORAGE
// ==========================================

function loadState() {
    try {
        const saved = localStorage.getItem("aquadropData");

        if (saved) {
            return {
                ...DEFAULT_STATE,
                ...JSON.parse(saved)
            };
        }
    } catch (error) {
        console.error("Could not load saved data:", error);
    }

    return { ...DEFAULT_STATE };
}

function saveState() {
    localStorage.setItem("aquadropData", JSON.stringify(state));
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function formatNumber(value) {
    return Number(value).toLocaleString("en-IN", {
        maximumFractionDigits: 1
    });
}

function addActivity(message, icon = "💧") {
    state.activities.unshift({
        message,
        icon,
        time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        })
    });

    state.activities = state.activities.slice(0, 8);

    saveState();
    renderActivities();
}

function addAlert(message, icon = "🔔") {
    state.alerts.unshift({
        message,
        icon,
        time: new Date().toLocaleString()
    });

    state.alerts = state.alerts.slice(0, 30);

    saveState();
    renderAlerts();
}

function showMessage(message) {
    alert(message);
}

// ==========================================
// NAVIGATION
// ==========================================

const navButtons = document.querySelectorAll(".nav-link");
const pages = document.querySelectorAll(".page");

const pageDetails = {
    overview: [
        "Overview",
        "Monitor your rainwater harvesting system."
    ],
    monitoring: [
        "Live Monitoring",
        "View sensor readings and system activity."
    ],
    collection: [
        "Water Collection",
        "Calculate your potential rainwater collection."
    ],
    filtration: [
        "Filtration System",
        "Monitor filter condition and maintenance."
    ],
    storage: [
        "Storage Management",
        "Manage your water storage tank."
    ],
    usage: [
        "Water Usage",
        "Record and track water consumption."
    ],
    analytics: [
        "Analytics & Reports",
        "Analyse your rainwater collection data."
    ],
    alerts: [
        "Alerts & Notifications",
        "View important system notifications."
    ],
    settings: [
        "Settings",
        "Manage your AQUADROP application."
    ]
};

function openPage(pageName) {
    pages.forEach(page => {
        page.classList.toggle("active", page.id === pageName);
    });

    navButtons.forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.page === pageName
        );
    });

    const details = pageDetails[pageName];

    if (details) {
        document.getElementById("page-title").textContent = details[0];
        document.getElementById("page-subtitle").textContent = details[1];
    }

    if (pageName === "analytics") {
        setTimeout(updateAnalyticsChart, 50);
    }
}

navButtons.forEach(button => {
    button.addEventListener("click", () => {
        openPage(button.dataset.page);
    });
});

document.getElementById("notification-button").addEventListener("click", () => {
    openPage("alerts");
});

// ==========================================
// DASHBOARD UPDATES
// ==========================================

function updateDashboard() {
    const percentage = state.capacity > 0
        ? Math.min(100, (state.water / state.capacity) * 100)
        : 0;

    document.getElementById("stored-value").textContent =
        formatNumber(state.water) + " L";

    document.getElementById("collected-value").textContent =
        formatNumber(state.collectedToday) + " L";

    document.getElementById("used-value").textContent =
        formatNumber(state.usedToday) + " L";

    document.getElementById("capacity-value").textContent =
        formatNumber(state.capacity) + " L";

    document.getElementById("tank-percentage").textContent =
        Math.round(percentage) + "%";

    document.getElementById("tank-litres").textContent =
        formatNumber(state.water) + " / " +
        formatNumber(state.capacity) + " L";

    document.getElementById("tank-water").style.height =
        percentage + "%";

    document.getElementById("monitor-level").textContent =
        Math.round(percentage) + "%";

    document.getElementById("storage-progress-label").textContent =
        Math.round(percentage) + "%";

    document.getElementById("storage-progress-fill").style.width =
        percentage + "%";

    document.getElementById("capacity-input").value = state.capacity;
    document.getElementById("water-input").value = state.water;

    let status = "Normal water level";
    let tankStatus = "Normal";

    if (percentage >= 100) {
        status = "Tank is full";
        tankStatus = "Full";
    } else if (percentage >= 90) {
        status = "High water level";
        tankStatus = "High";
    } else if (percentage <= 20) {
        status = "Low water level";
        tankStatus = "Low";
    }

    document.getElementById("tank-status").textContent = status;

    if (percentage >= 90) {
        document.getElementById("tank-status").style.background = "#fff1dc";
        document.getElementById("tank-status").style.color = "#a76c0b";
    } else {
        document.getElementById("tank-status").style.background = "#e6f8f0";
        document.getElementById("tank-status").style.color = "#16875e";
    }

    // Create a warning only when the tank first reaches a warning level.
    if (tankStatus === "Full" || tankStatus === "High") {
        if (window.lastTankWarning !== tankStatus) {
            addAlert(
                tankStatus === "Full"
                    ? "Storage tank is full. Additional collection may overflow."
                    : "Storage tank has reached 90% capacity.",
                "⚠️"
            );
        }
    }

    window.lastTankWarning = tankStatus;

    document.getElementById("filter-condition").textContent =
        state.filterCondition;

    document.getElementById("monitor-filter").textContent =
        state.filterCondition;

    document.getElementById("last-maintenance").textContent =
        state.lastMaintenance;

    document.getElementById("filter-description").textContent =
        state.filterCondition === "Good"
            ? "The filter is currently in good condition."
            : "Filter maintenance is recommended.";

    saveState();
}

// ==========================================
// ACTIVITIES AND ALERTS
// ==========================================

function renderActivities() {
    const container = document.getElementById("activity-list");

    if (state.activities.length === 0) {
        container.innerHTML =
            '<p class="empty-message">No recent activity.</p>';
        return;
    }

    container.innerHTML = state.activities.map(item => `
        <div class="activity-item">
            <div class="activity-icon">${item.icon}</div>
            <div>
                <strong>${escapeHTML(item.message)}</strong>
                <small>${escapeHTML(item.time)}</small>
            </div>
        </div>
    `).join("");
}

function renderAlerts() {
    const container = document.getElementById("alerts-list");

    if (state.alerts.length === 0) {
        container.innerHTML =
            '<p class="empty-message">No new notifications.</p>';
        return;
    }

    container.innerHTML = state.alerts.map(item => `
        <div class="activity-item">
            <div class="activity-icon">${item.icon}</div>
            <div>
                <strong>${escapeHTML(item.message)}</strong>
                <small>${escapeHTML(item.time)}</small>
            </div>
        </div>
    `).join("");
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
}

document.getElementById("clear-alerts").addEventListener("click", () => {
    state.alerts = [];
    saveState();
    renderAlerts();
});

// ==========================================
// CHARTS
// ==========================================

function createCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: "#edf2f5"
                },
                ticks: {
                    font: {
                        size: 10
                    }
                }
            },
            x: {
                grid: {
                    display: false
                },
                ticks: {
                    font: {
                        size: 10
                    }
                }
            }
        }
    };

    const collectionCanvas = document.getElementById("collectionChart");

    if (collectionCanvas && window.Chart) {
        collectionChart = new Chart(collectionCanvas, {
            type: "bar",
            data: {
                labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                datasets: [{
                    label: "Collected Water (L)",
                    data: [250, 380, 300, 520, 420, 610, 420],
                    backgroundColor: "#24a5c7",
                    borderRadius: 5
                }]
            },
            options: chartOptions
        });
    }

    const analyticsCanvas = document.getElementById("analyticsChart");

    if (analyticsCanvas && window.Chart) {
        analyticsChart = new Chart(analyticsCanvas, {
            type: "line",
            data: {
                labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                datasets: [{
                    label: "Water Collection (L)",
                    data: [250, 380, 300, 520, 420, 610, 420],
                    borderColor: "#087eaa",
                    backgroundColor: "rgba(8, 126, 170, 0.12)",
                    fill: true,
                    tension: 0.35,
                    pointRadius: 4
                }]
            },
            options: {
                ...chartOptions,
                plugins: {
                    legend: {
                        display: true,
                        position: "top"
                    }
                }
            }
        });
    }
}

function updateAnalyticsChart() {
    if (!analyticsChart) return;

    analyticsChart.data.datasets[0].data = [
        250, 380, 300, 520, 420, 610, state.collectedToday
    ];

    analyticsChart.update();
}

// ==========================================
// WATER COLLECTION CALCULATOR
// ==========================================

document.getElementById("calculate-water").addEventListener("click", () => {
    const rainfall = Number(document.getElementById("rainfall-input").value);
    const roofArea = Number(document.getElementById("roof-input").value);
    const runoff = Number(document.getElementById("runoff-input").value);

    if (
        !Number.isFinite(rainfall) ||
        !Number.isFinite(roofArea) ||
        !Number.isFinite(runoff) ||
        rainfall <= 0 ||
        roofArea <= 0 ||
        runoff < 0 ||
        runoff > 1
    ) {
        showMessage("Please enter valid rainfall, roof area and runoff values.");
        return;
    }

    // 1 mm rainfall over 1 square metre = 1 litre.
    latestCalculation = rainfall * roofArea * runoff;

    document.getElementById("collection-result").textContent =
        formatNumber(latestCalculation) + " L";
});

document.getElementById("add-collected-water").addEventListener("click", () => {
    if (latestCalculation <= 0) {
        showMessage("Calculate the harvestable water amount first.");
        return;
    }

    const availableSpace = state.capacity - state.water;

    if (availableSpace <= 0) {
        showMessage("The storage tank is already full.");
        return;
    }

    const addedWater = Math.min(latestCalculation, availableSpace);
    const overflow = latestCalculation - addedWater;

    state.water += addedWater;
    state.collectedToday += addedWater;

    addActivity(
        formatNumber(addedWater) + " L added to the storage tank.",
        "☔"
    );

    if (overflow > 0) {
        addAlert(
            formatNumber(overflow) + " L could not be stored because the tank is full.",
            "⚠️"
        );
    }

    latestCalculation = 0;

    document.getElementById("collection-result").textContent = "0 L";

    updateDashboard();

    showMessage("Water collection updated successfully!");
});

// ==========================================
// STORAGE MANAGEMENT
// ==========================================

document.getElementById("update-storage").addEventListener("click", () => {
    const capacity = Number(document.getElementById("capacity-input").value);
    const water = Number(document.getElementById("water-input").value);

    if (
        !Number.isFinite(capacity) ||
        !Number.isFinite(water) ||
        capacity <= 0 ||
        water < 0 ||
        water > capacity
    ) {
        showMessage("Enter a valid capacity and water level.");
        return;
    }

    state.capacity = capacity;
    state.water = water;

    addActivity("Storage tank settings updated.", "🛢️");
    updateDashboard();

    showMessage("Storage information updated!");
});

document.getElementById("reset-storage").addEventListener("click", () => {
    if (!confirm("Reset the storage tank to its default values?")) return;

    state.capacity = DEFAULT_STATE.capacity;
    state.water = DEFAULT_STATE.water;

    addActivity("Storage tank restored to default values.", "↻");
    updateDashboard();
});

// ==========================================
// WATER USAGE
// ==========================================

document.getElementById("record-usage").addEventListener("click", () => {
    const category = document.getElementById("usage-category").value;
    const amount = Number(document.getElementById("usage-amount").value);

    if (!Number.isFinite(amount) || amount <= 0) {
        showMessage("Please enter a valid water usage amount.");
        return;
    }

    if (amount > state.water) {
        showMessage("Not enough water available in the storage tank.");
        return;
    }

    const record = {
        id: Date.now(),
        category,
        amount,
        date: new Date().toLocaleString()
    };

    state.usageRecords.unshift(record);

    state.water -= amount;
    state.usedToday += amount;

    document.getElementById("usage-amount").value = "";

    addActivity(
        formatNumber(amount) + " L used for " + category + ".",
        "↗"
    );

    updateUsageHistory();
    updateDashboard();

    showMessage("Water usage recorded successfully!");
});

function updateUsageHistory() {
    const tbody = document.getElementById("usage-history");

    if (state.usageRecords.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="4">No usage records yet.</td></tr>';
        return;
    }

    tbody.innerHTML = state.usageRecords.map(record => `
        <tr>
            <td>${escapeHTML(record.category)}</td>
            <td>${formatNumber(record.amount)} L</td>
            <td>${escapeHTML(record.date)}</td>
            <td>
                <button class="delete-record" data-id="${record.id}">
                    Delete
                </button>
            </td>
        </tr>
    `).join("");
}

document.getElementById("usage-history").addEventListener("click", event => {
    const button = event.target.closest(".delete-record");

    if (!button) return;

    const recordId = Number(button.dataset.id);

    const index = state.usageRecords.findIndex(
        record => record.id === recordId
    );

    if (index === -1) return;

    if (!confirm("Delete this usage record? The water amount will be restored.")) {
        return;
    }

    const record = state.usageRecords[index];

    state.water = Math.min(
        state.capacity,
        state.water + record.amount
    );

    state.usedToday = Math.max(0, state.usedToday - record.amount);

    state.usageRecords.splice(index, 1);

    addActivity("A water usage record was deleted.", "↩️");

    updateUsageHistory();
    updateDashboard();
});

// ==========================================
// FILTER MAINTENANCE
// ==========================================

document.getElementById("maintain-filter").addEventListener("click", () => {
    state.filterCondition = "Good";
    state.lastMaintenance = new Date().toLocaleDateString();

    addActivity("Filter maintenance completed.", "⚙️");

    updateDashboard();

    showMessage("Filter marked as maintained!");
});

// ==========================================
// SENSOR SIMULATION
// ==========================================

function updateSensorDisplay() {
    document.getElementById("rain-status").textContent =
        sensorData.raining ? "Rain Detected" : "No Rain";

    document.getElementById("flow-rate").textContent =
        sensorData.flow.toFixed(1) + " L/min";
}

function simulateSensorReading() {
    const raining = Math.random() > 0.45;

    sensorData.raining = raining;
    sensorData.flow = raining
        ? Number((Math.random() * 4 + 1).toFixed(1))
        : 0;

    updateSensorDisplay();

    // Simulated collection adds a small amount of water.
    if (raining && state.water < state.capacity) {
        const collected = Math.min(
            Number((Math.random() * 5 + 1).toFixed(1)),
            state.capacity - state.water
        );

        state.water += collected;
        state.collectedToday += collected;

        updateDashboard();
    }

    // Occasionally simulate a filter maintenance warning.
    if (Math.random() > 0.97 && state.filterCondition === "Good") {
        state.filterCondition = "Maintenance Due";

        addAlert("Filter maintenance may be required.", "⚠️");
        updateDashboard();
    }
}

document.getElementById("start-simulation").addEventListener("click", () => {
    if (simulationRunning) return;

    simulationRunning = true;

    simulateSensorReading();

    simulationTimer = setInterval(simulateSensorReading, 3000);

    addActivity("Sensor simulation started.", "▶️");
});

document.getElementById("pause-simulation").addEventListener("click", () => {
    if (!simulationRunning) return;

    clearInterval(simulationTimer);

    simulationTimer = null;
    simulationRunning = false;

    addActivity("Sensor simulation paused.", "Ⅱ");
});

document.getElementById("reset-simulation").addEventListener("click", () => {
    clearInterval(simulationTimer);

    simulationTimer = null;
    simulationRunning = false;

    sensorData = {
        raining: false,
        flow: 0
    };

    updateSensorDisplay();

    addActivity("Sensor simulation reset.", "↻");
});

// ==========================================
// CSV REPORT EXPORT
// ==========================================

document.getElementById("export-report").addEventListener("click", () => {
    const rows = [
        ["Category", "Amount (Litres)", "Date"]
    ];

    state.usageRecords.forEach(record => {
        rows.push([
            record.category,
            record.amount,
            record.date
        ]);
    });

    rows.push([]);
    rows.push(["Current Storage", state.water]);
    rows.push(["Tank Capacity", state.capacity]);
    rows.push(["Today's Collection", state.collectedToday]);
    rows.push(["Today's Usage", state.usedToday]);

    const csv = rows.map(row =>
        row.map(value => {
            const safeValue = String(value ?? "").replace(/"/g, '""');
            return `"${safeValue}"`;
        }).join(",")
    ).join("\n");

    const blob = new Blob([csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "aquadrop-report.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
});

// ==========================================
// RESET APPLICATION
// ==========================================

document.getElementById("reset-application").addEventListener("click", () => {
    if (!confirm("Are you sure? This will reset all AQUADROP data.")) {
        return;
    }

    clearInterval(simulationTimer);

    simulationTimer = null;
    simulationRunning = false;

    state = {
        ...DEFAULT_STATE,
        usageRecords: [],
        activities: [],
        alerts: []
    };

    sensorData = {
        raining: false,
        flow: 0
    };

    latestCalculation = 0;
    window.lastTankWarning = null;

    saveState();

    document.getElementById("collection-result").textContent = "0 L";
    document.getElementById("rain-status").textContent = "No Rain";
    document.getElementById("flow-rate").textContent = "0.0 L/min";

    updateDashboard();
    updateUsageHistory();
    renderActivities();
    renderAlerts();

    showMessage("AQUADROP has been reset to its default values.");

    openPage("overview");
});

// ==========================================
// INITIALISE APPLICATION
// ==========================================

function initialiseApp() {
    createCharts();

    updateDashboard();
    updateUsageHistory();
    renderActivities();
    renderAlerts();
    updateSensorDisplay();

    openPage("overview");

    addActivity("AQUADROP dashboard initialised.", "💧");
}

initialiseApp();
