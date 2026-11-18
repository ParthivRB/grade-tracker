# Tally

One file: `index.html`. No build step, no accounts, no server. Everything you enter stays in your own browser.

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

## Sync your phone and computer

Open **Sync across devices** at the bottom of the home page and follow the three steps. It keeps your data in a **private** GitHub repo that only you can see, using a fine-grained token limited to that one repo (Contents: read and write). Changes upload a couple of seconds after you make them, and other devices pull them when you open the app. If two devices edit at the same time, the newest edit wins. Nothing is sent anywhere until you connect, and the token is only stored in that browser.

## Backups

Your data lives in this browser on this device. Use "Download backup file" now and then, and "Upload a grade file" on another device. Loading a file replaces what is saved in that browser.

## Put it online with GitHub Pages (free)

1. Make a public repo on GitHub and upload `index.html` (plus the icon files).
2. Settings, Pages, deploy from the `main` branch root.
3. Keep your own scores out of a public repo. Use backup files for those.
