# Tally

Plain HTML, CSS and JavaScript. No build step, no accounts, no server. Everything you enter stays in your own browser.

## Using it

- **Semesters:** click the semester name at the top to switch, add a new one (optionally copying your classes), rename it, or mark it finished so it counts toward your cumulative GPA. Old semesters are never deleted when you switch.
- **Classes:** add a class from the home page, then press **Edit class** to change its name, grading scale, categories, and how each category is scored.
- **Scoring options per category:** average, total points, only the best N count, capped points, optional items that replace your lowest score, drop the lowest N, and let flagged items (like a final) replace your lowest score.
- **Current grade** is the big number. **What-if** sits beside it and replaces the earned score. **Projected final** (the rest of the work at a level you choose) is at the bottom.
- **Extra credit** takes points and percent at the same time, each with its own what-if.
- **Style:** the color-wheel button picks a style and a main color. Each class page has its own color dots. The moon button switches dark mode.

## Bring in old grades

On the home page, open "Bring in old grades with Claude or ChatGPT", copy the prompt, and give it to an AI chat along with screenshots, a PDF, or a spreadsheet of your grades. It returns a file. Use **Upload a grade file** to load it.

## Install it like an app

It's an installable web app that also works offline.
- **iPhone:** open the site in Safari, then Share, then **Add to Home Screen**.
- **Android:** Chrome, then **Install app**.
- **Mac or PC:** Chrome or Edge show an install icon in the address bar.

## Connect Canvas

Canvas does not let websites read it directly, so Tally uses a small browser extension (Chrome, Edge, Brave, Arc, on a computer). It runs inside your own signed-in Canvas tab, so there is no token and no password, and nothing is sent to any server.

1. In Tally, open **Backup and reset**, choose **Import from Canvas**, and download the extension.
2. Unzip it. Open `chrome://extensions`, turn on Developer mode, click **Load unpacked**, and choose the folder.
3. Open your Canvas, click the Tally icon, and press **Sync with Tally**. Your browser asks once for permission to read that one Canvas site.

Tally builds a class for each Canvas course and a section for each assignment group (with weights and drop-lowest rules), and fills in every grade already posted. After that, visiting Canvas refreshes your grades in the background (at most every 20 minutes). New assignments go into the matching section and new grades fill in. Your own what-ifs, curves and renames are kept, and every update can be undone. You can switch automatic updates off and Tally will just tell you there is something to review.

The extension lives in `extension/`. After changing `js/canvas.js`, run `node tools/build-extension.js` to refresh its copy of the reader and the download zip.

## Move to another device

The simple way: open **Backup and reset**, tap **Save backup** (on a phone this opens the share sheet), send the file to yourself, then tap **Restore from file** on the other device.

## Automatic sync (advanced)

Open **Automatic sync (advanced)** at the bottom of the home page and follow the three steps. It keeps your data in a **private** GitHub repo that only you can see, using a fine-grained token limited to that one repo (Contents: read and write). Changes upload a couple of seconds after you make them, and other devices pull them when you open the app. If two devices edit at the same time, the newest edit wins. Nothing is sent anywhere until you connect, and the token is only stored in that browser.

## Backups

Your data lives in this browser on this device. Use **Save backup** now and then, and **Restore from file** on another device. Loading a file replaces what is saved in that browser.

## Put it online with GitHub Pages (free)

1. Make a public repo on GitHub and upload `index.html` (plus the icon files).
2. Settings, Pages, deploy from the `main` branch root.
3. Keep your own scores out of a public repo. Use backup files for those.

## Project layout

- `index.html`: the page shell.
- `styles.css`: all styles.
- `js/core.js`: grade scales, data shape and the grade engine (no screen code).
- `js/canvas.js`: the Canvas reader and the smart merge. No screen code.
- `js/canvasui.js`: the Canvas screens and the link to the extension.
- `extension/`: the Tally for Canvas browser extension. `tools/build-extension.js` builds its reader and the zip.
- `js/ui.js`: saving, home screen, sync, events, dialogs.
- `js/features.js`: trends, undo, what-if popup, calendar, class editing, themes.
- `js/tour.js`: first-run tour and setup.
- `js/main.js`: privacy toggle and startup.
- `tests/`: grade-math, Canvas-import and extension tests. Run `node tests/engine.test.js`, `node tests/canvas.test.js` and `node tests/extension.test.js` (needs Node, nothing to install).

Deleting a class, semester, section, item, event or day off shows a 10-second **Undo**.
