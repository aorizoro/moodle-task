# MoodlePro – instructions for an AI coding agent (Codex, ChatGPT and others)

MoodlePro is a single-file student app for Machon Lev's Moodle (Hebrew first; English and French too), served by GitHub Pages.
The owner is Meir. You are almost certainly working for a helper on a FORK. `CONTRIBUTING.md` (Hebrew) is the human
guide; the rules below are binding for you. (`CLAUDE.md` holds the same rules for Claude.)

## Hard rules (a pull request that breaks them is rejected)
- Change files under `beta/` only. A pull request to `aorizoro/moodle-task` that touches anything else fails the
  "PR guard" check and will not be merged: the root (`index.html`, `sw.js`, `social.js`, `admin.js` = the app everyone
  uses), `push/` (the server), `.github/`, docs. In the helper's own fork anything may change, but only `beta/` comes back.
- Never push to, open branches on, or ask for access to `aorizoro/moodle-task`. Work in the fork; the helper opens the
  pull request himself from GitHub.
- Do not change `APP_VERSION`, the `CHANGES` list, `CHANGELOG.md` or `CACHE` in `beta/sw.js` – the owner does that when merging.
- Do not change `OFFICIAL`, `PUSH_URL`, `pushUrl()` or `fbPost`: any copy outside https://aorizoro.github.io automatically
  uses the TEST server `https://moodle-task-push-dev.aorizoro.workers.dev` (empty data) and never posts to the real feedback form.
- Never add code that sends data to a new place (no new fetch/XHR/beacon/WebSocket destinations, no analytics, no
  third-party scripts, fonts or CDNs), reads other users' data, or touches the Moodle token handling (the token only
  ever goes to the student's own Moodle site). No `eval`, no `innerHTML` with unescaped user or server text (use `esc()`).
- No new dependencies or build step: the app stays plain HTML + CSS + JavaScript in these files.

## How the app is built
- `beta/index.html` is one file: CSS (in `<style>`), then markup, then one big script. `beta/social.js` is the
  community (chats, points); it injects its own CSS from a template string near its end. `beta/admin.js` is admin-only – leave it alone.
- Every user-facing string lives in `I18N` with `he` / `en` / `fr` – add all three. Hebrew is RTL; use logical CSS
  (`margin-inline-start`, `inset-inline-end`, `text-align:start`) so both directions work.
- Storage: `LS` (localStorage, `mtb_` prefix in beta). Settings live in `P` and are saved with `savePrefs()`.
- Rendering: `render()`; the overview is a grid of cards (`DASH_CARDS`, `CARD_SZ`, `widgetOf`, `layoutDash`).

## Design decisions (read `DESIGN.md` first – binding)
- Before ANY change to how something looks, read `DESIGN.md` (Hebrew): almost every look in the app was asked for by students, with who and when.
- Never undo a decision listed there (e.g. the timetable blocks: line order name → hours → type → place, the "view and order" options, ttFit so nothing is cut, big blocks by default).
  If you think one is wrong, stop and ask the owner (Meir) with before/after screenshots. A pull request that silently reverses one is sent back.
- Improve, don't replace: keep the layout, places of buttons and features students already know.

## Design work (the usual job on this fork)
- Colours are CSS variables on `:root` (`--bg`, `--card`, `--text`, `--muted`, `--line`, `--accent`, `--accent-d`,
  `--accent-soft`, `--ok`, `--warn`, `--err`, …) with a dark set under `@media (prefers-color-scheme: dark)`.
  Use the variables, never hard-coded colours, so every theme keeps working.
- Themes are the `THEMES` list at the top of the script (`applyTheme()` sets the variables). A new theme = a new entry
  with `he` / `en` / `fr` names and its colours; keep text contrast at least 4.5:1.
- Icons are an inline SVG sprite: `<symbol id="i-<name>">` in the markup, used as `ic("<name>")`. A new icon = a new
  `<symbol>` (24×24, stroke `currentColor`, like the others). The logo and app icons are `beta/logo.svg` and the PNGs in `beta/`.
- Font: the system font stack on `body` (no web fonts may be loaded from outside).
- Keep touch targets at least 40px, and keep `font-size` of inputs at 16px or more on phones (iPhone zooms otherwise).

## Before you say a change is done
- Check it at a phone width (~400px) and a computer width (~1400px), light and dark, in Hebrew (RTL) and English (LTR).
- The page must open with no errors in the browser console. `node -e "new Function(require('fs').readFileSync('beta/social.js','utf8'))"` must pass.
- One feature or one design area per pull request (e.g. "colours and themes", "the tab bar", "task cards"), small
  enough to review, with what changed, how to check it, and before/after screenshots.
- Sync the fork with `aorizoro/moodle-task` `main` before starting each change: beta changes almost every day.
