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
