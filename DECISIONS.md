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
