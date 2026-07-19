const App = (() => {
    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const yearCache = new Map();
    let selectedDate = formatDate(new Date());
    let saveTimer = null;
    let isSaving = false;
    let pendingSave = false;

    function formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    function parseDate(dateStr) {
        const [y, m, d] = dateStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    function getDayName(dateStr) {
        return DAY_NAMES[parseDate(dateStr).getDay()];
    }

    function getYear(dateStr) {
        return parseDate(dateStr).getFullYear();
    }

    function generateDateRange() {
        const dates = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = CONFIG.DATE_RANGE_DAYS; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            dates.push(formatDate(d));
        }

        return dates;
    }

    async function ensureYearLoaded(year) {
        if (yearCache.has(year)) return yearCache.get(year);

        let data;
        if (DriveStorage.isConnected()) {
            data = await DriveStorage.loadYear(year);
        } else {
            data = DriveStorage.createEmptyYearData(year);
        }

        yearCache.set(year, data);
        return data;
    }

    function getEntry(dateStr) {
        const year = getYear(dateStr);
        const yearData = yearCache.get(year);
        if (!yearData) return null;
        return yearData.entries[dateStr] || null;
    }

    function ensureEntry(dateStr) {
        const year = getYear(dateStr);
        const yearData = yearCache.get(year);
        if (!yearData) return null;

        if (!yearData.entries[dateStr]) {
            const promptIds = pickPromptIdsForDate(dateStr);
            yearData.entries[dateStr] = {
                promptIds,
                responses: {},
                freeWrite: '',
                updatedAt: new Date().toISOString(),
            };
        } else if (!yearData.entries[dateStr].promptIds?.length) {
            yearData.entries[dateStr].promptIds = pickPromptIdsForDate(dateStr);
        }

        return yearData.entries[dateStr];
    }

    function entryHasContent(entry) {
        if (!entry) return false;
        if (entry.freeWrite?.trim()) return true;
        return Object.values(entry.responses || {}).some(r =>
            (r.rating !== undefined && r.rating !== null) || (r.text && r.text.trim())
        );
    }

    function scheduleSave() {
        clearTimeout(saveTimer);
        setSyncStatus('Unsaved changes…', 'saving');
        saveTimer = setTimeout(saveCurrentYear, CONFIG.AUTOSAVE_DELAY_MS);
    }

    async function saveCurrentYear() {
        if (!DriveStorage.isConnected()) return;

        const year = getYear(selectedDate);
        const yearData = yearCache.get(year);
        if (!yearData) return;

        if (isSaving) {
            pendingSave = true;
            return;
        }

        isSaving = true;
        setSyncStatus('Saving…', 'saving');

        try {
            await DriveStorage.saveYear(year, yearData);
            setSyncStatus('Saved to Google Drive', 'saved');
            renderDateList();
        } catch (err) {
            setSyncStatus(`Save failed: ${err.message}`, 'error');
        } finally {
            isSaving = false;
            if (pendingSave) {
                pendingSave = false;
                scheduleSave();
            }
        }
    }

    function setSyncStatus(text, className = '') {
        const el = document.getElementById('syncStatus');
        el.textContent = text;
        el.className = 'sync-status' + (className ? ` ${className}` : '');
    }

    function setEntryStatus(text) {
        document.getElementById('entryStatus').textContent = text;
    }

    function renderDateList() {
        const container = document.getElementById('dateList');
        const dates = generateDateRange();
        container.innerHTML = '';

        dates.reverse().forEach(dateStr => {
            const btn = document.createElement('button');
            btn.className = 'date-item';
            btn.setAttribute('role', 'option');
            btn.dataset.date = dateStr;

            const entry = getEntry(dateStr);
            if (entryHasContent(entry)) btn.classList.add('has-entry');
            if (dateStr === selectedDate) btn.classList.add('active');

            btn.innerHTML = `
                <span class="date-label">${dateStr}</span>
                <span class="date-day">${getDayName(dateStr)}</span>
            `;

            btn.addEventListener('click', () => selectDate(dateStr));
            container.appendChild(btn);
        });

        const active = container.querySelector('.date-item.active');
        if (active) active.scrollIntoView({ block: 'center' });
    }

    function renderPrompts(entry) {
        const section = document.getElementById('promptsSection');
        section.innerHTML = '';

        const prompts = getPromptsForDate(selectedDate, entry.promptIds);

        prompts.forEach(prompt => {
            const card = document.createElement('div');
            card.className = 'prompt-card';
            card.dataset.promptId = prompt.id;

            const response = entry.responses[prompt.id] || {};

            if (prompt.type === 'rating') {
                const value = response.rating ?? 5;
                card.innerHTML = `
                    <h4>${escapeHtml(prompt.question)}</h4>
                    <div class="slider-group">
                        <div class="slider-labels">
                            <span>Bad</span>
                            <span>Good</span>
                        </div>
                        <input type="range" class="rating-slider" min="1" max="10" step="1" value="${value}">
                        <div class="rating-value">${value} — ${ratingLabel(value)}</div>
                    </div>
                `;

                const slider = card.querySelector('.rating-slider');
                const valueEl = card.querySelector('.rating-value');

                slider.addEventListener('input', () => {
                    const v = parseInt(slider.value, 10);
                    valueEl.textContent = `${v} — ${ratingLabel(v)}`;
                    updateResponse(prompt.id, { rating: v });
                });
            } else {
                card.innerHTML = `
                    <h4>${escapeHtml(prompt.question)}</h4>
                    <textarea class="prompt-textarea" placeholder="Write your thoughts…">${escapeHtml(response.text || '')}</textarea>
                `;

                const textarea = card.querySelector('.prompt-textarea');
                textarea.addEventListener('input', () => {
                    updateResponse(prompt.id, { text: textarea.value });
                });
            }

            section.appendChild(card);
        });
    }

    function updateResponse(promptId, data) {
        const entry = ensureEntry(selectedDate);
        if (!entry) return;

        entry.responses[promptId] = { ...entry.responses[promptId], ...data };
        entry.updatedAt = new Date().toISOString();
        setEntryStatus('Edited');
        scheduleSave();
    }

    async function selectDate(dateStr) {
        selectedDate = dateStr;
        const year = getYear(dateStr);
        await ensureYearLoaded(year);

        document.getElementById('selectedDate').textContent = dateStr;
        document.getElementById('selectedDay').textContent = getDayName(dateStr);

        const entry = ensureEntry(dateStr);
        renderPrompts(entry);

        const freeWrite = document.getElementById('freeWrite');
        freeWrite.value = entry.freeWrite || '';
        setEntryStatus(entryHasContent(entry) ? 'Has entries' : '');

        renderDateList();
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function showConnectedUI(connected) {
        document.getElementById('connectDriveBtn').classList.toggle('hidden', connected);
        document.getElementById('driveStatus').classList.toggle('hidden', !connected);
        document.getElementById('connectPrompt').classList.toggle('hidden', connected);
        document.getElementById('journalContent').classList.toggle('hidden', !connected);

        if (connected) {
            setSyncStatus('Connected', 'saved');
        } else {
            setSyncStatus('Not connected');
        }
    }

    async function onConnected() {
        showConnectedUI(true);
        yearCache.clear();
        const thisYear = new Date().getFullYear();
        await ensureYearLoaded(thisYear);
        await ensureYearLoaded(thisYear - 1);
        await selectDate(selectedDate);
        renderDateList();
    }

    function onDisconnected() {
        showConnectedUI(false);
        yearCache.clear();
        document.getElementById('promptsSection').innerHTML = '';
        document.getElementById('freeWrite').value = '';
    }

    function initTheme() {
        const themeToggleBtn = document.getElementById('themeToggle');
        const sunIcon = document.getElementById('sunIcon');
        const moonIcon = document.getElementById('moonIcon');

        if (document.documentElement.getAttribute('data-theme') === 'dark') {
            sunIcon.classList.remove('hidden');
            moonIcon.classList.add('hidden');
        }

        themeToggleBtn.addEventListener('click', () => {
            const html = document.documentElement;
            if (html.getAttribute('data-theme') === 'light') {
                html.setAttribute('data-theme', 'dark');
                sunIcon.classList.remove('hidden');
                moonIcon.classList.add('hidden');
            } else {
                html.setAttribute('data-theme', 'light');
                sunIcon.classList.add('hidden');
                moonIcon.classList.remove('hidden');
            }
        });
    }

    function bindEvents() {
        const connect = () => {
            if (!DriveStorage.isConfigured()) {
                alert('Set your Google Client ID in src/config.js first. See README.md for setup steps.');
                return;
            }
            DriveStorage.connect();
        };

        document.getElementById('connectDriveBtn').addEventListener('click', connect);
        document.getElementById('connectDriveBtnMain').addEventListener('click', connect);
        document.getElementById('disconnectDriveBtn').addEventListener('click', () => {
            DriveStorage.disconnect();
            onDisconnected();
        });

        document.getElementById('freeWrite').addEventListener('input', (e) => {
            const entry = ensureEntry(selectedDate);
            if (!entry) return;
            entry.freeWrite = e.target.value;
            entry.updatedAt = new Date().toISOString();
            setEntryStatus('Edited');
            scheduleSave();
        });
    }

    async function init() {
        initTheme();
        bindEvents();

        document.getElementById('selectedDate').textContent = selectedDate;
        document.getElementById('selectedDay').textContent = getDayName(selectedDate);

        if (!DriveStorage.isConfigured()) {
            showConnectedUI(false);
            setSyncStatus('Configure Google Client ID in config.js');
            renderDateList();
            return;
        }

        await DriveStorage.init(onConnected, (err) => {
            setSyncStatus(typeof err === 'string' ? err : 'Connection failed', 'error');
        });

        if (!DriveStorage.isConnected()) {
            showConnectedUI(false);
            renderDateList();
        }
    }

    return { init };
})();

document.addEventListener('DOMContentLoaded', () => App.init());
