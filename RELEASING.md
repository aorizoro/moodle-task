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
4. **Tag.** `git tag vX.Y.Z && git push --tags`. To roll back: copy the files from the previous tag.

Version numbers: `MAJOR.MINOR.PATCH` — PATCH for fixes, MINOR for new features, MAJOR for changes
that need users to do something (reconnect, re-import).
