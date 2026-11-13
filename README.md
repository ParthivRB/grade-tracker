# Grade Tracker

One file: `index.html`. No build step, no database. Open it in a browser and it works.

The page starts with your classes but no scores. Anything you enter is saved in your browser on that device. The page has a "Download backup file" button at the bottom for moving to another device or keeping a copy.

## Put it online with GitHub Pages (free)

1. Make a new repo on GitHub, for example `grade-tracker`.
2. Upload `index.html` to the repo (Add file, then Upload files).
3. In the repo, go to Settings, then Pages. Set Source to "Deploy from a branch", pick `main` and `/ (root)`, and save.
4. After a minute your page is live at `https://YOUR-USERNAME.github.io/grade-tracker/`.

## Updating it

- **Scores and what-ifs:** just type in the page. It saves on that device.
- **New semester, new classes, design changes:** open the repo in Claude Code and ask it to edit `index.html`, then commit and push. GitHub Pages updates on its own.
- **Loading your grades:** click "Upload grade file" and pick your grades `.json` file (scores and past semesters). Keep that file on your computer, never in this repo.
- **Moving to another device:** click "Download backup file" on the old one, then "Upload grade file" on the new one.

Note: saved scores live in each browser separately. This repo is public, so keep scores out of `index.html` and use backup files to move them between devices.
