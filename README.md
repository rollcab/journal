# Journal

A simple brain-dump journal built with plain HTML, CSS, and JavaScript. Entries auto-save to Google Drive so you can pick up anywhere.

## Features

- Dark and light mode
- Scrollable date sidebar (`yyyy-MM-dd` with day name)
- 120 journaling prompts — 3 shown per day
- Prompts are stable per date (same date always shows the same 3)
- Rating sliders (bad → good) and open text prompts
- Free-write area for unstructured brain dumps
- Auto-save to Google Drive in a `.journal` folder (one JSON file per year)

## Quick start

1. Open `src/index.html` in a browser, or serve the folder locally:

```bash
cd src && python3 -m http.server 8080
```

2. Configure Google Drive (required for saving):

### Google Cloud setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or use an existing one)
3. Enable the **Google Drive API**
4. Go to **APIs & Services → Credentials**
5. Create an **OAuth 2.0 Client ID** (Web application)
6. Add authorized JavaScript origins:
   - `http://localhost:8080` (local dev)
   - Your GitHub Pages URL, e.g. `https://yourusername.github.io`
7. Copy the Client ID into `src/config.js`:

```js
const CONFIG = {
    GOOGLE_CLIENT_ID: 'your-client-id.apps.googleusercontent.com',
    // ...
};
```

8. If the app is for personal use, add your Google account as a **Test user** under OAuth consent screen (while in Testing mode).

### Connect and write

1. Click **Connect Google Drive**
2. Authorize the app (it only accesses files it creates in `.journal`)
3. Pick a date, answer the prompts, and write freely — changes save automatically

## Data format

Each year is stored as `.journal/YYYY.json`:

```json
{
  "version": 1,
  "year": 2026,
  "entries": {
    "2026-07-19": {
      "promptIds": [75, 77, 98],
      "responses": {
        "75": { "rating": 8 },
        "77": { "rating": 6 },
        "98": { "text": "A new possibility opened up when..." }
      },
      "freeWrite": "Brain dump text here...",
      "updatedAt": "2026-07-19T18:30:00.000Z"
    }
  }
}
```

## Deploy to GitHub Pages

Push to `main` — the included workflow deploys the `src/` folder automatically. Add your Pages URL as an authorized JavaScript origin in Google Cloud.

## License

See [LICENSE](LICENSE).
