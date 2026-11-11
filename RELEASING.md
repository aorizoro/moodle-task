# How a release goes out

1. **Build in beta.** Changes go to `beta/` only (served at `/moodle-task/beta/`).
   In `beta/index.html` set `APP_VERSION` to the next version with a `-beta.N` suffix and add the
   user-facing lines to `CHANGES` (Hebrew, English, French). Bump `CACHE` in `beta/sw.js`.
2. **Test.** Open `/moodle-task/beta/` on a phone and a computer. The beta copies the regular app's
   data on this device once, then keeps its own (`mtb_` keys), so testing never touches real data.
   It shows a BETA tag and installs as a separate app ("משימות β").
3. **Promote.** Copy `beta/index.html` and `beta/sw.js` to the root, drop the `-beta.N` suffix
   from `APP_VERSION`, bump `CACHE` in the root `sw.js`, and move the CHANGELOG entry out of "בבדיקה".
   Users see "מה חדש" once after the update.
4. **Keep the version.** Push the released commit as a branch: `git push origin HEAD:refs/heads/release-X.Y.Z`
   (`release-1.0.0` is the first). To roll back: copy `index.html` and `sw.js` from the previous
   release branch to the root and bump `CACHE`.
5. **Update the system map.** The Claude Doc "MoodlePro – מפת המערכת"
   (https://claude.ai/artifact/1oa3V3CyavZvAwBTiJ1aSB) describes the whole system for people and for other AIs.
   On every release: add a row to "היסטוריית גרסאות", update "מצב נכון ל:" at the top, and fix any section
   the release changed (screens, settings keys, reminders, worker endpoints, limits).

"מה חדש" opens only for versions that have an entry in `CHANGES` inside `index.html`. A fix-only release
(PATCH) gets no entry there, so it updates quietly; it still goes into CHANGELOG.md.

Version numbers: `MAJOR.MINOR.PATCH` — PATCH for fixes, MINOR for new features, MAJOR for changes
that need users to do something (reconnect, re-import).
