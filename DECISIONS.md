# DECISIONS

1. **Vanilla JS instead of React + Vite + TypeScript.** The build sandbox had no network, so npm packages could not be installed. The spec allows equivalents that stay free and serverless. Result: zero build step, deploys as plain static files. File layout mirrors the spec (`syllabus.js` = data, `planner.js`, `storage.js`, `dates.js`, `app.js` = state + views).
2. **Fonts:** system font stack (no CDN, offline-first).
3. **Routing:** hash-based mini-router (`#/today`, `#/plan`, ...), so the phone's back button works.
4. **Extra state fields:** `studiedOn` (date a chapter was first completed, drives +1/+3/+7 revisions on rebuild) and `pinned` ("Study next" queue-jumpers). Tasks also carry `prev` (status at generation) and `rev` (1/2/3 for spaced revisions).
5. **Split chapters:** a chapter that spans several days becomes Done only when all its parts are ticked; until then it is In progress.
6. **Done tasks in the future are kept on rebuild** (getting ahead isn't undone). Their minutes count against that day's capacity.
7. **Revision budget:** in the learning phase, due revisions take at most ~50% of a day (at least one 45-min slot) so a backlog can't starve new study; leftovers carry to the next day.
8. **Spare time:** days with leftover minutes get extra revision of finished chapters (oldest-revised first); once the study queue is empty, a weekly mock is added.
9. **Mock length:** 180 min, or the day's capacity if smaller (titled "Timed mock test (N min)").
10. **Tie-break:** equal priority → easier chapter first, then syllabus order (this gives the spec's §5.7 example: Modern Physics, then Current Electricity).
11. **Overflow warning:** if not every chapter fits before the revision phase, the dashboard says how many don't (honest, not hidden).
12. **Export format:** `{ app: "scoreplan", version: 1, exportedAt, state }`.

## Tests
`node test/planner.test.js` checks the §5.7 worked example and the §11 plan rules across 11 scenarios (1–120 days, 1–10 hrs/day).

## Service worker cache (added 22 Nov 2026)
18. **Bump `CACHE` in `sw.js` on every release.** The worker is cache-first and the browser only picks up a new worker when `sw.js` itself changes bytes. v2 shipped with the cache name still at `scoreplan-v1.0`, so phones that had visited v1 kept serving the old files and the new exam packs never appeared. Rule: every deploy that changes app files must also bump the cache name.

## Tab fix (22 Nov 2026)
19. **Tabs needed two taps because `go()` never rendered on the first one.** It set `ui.route` and changed the hash, leaving the redraw to the `hashchange` handler — but that handler skips rendering when the route already matches, which it always did by then. The second tap hit the `else render()` branch. Fix: `go()` now always calls `render()` itself; the `hashchange` handler still covers back/forward navigation.

## Google sign-in (23 Nov 2026)
20. **Google sign-in via Firebase Auth, free Spark plan.** Google sign-in is free up to 50,000 monthly active users, no card needed (only phone/SMS needs Blaze). Do NOT upgrade the project to Identity Platform — on Spark that caps sign-ins at 3,000 daily active users. Implementation: Firebase v10 compat SDK via CDN (classic scripts, matches the no-build style), redirect flow (popups are blocked in installed PWAs), one Firestore doc per user (`users/{uid}`, `{ state, updatedAt }`), last-write-wins by `updatedAt`, watermark in `scoreplan-sync-v1`. First sync on a device that already has a plan asks which plan to keep, so nothing is lost silently. Sign-in is optional — the app works fully offline without it, and if the SDK can't load (offline) the Account section says so instead of breaking. Setup is manual: create the project, enable the Google provider, add `ishantsil56-cell.github.io` as an authorized domain, create Firestore + paste `firestore.rules`, paste the web config into `firebase-config.js` (values are public client identifiers, not secrets).

## Exam packs (JEE Main / JEE Advanced / NEET UG)
13. One pack per exam in `syllabus.js` (same shape: subjects, chapters with weightage + difficulty). Chapter IDs are prefixed per pack (`adv-…`, `neet-…`) so nothing collides.
14. **NEET UG subjects:** Physics, Chemistry, Botany, Zoology (4 subjects, each weighted equally as 180/720 marks). Weightage-covered % averages across all four.
15. **Switching exam wipes chapters + plan** (each exam has different chapters). Settings asks for confirmation and suggests exporting a backup first. Old backups without `examType` load as JEE Main.
16. **Default exam dates are placeholders** (JEE Adv 23 May 2027, NEET 2 May 2027). Confirm against the official schedule and change them in onboarding/Settings.
17. **Weightage for Advanced and NEET is my own approximate estimate**, not scraped from official data. Each subject is normalised to 100. Treat it as editable starter data.

21. **Firebase config filled in 2026-11-23** (project `scoreplan-a080f`, Standard edition, Spark plan). The config was pasted by the user from the console — reading it off a screenshot misread two capital O's as zeros, so always take the config as pasted text, never from a screenshot. SW cache bumped to v2.3 in the same release so installed PWAs pick up the filled-in config (rule 18).

22. **Sign-in-first gate + visible sign-in errors (2026-11-23).** The app now opens on a sign-in screen when Firebase is configured and the user is signed out; a "Continue without signing in" link (remembered in localStorage) keeps the app usable offline, and sign-in stays available in Settings → Account. The gate never shows when Firebase isn't set up or the SDK can't load. Bug fixed in the same change: a failed sign-in used to fail silently — the error only reached `#sync-status`, which doesn't exist in the signed-out view — so the app just showed "Sign in" again. Sign-in errors are now shown in plain words on the sign-in screen and in the Account card (auth.js `friendlyError` maps the common codes: provider not enabled, unauthorized domain, network, storage blocked). A 4s timeout stops the Loading screen from hanging if Firebase never reports the auth state. The account is the source of truth once signed in: every change pushes to Firestore (debounced 1.5s), sign-in pulls the cloud copy, and the browser copy is only an offline cache. SW cache v2.4.

23. **Redirect-return gap (2026-11-23).** After picking a Google account the app still showed "Sign in": the redirect can finish in the browser while the app window stays stale, and the stale window never re-reads the auth state. Fixes: `SPAuth.refresh()` re-reads `auth.currentUser` and reports a change; the app calls it on `visibilitychange` and window `focus`; the sign-in screen has an "Already signed in? Tap here to check" button that refreshes and reloads if still signed out (a reload re-reads the session from storage); `getRedirectResult` success sets a flag so a redirect return shows a "Signed in as …" toast once. SW cache v2.5.

24. **Popup-first sign-in + lost-redirect detection (2026-11-23).** Diagnosis: the redirect flow was silently evaporating — the Google picker appeared and returned with no error, but no session existed, and reload/check-again changed nothing. Cause: the redirect returned to a different tab than the one that started it, and the SDK's pending-redirect record lives in sessionStorage, which is per-tab — so `getRedirectResult` resolved null with no error and no user was ever created. Fix: `signIn` now tries a popup first (the result comes back to the same window, so it can't get lost) and falls back to redirect only when popups are blocked/unsupported; a user-cancelled popup is not a fallback case. A localStorage pending flag (shared across tabs) records a started redirect: if the app boots with the flag set, no user and no redirect result, it shows a plain "sign-in did not come back to this window" message telling the user to sign in in Chrome instead. Covered by `test/auth.test.js` (13 checks, fake Firebase SDK). SW cache v2.6.
