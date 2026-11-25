# MoodlePro – notes for an AI assistant working in this repository

MoodlePro is a single-file student app for Machon Lev's Moodle (Hebrew first; English and French too), served by GitHub Pages.
The owner is Meir. Read `CONTRIBUTING.md` (Hebrew) for the human workflow; the rules below are binding for you. `AGENTS.md` holds the same rules (plus design notes) for other AI agents such as Codex.

## If you are working for a helper (on a fork)
- Change files under `beta/` only. A pull request touching anything else fails the "PR guard" check and will not be merged:
  the root (`index.html`, `sw.js`, `social.js`, `admin.js` = the app everyone uses), `push/` (the Cloudflare server), `.github/`, docs.
- Do not change `APP_VERSION`, the `CHANGES` list, `CHANGELOG.md` or `CACHE` in `beta/sw.js` – the owner's side does that when merging.
- Your copy (any origin other than https://aorizoro.github.io) automatically uses the TEST server
  `https://moodle-task-push-dev.aorizoro.workers.dev` (empty data) and never posts to the real feedback form. Do not change that logic (`OFFICIAL`, `PUSH_URL`, `fbPost`).
- Never add code that sends data to a new place, reads other users' data, or weakens the token handling (the Moodle token only ever goes to the student's own Moodle site).
- Open one pull request per feature against `aorizoro/moodle-task` `main`, with what it does, how to test it, and a screenshot. Sync the fork first.

## Design decisions (read `DESIGN.md` first – binding)
- Before ANY change to how something looks, read `DESIGN.md` (Hebrew): almost every look in the app was asked for by students, with who and when.
- Never undo a decision listed there (e.g. the timetable blocks: line order name → hours → type → place, the "view and order" options, ttFit so nothing is cut, big blocks by default).
  If you think one is wrong, stop and ask the owner (Meir) with before/after screenshots. A pull request that silently reverses one is sent back.
- Improve, don't replace: keep the layout, places of buttons and features students already know.

## How the app is built (beta/index.html)
- One HTML file: CSS, then markup, then one script. `I18N` holds every user-facing string in `he` / `en` / `fr` – add all three.
- Storage: `LS` (localStorage with the `mtb_` prefix in beta). Settings live in `P` and are saved with `savePrefs()`; keys in `SYNC_KEYS` sync between the user's devices through their own Moodle private files.
- Moodle calls: `call(wsfunction, params)`. Rendering: `render()`; the overview is a grid of cards (`DASH_CARDS`, `CARD_SZ`, `widgetOf`, `layoutDash`).
- The community (`beta/social.js`) talks to the server through `pushUrl()` + `/social/*`.
- Test on a phone width (~400px) and a computer width, light and dark, in Hebrew (RTL) and English (LTR).
