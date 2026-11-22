/* ScorePlan — the plan engine (spec §5). generatePlan(state, chapters) -> Task[] */
(function (root) {
  var Dates = (typeof module !== 'undefined' && module.exports) ? require('./dates.js') : root.SPDates;
  var uid = 0;
  function newId() { uid++; return 't' + Date.now().toString(36) + uid.toString(36) + Math.random().toString(36).slice(2, 5); }
  function cmpWeight(a, b) { return b.weightage - a.weightage || a.difficulty - b.difficulty; }

  var REV_OFFSETS = [1, 3, 7];
  var REV_MINUTES = [30, 30, 45];

  function generatePlan(state, chapters, todayStr) {
    var today = todayStr || Dates.today();
    var total = Dates.diff(state.examDate, today);          // today inclusive, exam day exclusive
    var daily = state.dailyMinutes > 0 ? state.dailyMinutes : 240;
    var stOf = function (id) { return (state.chapters && state.chapters[id]) || 'not-started'; };
    var old = state.tasks || [];

    // Past days (and anything already checked off) stay exactly as they are.
    var kept = old.filter(function (t) { return t.date < today || t.done; });
    if (total < 1) return kept;

    var fixed = {};
    kept.forEach(function (t) { if (t.date >= today) fixed[t.date] = (fixed[t.date] || 0) + t.minutes; });

    var crash = total < 14;
    var revDays = crash ? total : Math.min(21, Math.max(7, Math.round(total * 0.2)));
    var learnDays = total - revDays;
    var out = [];
    var dateAt = function (i) { return Dates.add(today, i); };
    var capAt = function (i) { return Math.max(0, daily - (fixed[dateAt(i)] || 0)); };
    var byWeight = chapters.slice().sort(cmpWeight);
    var lastRev = {};

    function mk(date, ch, type, title, minutes, extra) {
      return Object.assign({
        id: newId(), date: date, chapterId: ch ? ch.id : null, type: type, title: title,
        minutes: minutes, done: false, doneAt: null
      }, extra || {});
    }
    function mockTask(date, rem) {
      var m = Math.min(180, rem);
      if (m < 30) return null;
      return mk(date, null, 'mock', m >= 180 ? 'Full mock test (3 hrs)' : 'Timed mock test (' + m + ' min)', m);
    }

    /* ---------- revision phase (and the whole plan in crash mode) ---------- */
    var rp = 0;
    function revisionDay(i, mockEvery, isLast) {
      var date = dateAt(i), rem = capAt(i), j = i - learnDays;
      if (isLast) {                                           // day before exam: light only
        var b = Math.min(120, rem);
        if (b > 0) out.push(mk(date, null, 'buffer', 'Light revision + rest', b));
        return;
      }
      var addRev = function (c, mins) {
        out.push(mk(date, c, 'revise', 'Revise: ' + c.name, mins, { rev: 0, prev: stOf(c.id) }));
        rem -= mins;
      };
      if ((j + 1) % mockEvery === 0) {
        var m = mockTask(date, rem);
        if (m) { out.push(m); rem -= m.minutes; }
        if (rem >= 30) { addRev(byWeight[rp % byWeight.length], Math.min(45, rem)); rp++; }
      } else {
        var guard = 0;
        while (rem >= 45 && guard++ < byWeight.length) {
          var c = byWeight[rp % byWeight.length]; rp++;
          addRev(c, (c.difficulty === 3 && rem >= 60) ? 60 : 45);
        }
      }
    }

    if (crash) {
      for (var i = 0; i < total; i++) revisionDay(i, 2, i === total - 1);
      return kept.concat(out).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
    }

    /* ---------- learning phase (§5.3) ---------- */
    var missedStudy = {}, doneStudyMin = {};
    kept.forEach(function (t) {
      if (t.type === 'study' && t.date < today && !t.done) missedStudy[t.chapterId] = true;
      if (t.type === 'study' && t.done) doneStudyMin[t.chapterId] = (doneStudyMin[t.chapterId] || 0) + t.minutes;
    });
    var order = {};
    chapters.forEach(function (c, i) { order[c.id] = i; });
    var queue = chapters.filter(function (c) {
      var s = stOf(c.id); return s === 'not-started' || s === 'in-progress';
    }).map(function (c) {
      var s = stOf(c.id);
      var pr = c.weightage * (s === 'in-progress' ? 0.6 : 1);
      if (missedStudy[c.id]) pr *= 1.5;                       // catch-up boost
      if (state.pinned && state.pinned[c.id]) pr += 1000;     // "Study next"
      var mins = c.hoursEstimate * 60;
      if (s === 'in-progress' && doneStudyMin[c.id]) mins = Math.max(60, mins - doneStudyMin[c.id]);
      return { c: c, pr: pr, left: mins };
    }).sort(function (a, b) {
      return b.pr - a.pr || a.c.difficulty - b.c.difficulty || order[a.c.id] - order[b.c.id];
    });

    // pending revisions: {idx, c, minutes, rev}
    var pend = [];
    var chById = {};
    chapters.forEach(function (c) { chById[c.id] = c; });
    chapters.forEach(function (c) {
      if (stOf(c.id) === 'needs-revision') pend.push({ idx: 0, c: c, minutes: 45, rev: 0 });
      var so = state.studiedOn && state.studiedOn[c.id];
      if (so) {
        REV_OFFSETS.forEach(function (off, k) {
          var idx = Dates.diff(Dates.add(so, off), today);
          if (idx < 0 || idx >= learnDays) return;
          var already = kept.some(function (t) { return t.type === 'revise' && t.chapterId === c.id && t.rev === k + 1 && t.done; });
          if (!already) pend.push({ idx: idx, c: c, minutes: REV_MINUTES[k], rev: k + 1 });
        });
      }
    });
    kept.forEach(function (t) {                               // missed revisions come back
      if (t.type === 'revise' && t.date < today && !t.done && chById[t.chapterId] && stOf(t.chapterId) === 'done') {
        if (!pend.some(function (p) { return p.c.id === t.chapterId && p.rev === (t.rev || 0); }))
          pend.push({ idx: 0, c: chById[t.chapterId], minutes: 30, rev: t.rev || 0 });
      }
    });

    var doneIds = {};
    chapters.forEach(function (c) { if (stOf(c.id) === 'done') doneIds[c.id] = true; });
    var cur = null;

    for (var d = 0; d < learnDays; d++) {
      var date = dateAt(d), rem = capAt(d), used = {};
      var emptyBefore = !cur && queue.length === 0;
      var budget = emptyBefore ? rem : Math.max(Math.floor(rem * 0.5), Math.min(rem, 45));

      // a) revisions due today (or carried over), first
      pend.sort(function (a, b) { return a.idx - b.idx || a.rev - b.rev; });
      for (var k = 0; k < pend.length;) {
        var p = pend[k];
        if (p.idx <= d && p.minutes <= budget && p.minutes <= rem && !used[p.c.id]) {
          out.push(mk(date, p.c, 'revise', 'Revise: ' + p.c.name, p.minutes, { rev: p.rev, prev: stOf(p.c.id) }));
          budget -= p.minutes; rem -= p.minutes; used[p.c.id] = true; lastRev[p.c.id] = d;
          pend.splice(k, 1);
        } else k++;
      }

      // b) new study, max 2 chapters per day
      var newCount = 0;
      while (rem >= 1 && newCount < 2) {
        if (!cur) { if (!queue.length) break; cur = queue.shift(); }
        if (cur.left > rem && rem < 30) break;
        var chunk = Math.min(cur.left, rem);
        out.push(mk(date, cur.c, 'study', 'Study: ' + cur.c.name, chunk, { prev: stOf(cur.c.id) }));
        cur.left -= chunk; rem -= chunk; newCount++;
        if (cur.left <= 0) {
          REV_OFFSETS.forEach(function (off, kk) {
            if (d + off < learnDays) pend.push({ idx: d + off, c: cur.c, minutes: REV_MINUTES[kk], rev: kk + 1 });
          });
          doneIds[cur.c.id] = true; cur = null;
        }
      }

      // c) spare time: weekly mock + revision of finished chapters (oldest revision first)
      var queueEmpty = !cur && queue.length === 0;
      if (queueEmpty && d % 7 === 6 && rem >= 120) {
        var m = mockTask(date, rem); if (m) { out.push(m); rem -= m.minutes; }
      }
      var maxFill = queueEmpty ? 99 : 2, filled = 0;
      while (rem >= 45 && filled < maxFill) {
        var cands = byWeight.filter(function (c) { return doneIds[c.id] && !used[c.id]; });
        if (!cands.length) break;
        cands.sort(function (a, b) {
          var la = lastRev[a.id] === undefined ? -1 : lastRev[a.id], lb = lastRev[b.id] === undefined ? -1 : lastRev[b.id];
          return la - lb || cmpWeight(a, b);
        });
        var c = cands[0];
        out.push(mk(date, c, 'revise', 'Revise: ' + c.name, 45, { rev: 0, prev: stOf(c.id) }));
        rem -= 45; used[c.id] = true; lastRev[c.id] = d; filled++;
      }
    }

    // label split chapters "Part i of n"
    var parts = {};
    out.forEach(function (t) { if (t.type === 'study') (parts[t.chapterId] = parts[t.chapterId] || []).push(t); });
    Object.keys(parts).forEach(function (id) {
      var arr = parts[id];
      if (arr.length > 1) arr.forEach(function (t, i) { t.title = 'Study: ' + chById[id].name + ' (Part ' + (i + 1) + ' of ' + arr.length + ')'; });
    });

    // revision phase
    for (var i2 = learnDays; i2 < total; i2++) revisionDay(i2, 3, i2 === total - 1);

    return kept.concat(out).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  }

  var api = { generatePlan: generatePlan };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SPPlanner = api;
})(typeof window !== 'undefined' ? window : globalThis);
