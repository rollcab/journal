const DriveStorage = (() => {
    const SCOPES = 'https://www.googleapis.com/auth/drive.file';
    const DRIVE_API = 'https://www.googleapis.com/drive/v3';
    const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

    let accessToken = null;
    let tokenClient = null;
    let journalFolderId = null;
    const yearFiles = new Map();

    function isConfigured() {
        return CONFIG.GOOGLE_CLIENT_ID &&
            !CONFIG.GOOGLE_CLIENT_ID.startsWith('YOUR_GOOGLE_CLIENT_ID');
    }

    function isConnected() {
        return !!accessToken;
    }

    function getStoredToken() {
        try {
            const raw = localStorage.getItem('journal_drive_token');
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (data.expiresAt && Date.now() > data.expiresAt) {
                localStorage.removeItem('journal_drive_token');
                return null;
            }
            return data.token;
        } catch {
            return null;
        }
    }

    function storeToken(token, expiresInSeconds = 3600) {
        localStorage.setItem('journal_drive_token', JSON.stringify({
            token,
            expiresAt: Date.now() + (expiresInSeconds - 60) * 1000,
        }));
        accessToken = token;
    }

    function clearToken() {
        localStorage.removeItem('journal_drive_token');
        accessToken = null;
        journalFolderId = null;
        yearFiles.clear();
    }

    async function apiRequest(path, options = {}) {
        if (!accessToken) throw new Error('Not connected to Google Drive');

        const response = await fetch(`${DRIVE_API}${path}`, {
            ...options,
            headers: {
                Authorization: `Bearer ${accessToken}`,
                ...(options.body ? { 'Content-Type': 'application/json' } : {}),
                ...options.headers,
            },
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || `Drive API error (${response.status})`);
        }

        if (response.status === 204) return null;
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) return response.json();
        return response.text();
    }

    async function ensureJournalFolder() {
        if (journalFolderId) return journalFolderId;

        const query = encodeURIComponent(
            `name='${CONFIG.JOURNAL_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
        );
        const list = await apiRequest(`/files?spaces=drive&fields=files(id,name)&q=${query}`);

        if (list.files && list.files.length > 0) {
            journalFolderId = list.files[0].id;
            return journalFolderId;
        }

        const created = await apiRequest('/files', {
            method: 'POST',
            body: JSON.stringify({
                name: CONFIG.JOURNAL_FOLDER,
                mimeType: 'application/vnd.google-apps.folder',
            }),
        });
        journalFolderId = created.id;
        return journalFolderId;
    }

    function yearFileName(year) {
        return `${year}.json`;
    }

    async function getYearFileMeta(year) {
        if (yearFiles.has(year)) return yearFiles.get(year);

        const folderId = await ensureJournalFolder();
        const fileName = yearFileName(year);
        const query = encodeURIComponent(
            `name='${fileName}' and '${folderId}' in parents and trashed=false`
        );
        const list = await apiRequest(`/files?spaces=drive&fields=files(id,name,modifiedTime)&q=${query}`);

        const meta = list.files && list.files.length > 0 ? list.files[0] : null;
        yearFiles.set(year, meta);
        return meta;
    }

    async function loadYear(year) {
        const meta = await getYearFileMeta(year);
        if (!meta) {
            return createEmptyYearData(year);
        }

        const content = await fetch(
            `${DRIVE_API}/files/${meta.id}?alt=media`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!content.ok) throw new Error('Failed to load journal file');

        const text = await content.text();
        try {
            return JSON.parse(text);
        } catch {
            return createEmptyYearData(year);
        }
    }

    async function uploadFileContent(fileId, content) {
        const response = await fetch(`${UPLOAD_API}/files/${fileId}?uploadType=media`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
            body: content,
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error?.message || 'Failed to update journal file');
        }
    }

    async function saveYear(year, data) {
        await ensureJournalFolder();
        const fileName = yearFileName(year);
        const body = JSON.stringify(data, null, 2);
        const meta = await getYearFileMeta(year);

        if (meta) {
            await uploadFileContent(meta.id, body);
        } else {
            const created = await apiRequest('/files', {
                method: 'POST',
                body: JSON.stringify({
                    name: fileName,
                    parents: [journalFolderId],
                    mimeType: 'application/json',
                }),
            });

            await uploadFileContent(created.id, body);
            yearFiles.set(year, { id: created.id, name: fileName });
        }
    }

    function createEmptyYearData(year) {
        return {
            version: 1,
            year,
            entries: {},
        };
    }

    function waitForGoogle() {
        return new Promise((resolve, reject) => {
            if (window.google?.accounts?.oauth2) {
                resolve();
                return;
            }

            let attempts = 0;
            const interval = setInterval(() => {
                attempts++;
                if (window.google?.accounts?.oauth2) {
                    clearInterval(interval);
                    resolve();
                } else if (attempts > 50) {
                    clearInterval(interval);
                    reject(new Error('Google Identity Services failed to load'));
                }
            }, 100);
        });
    }

    async function init(onConnect, onError) {
        if (!isConfigured()) return false;

        await waitForGoogle();

        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CONFIG.GOOGLE_CLIENT_ID,
            scope: SCOPES,
            callback: async (response) => {
                if (response.error) {
                    onError?.(response.error);
                    return;
                }
                storeToken(response.access_token, response.expires_in);
                try {
                    await ensureJournalFolder();
                    onConnect?.();
                } catch (err) {
                    onError?.(err.message);
                }
            },
        });

        const stored = getStoredToken();
        if (stored) {
            accessToken = stored;
            try {
                await ensureJournalFolder();
                onConnect?.();
                return true;
            } catch {
                clearToken();
            }
        }

        return false;
    }

    function connect() {
        if (!tokenClient) throw new Error('Google Drive not initialized');
        tokenClient.requestAccessToken({ prompt: 'consent' });
    }

    function disconnect() {
        if (accessToken && window.google?.accounts?.oauth2) {
            google.accounts.oauth2.revoke(accessToken, () => {});
        }
        clearToken();
    }

    return {
        init,
        connect,
        disconnect,
        isConnected,
        isConfigured,
        loadYear,
        saveYear,
        createEmptyYearData,
    };
})();
