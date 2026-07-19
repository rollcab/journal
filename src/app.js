const App = (() => {
    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const yearCache = new Map();
    let selectedDate = formatDate(new Date());
    let calendarViewYear = new Date().getFullYear();
    let calendarViewMonth = new Date().getMonth();
    let saveTimer = null;
    let saveCountdownTimer = null;
    let saveCountdownEnd = 0;
    let saveAttemptCount = 0;
    let hasUnsavedChanges = false;
    let autoSaveScheduled = false;
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

    function clearSaveCountdown() {
        clearInterval(saveCountdownTimer);
        saveCountdownTimer = null;
    }

    function updateSaveStats(text) {
        const el = document.getElementById('saveStats');
        if (!text) {
            el.classList.add('hidden');
            el.textContent = '';
            return;
        }
        el.textContent = text;
        el.classList.remove('hidden');
    }

    function formatCountdown(ms) {
        const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
        return `${seconds}s`;
    }

    function clearAutoSaveTimer() {
        clearTimeout(saveTimer);
        saveTimer = null;
        clearSaveCountdown();
        autoSaveScheduled = false;
    }

    function markDirty() {
        hasUnsavedChanges = true;
        setSyncStatus('Unsaved changes…', 'saving');
        updateSaveButton();
        scheduleAutoSave();
    }

    function scheduleAutoSave() {
        if (autoSaveScheduled || !DriveStorage.isConnected() || !hasUnsavedChanges) return;

        autoSaveScheduled = true;
        saveCountdownEnd = Date.now() + CONFIG.AUTOSAVE_DELAY_MS;
        updateSaveStats(`Auto-save in ${formatCountdown(CONFIG.AUTOSAVE_DELAY_MS)} · attempt #${saveAttemptCount + 1}`);

        saveCountdownTimer = setInterval(() => {
            const remaining = saveCountdownEnd - Date.now();
            if (remaining <= 0) {
                clearSaveCountdown();
                return;
            }
            updateSaveStats(`Auto-save in ${formatCountdown(remaining)} · attempt #${saveAttemptCount + 1}`);
        }, 1000);

        saveTimer = setTimeout(async () => {
            autoSaveScheduled = false;
            if (hasUnsavedChanges) await saveCurrentYear(false);
        }, CONFIG.AUTOSAVE_DELAY_MS);
    }

    function updateSaveButton() {
        const btn = document.getElementById('saveBtn');
        btn.disabled = isSaving || !hasUnsavedChanges;
    }

    async function saveNow() {
        if (!DriveStorage.isConnected() || isSaving) return;
        clearAutoSaveTimer();
        await saveCurrentYear(true);
    }

    async function saveCurrentYear(isManual = false) {
        if (!DriveStorage.isConnected()) return;
        if (!isManual && !hasUnsavedChanges) return;

        const year = getYear(selectedDate);
        const yearData = yearCache.get(year);
        if (!yearData) return;

        if (isSaving) {
            pendingSave = true;
            return;
        }

        saveAttemptCount++;
        isSaving = true;
        updateSaveButton();
        setSyncStatus(isManual ? 'Saving…' : 'Auto-saving…', 'saving');
        updateSaveStats(`${isManual ? 'Manual' : 'Auto'} save attempt #${saveAttemptCount}`);

        const startedAt = Date.now();

        try {
            await DriveStorage.saveYear(year, yearData);
            const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
            hasUnsavedChanges = false;
            setSyncStatus('Saved to Google Drive', 'saved');
            updateSaveStats(`Saved on attempt #${saveAttemptCount} · ${elapsed}s`);
            renderDateList();
            renderCalendar();
        } catch (err) {
            setSyncStatus(`Save failed: ${err.message}`, 'error');
            updateSaveStats(`Failed on attempt #${saveAttemptCount}`);
            scheduleAutoSave();
        } finally {
            isSaving = false;
            updateSaveButton();
            if (pendingSave) {
                pendingSave = false;
                await saveCurrentYear(isManual);
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
        markDirty();
        renderCalendar();
    }

    function syncCalendarToDate(dateStr) {
        const d = parseDate(dateStr);
        calendarViewYear = d.getFullYear();
        calendarViewMonth = d.getMonth();
    }

    async function renderCalendar() {
        const grid = document.getElementById('calendarGrid');
        const title = document.getElementById('calendarTitle');
        if (!grid || !title) return;

        if (DriveStorage.isConnected()) {
            await ensureYearLoaded(calendarViewYear);
        }

        title.textContent = `${MONTH_NAMES[calendarViewMonth]} ${calendarViewYear}`;

        const firstDay = new Date(calendarViewYear, calendarViewMonth, 1);
        const daysInMonth = new Date(calendarViewYear, calendarViewMonth + 1, 0).getDate();
        const startOffset = firstDay.getDay();
        const todayStr = formatDate(new Date());

        grid.innerHTML = '';

        for (let i = 0; i < startOffset; i++) {
            const empty = document.createElement('div');
            empty.className = 'calendar-day empty';
            empty.setAttribute('aria-hidden', 'true');
            grid.appendChild(empty);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const month = String(calendarViewMonth + 1).padStart(2, '0');
            const dayStr = String(day).padStart(2, '0');
            const dateStr = `${calendarViewYear}-${month}-${dayStr}`;

            const btn = document.createElement('button');
            btn.className = 'calendar-day';
            btn.type = 'button';
            btn.textContent = day;
            btn.title = dateStr;

            if (entryHasContent(getEntry(dateStr))) btn.classList.add('journaled');
            if (dateStr === selectedDate) btn.classList.add('selected');
            if (dateStr === todayStr) btn.classList.add('today');

            btn.addEventListener('click', () => selectDate(dateStr));
            grid.appendChild(btn);
        }
    }

    function shiftCalendarMonth(delta) {
        calendarViewMonth += delta;
        if (calendarViewMonth > 11) {
            calendarViewMonth = 0;
            calendarViewYear++;
        } else if (calendarViewMonth < 0) {
            calendarViewMonth = 11;
            calendarViewYear--;
        }
        renderCalendar();
    }

    async function selectDate(dateStr) {
        selectedDate = dateStr;
        syncCalendarToDate(dateStr);
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
        renderFactForDate(dateStr);
        renderCalendar();
    }

    function renderFactForDate(dateStr) {
        const fact = getFactForDate(dateStr);
        document.getElementById('factText').textContent = fact.text;
        document.getElementById('factSource').textContent = fact.source ? `— ${fact.source}` : '';
    }

    function setUserDisplay(profile) {
        document.getElementById('userName').textContent = profile?.name || 'User';
        document.getElementById('userEmail').textContent = profile?.email || '';
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
        document.getElementById('saveBtn').classList.toggle('hidden', !connected);

        if (connected) {
            setSyncStatus(hasUnsavedChanges ? 'Unsaved changes…' : 'Connected', hasUnsavedChanges ? 'saving' : 'saved');
            updateSaveStats(saveAttemptCount ? `Save attempts this session: ${saveAttemptCount}` : '');
            updateSaveButton();
        } else {
            setSyncStatus('Not connected');
            updateSaveStats('');
        }
    }

    async function onConnected(profile) {
        setUserDisplay(profile || DriveStorage.getUserProfile());
        showConnectedUI(true);
        yearCache.clear();
        const thisYear = new Date().getFullYear();
        await ensureYearLoaded(thisYear);
        await ensureYearLoaded(thisYear - 1);
        await selectDate(selectedDate);
        renderDateList();
    }

    function onDisconnected() {
        clearAutoSaveTimer();
        saveAttemptCount = 0;
        hasUnsavedChanges = false;
        updateSaveStats('');
        setUserDisplay(null);
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
        document.getElementById('logoutBtn').addEventListener('click', () => {
            DriveStorage.disconnect();
            onDisconnected();
        });

        document.getElementById('saveBtn').addEventListener('click', saveNow);

        document.getElementById('calendarPrev').addEventListener('click', () => shiftCalendarMonth(-1));
        document.getElementById('calendarNext').addEventListener('click', () => shiftCalendarMonth(1));

        document.getElementById('freeWrite').addEventListener('input', (e) => {
            const entry = ensureEntry(selectedDate);
            if (!entry) return;
            entry.freeWrite = e.target.value;
            entry.updatedAt = new Date().toISOString();
            setEntryStatus('Edited');
            markDirty();
            renderCalendar();
        });
    }

    async function init() {
        initTheme();
        bindEvents();

        syncCalendarToDate(selectedDate);
        document.getElementById('selectedDate').textContent = selectedDate;
        document.getElementById('selectedDay').textContent = getDayName(selectedDate);
        renderFactForDate(selectedDate);
        renderCalendar();

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
