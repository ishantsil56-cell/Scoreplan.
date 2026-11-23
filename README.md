# ScorePlan
Weightage-smart JEE Main revision planner. Offline-first PWA; optional Google sign-in (Firebase, free plan) syncs your plan across devices.

## Run locally
    python3 -m http.server 8000     # then open http://localhost:8000
(Service worker / install needs http(s) or localhost, not file://.)

## Deploy (free)
Upload this folder as-is to Netlify (drag & drop), Vercel, or GitHub Pages. No build step.

## Edit the weightage data
`syllabus.js` is the only place weightages live. Keep each subject summing to ~100.

## Test
    node test/planner.test.js
