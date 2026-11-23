/* ScorePlan — app shell, state mutations, views (spec §6). Vanilla JS, no build step. */
(function () {
  'use strict';
  var Data = window.SPData, Dates = window.SPDates, Planner = window.SPPlanner, Store = window.SPStorage;
  var Auth = window.SPAuth || null;
  var CH = {};
  Data.ORDER.forEach(function (k) { Data.PACKS[k].chapters.forEach(function (c) { CH[c.id] = c; }); });
  function PK() { return Data.getPack(S.examType); }
  function footnote() { return 'Weightage is approximate, based on recent ' + PK().papers + ' papers.'; }
  var STATUS = { 'not-started': 'Not started', 'in-progress': 'In progress', 'done': 'Done', 'needs-revision': 'Needs revision' };

  var S = Store.load() || Store.defaultState();
  var ui = {
    route: 'today', planDay: null, chSubject: 'Physics', chFilter: 'all', chSort: 'weight', chSearch: '',
    missedOpen: false, notice: '', blockedDismissed: false, openSub: {},
    ob: null, weekScroll: 0
  };

  /* ---------- small helpers ---------- */
  function $(s) { return document.querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmtMin(m) { return m >= 60 ? Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + (m % 60) + ' min' : '') : m + ' min'; }
  function fmtHrs(m) { var h = m / 60; return (h % 1 ? h.toFixed(1) : h) + ' hrs'; }
  function persist() { Store.save(S); if (Auth) Auth.pushSoon(function () { return S; }); }
  function stOf(id) { return S.chapters[id] || 'not-started'; }
  function todayStr() { return Dates.today(); }
  function daysLeft() { return Dates.diff(S.examDate, todayStr()); }
  function tasksOn(date) { return S.tasks.filter(function (t) { return t.date === date; }); }
  function pct(n, d) { return d ? Math.round(n / d * 100) : 0; }

  var ICON = {
    today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/></svg>',
    plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    chapters: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A1.5 1.5 0 015.5 4H11v16H5.5A1.5 1.5 0 014 18.5v-13zM20 5.5A1.5 1.5 0 0018.5 4H13v16h5.5a1.5 1.5 0 001.5-1.5v-13z"/></svg>',
    progress: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20V11M12 20V4M19 20v-6"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></svg>'
  };

  /* ---------- derived stats ---------- */
  function subjectPct(s) {            // % of that subject's weightage covered by Done chapters
    var tot = 0, got = 0;
    PK().chapters.forEach(function (c) { if (c.subject === s) { tot += c.weightage; if (stOf(c.id) === 'done') got += c.weightage; } });
    return tot ? got / tot * 100 : 0;
  }
  function weightageCovered() { return PK().subjects.reduce(function (a, s) { return a + subjectPct(s); }, 0) / PK().subjects.length; }
  function doneCount() { return PK().chapters.filter(function (c) { return stOf(c.id) === 'done'; }).length; }
  function doneDates() {
    var m = {}; S.tasks.forEach(function (t) { if (t.done && t.doneAt) m[Dates.isoToYmd(t.doneAt)] = (m[Dates.isoToYmd(t.doneAt)] || 0) + 1; });
    return m;
  }
  function streak() {
    var m = doneDates(), d = todayStr(), n = 0;
    if (!m[d]) d = Dates.add(d, -1);                 // a quiet day so far is never counted against you
    while (m[d]) { n++; d = Dates.add(d, -1); }
    return n;
  }
  function uncovered() {
    if (daysLeft() < 14) return 0;
    var covered = {};
    S.tasks.forEach(function (t) { if (t.type === 'study' && (t.done || t.date >= todayStr())) covered[t.chapterId] = true; });
    return PK().chapters.filter(function (c) { var s = stOf(c.id); return (s === 'not-started' || s === 'in-progress') && !covered[c.id]; }).length;
  }
  function planChapterCount() {
    var u = {}; S.tasks.forEach(function (t) { if (t.chapterId && t.date >= todayStr()) u[t.chapterId] = 1; });
    return Object.keys(u).length;
  }

  /* ---------- mutations ---------- */
  function rebuild() {
    S.tasks = Planner.generatePlan(S, PK().chapters);
    S.planGeneratedAt = new Date().toISOString();
    S.pinned = {};
    persist();
  }
  function toggleTask(id) {
    var t = S.tasks.filter(function (x) { return x.id === id; })[0]; if (!t) return;
    var now = !t.done, cid = t.chapterId, today = todayStr();
    t.done = now; t.doneAt = now ? new Date().toISOString() : null;
    if (cid) {
      var st = stOf(cid);
      if (t.type === 'study') {
        var parts = S.tasks.filter(function (x) { return x.type === 'study' && x.chapterId === cid; });
        if (now) {
          if (parts.every(function (x) { return x.done; })) {
            S.chapters[cid] = 'done'; S.lastStudied[cid] = today; if (!S.studiedOn[cid]) S.studiedOn[cid] = today;
          } else if (st !== 'done') S.chapters[cid] = 'in-progress';
        } else if (parts.some(function (x) { return x.done; })) {
          S.chapters[cid] = 'in-progress'; delete S.studiedOn[cid];
        } else {
          S.chapters[cid] = (t.prev && t.prev !== 'done') ? t.prev : 'not-started'; delete S.studiedOn[cid];
        }
      } else if (t.type === 'revise') {
        if (now) { S.lastStudied[cid] = today; if (st === 'needs-revision') S.chapters[cid] = 'done'; }
        else if (t.prev === 'needs-revision') S.chapters[cid] = 'needs-revision';
      }
    }
    persist(); render();
  }

  /* ---------- dialogs & toast ---------- */
  function ask(o) {
    return new Promise(function (resolve) {
      var root = $('#modal-root');
      root.innerHTML = '<div class="overlay" role="dialog" aria-modal="true"><div class="modal"><h2 class="h2">' + esc(o.title || '') + '</h2>' +
        '<p style="margin-top:8px">' + esc(o.message || '') + '</p><div class="actions">' +
        (o.noCancel ? '' : '<button class="btn secondary" id="m-no">' + esc(o.cancel || 'Cancel') + '</button>') +
        '<button class="btn' + (o.danger ? ' danger' : '') + '" id="m-yes">' + esc(o.ok || 'OK') + '</button></div></div></div>';
      function close(v) { root.innerHTML = ''; document.removeEventListener('keydown', key); resolve(v); }
      function key(e) { if (e.key === 'Escape') close(false); }
      document.addEventListener('keydown', key);
      $('#m-yes').onclick = function () { close(true); };
      if ($('#m-no')) $('#m-no').onclick = function () { close(false); };
      $('#m-yes').focus();
    });
  }
  var toastTimer;
  function toast(msg) {
    var r = $('#toast-root'); r.innerHTML = '<div class="toast">' + esc(msg) + '</div>';
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { r.innerHTML = ''; }, 2600);
  }
  function confirmRebuild(then) {
    ask({ title: 'Rebuild your plan?', message: 'Rebuild your plan from today? Past days stay as they are.', ok: 'Rebuild' }).then(function (y) {
      if (y) { rebuild(); render(); toast('Plan rebuilt.'); if (then) then(); }
    });
  }

  /* ---------- reusable components ---------- */
  function ring(p, label, color) {
    var r = 32, c = 2 * Math.PI * r, off = c * (1 - Math.min(100, p) / 100);
    return '<div><div class="ring"><svg viewBox="0 0 76 76"><circle cx="38" cy="38" r="' + r + '" fill="none" stroke="#E2E8F0" stroke-width="7"/>' +
      '<circle cx="38" cy="38" r="' + r + '" fill="none" stroke="' + (color || '#4F46E5') + '" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg>' +
      '<span>' + Math.round(p) + '%</span></div><div class="ring-cap">' + label + '</div></div>';
  }
  function taskRow(t, preview) {
    var c = t.chapterId ? CH[t.chapterId] : null;
    var dot = '<span class="dot' + (c ? ' ' + c.subject : '') + '"></span>';
    var meta = dot + '<span>' + (c ? c.subject + ' · ' : '') + fmtMin(t.minutes) + '</span>';
    if (preview) return '<div class="task preview"><div class="task-body"><div class="task-title">' + esc(t.title) + '</div><div class="task-meta">' + meta + '</div></div></div>';
    return '<label class="task' + (t.done ? ' done' : '') + '"><input type="checkbox" class="chk" data-chg="toggle" data-id="' + t.id + '"' + (t.done ? ' checked' : '') +
      ' aria-label="Mark done: ' + esc(t.title) + '"><div class="task-body"><div class="task-title">' + esc(t.title) + '</div><div class="task-meta">' + meta + '</div></div></label>';
  }
  function empty(msg) { return '<div class="empty">' + esc(msg) + '</div>'; }
  function banner(kind, msg) { return '<div class="banner ' + kind + '">' + msg + '</div>'; }

  /* ---------- shell ---------- */
  function topbar() {
    var d = daysLeft();
    var chip = d > 0 ? d + (d === 1 ? ' day left' : ' days left') : 'Exam day';
    return '<div class="topbar"><div class="brand">ScorePlan</div><div class="right"><span class="chip">' + chip + '</span>' +
      (ui.route === 'today' ? '<button class="icon-btn gear-mobile" data-act="go" data-r="settings" aria-label="Settings">' + ICON.settings + '</button>' : '') + '</div></div>';
  }
  function nav() {
    var items = [['today', 'Today'], ['plan', 'Plan'], ['chapters', 'Chapters'], ['progress', 'Progress']];
    return '<nav class="nav" aria-label="Main">' + items.map(function (i) {
      return '<button data-act="go" data-r="' + i[0] + '" class="' + (ui.route === i[0] ? 'active' : '') + '">' + ICON[i[0]] + '<span>' + i[1] + '</span></button>';
    }).join('') + '<button class="only-desktop' + (ui.route === 'settings' ? ' active' : '') + '" data-act="go" data-r="settings">' + ICON.settings + '<span>Settings</span></button></nav>';
  }
  function banners() {
    var h = '';
    if (Store.isBlocked() && !ui.blockedDismissed)
      h += '<div class="banner warn"><div class="row"><div class="grow">Your browser is blocking saved data — your plan won\'t be saved between visits.</div><button class="link" data-act="dismiss-blocked">Dismiss</button></div></div>';
    if ((ui.route === 'today' || ui.route === 'plan') && daysLeft() < 14 && daysLeft() > 0) h += banner('warn', 'Crash mode: only revision and mocks — no new chapters.');
    return h;
  }

  /* ---------- Onboarding ---------- */
  function initOb() { ui.ob = { step: 1, type: S.examType || 'main', name: S.examName, date: S.examDate, mins: S.dailyMinutes, done: {}, err: '' }; }
  function viewOnboarding() {
    if (!ui.ob) initOb();
    S.examType = ui.ob.type;
    var o = ui.ob, h = '<div class="main" style="padding-bottom:24px"><div class="page ob"><div class="brand">ScorePlan</div>' +
      '<p class="muted" style="margin-top:4px">Let\'s build a plan that studies what actually gets asked.</p>' +
      '<div class="stepper">' + [1, 2, 3].map(function (i) { return '<i class="' + (i <= o.step ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      '<div class="muted" style="margin-bottom:8px">Step ' + o.step + ' of 3</div><div class="stack">';
    if (o.step === 1) {
      var P = Data.getPack(o.type);
      h += '<h1 class="h1">Your exam</h1><div class="card stack"><div><div class="muted" style="margin-bottom:6px">Which exam?</div><div class="tabs">' + typeTabs(o.type, 'ob-type') + '</div>' +
        '<div class="muted" style="margin-top:6px">' + P.subjects.join(' · ') + ' — ' + P.chapters.length + ' chapters</div></div>' +
        '<div><label class="muted" for="ob-name">Exam name</label>' +
        '<input id="ob-name" class="input" data-inp="obname" value="' + esc(o.name) + '" maxlength="40"></div>' +
        '<div><label class="muted" for="ob-date">Exam date</label><input id="ob-date" type="date" class="input" data-chg="obdate" value="' + esc(o.date) + '">' +
        (o.err ? '<div class="err">' + esc(o.err) + '</div>' : '') + '</div></div>' +
        '<button class="btn block" data-act="ob-next">Next</button>';
    } else if (o.step === 2) {
      h += '<h1 class="h1">Your time</h1><div class="card stack"><div class="h2">How many hours can you study each day?</div><div class="hrs">' +
        [2, 3, 4, 5, 6].map(function (x) { return '<button data-act="ob-hrs" data-v="' + x * 60 + '" class="' + (o.mins === x * 60 ? 'active' : '') + '">' + x + '</button>'; }).join('') + '</div>' +
        '<div><input type="range" min="1" max="10" step="0.5" value="' + o.mins / 60 + '" data-inp="obslider" aria-label="Daily study hours"></div>' +
        '<div><b id="ob-hrs-label">' + fmtHrs(o.mins) + ' per day</b></div>' +
        '<div class="muted" id="ob-total">That\'s ~' + Math.floor(Math.max(0, Dates.diff(o.date, todayStr())) * o.mins / 60) + ' hours before your exam.</div></div>' +
        '<div class="row"><button class="btn secondary" data-act="ob-back">Back</button><button class="btn grow" data-act="ob-next">Next</button></div>';
    } else {
      h += '<h1 class="h1">Where are you now?</h1><p class="muted">Be honest — the plan is built around what is left.</p>' +
        '<div class="row between"><span class="muted">' + Object.keys(o.done).length + ' chapters marked done</span><button class="link" data-act="ob-clear">Mark all as not started</button></div>';
      PK().subjects.forEach(function (s) {
        var list = PK().chapters.filter(function (c) { return c.subject === s; });
        var n = list.filter(function (c) { return o.done[c.id]; }).length, open = isOpenSub(s);
        h += '<div class="card"><button class="link block" style="width:100%;text-align:left;padding:0" data-act="ob-sub" data-s="' + s + '"><span class="row between"><span class="row"><span class="dot ' + s + '"></span><b style="color:var(--text)">' + s + '</b></span><span class="muted">' + n + '/' + list.length + ' ' + (open ? '▾' : '▸') + '</span></span></button>';
        if (open) h += '<div style="margin-top:8px">' + list.map(function (c) {
          return '<label class="check-row"><input type="checkbox" class="chk" data-chg="obdone" data-id="' + c.id + '"' + (o.done[c.id] ? ' checked' : '') + '>' +
            '<span class="grow" style="overflow-wrap:anywhere">' + esc(c.name) + '</span><span class="badge">' + c.weightage + '%</span><span class="muted">Already done</span></label>';
        }).join('') + '</div>';
        h += '</div>';
      });
      h += '<div class="row"><button class="btn secondary" data-act="ob-back">Back</button><button class="btn grow" data-act="ob-finish">Build my plan →</button></div>';
    }
    return h + '</div></div></div>';
  }
  function typeTabs(cur, act) {
    return Data.ORDER.map(function (k) { return '<button data-act="' + act + '" data-t="' + k + '" class="' + (cur === k ? 'active' : '') + '">' + Data.PACKS[k].label + '</button>'; }).join('');
  }
  function isOpenSub(s) { return ui.openSub[s] === undefined ? PK().subjects.indexOf(s) === 0 : ui.openSub[s]; }
  function validDate(v) { return /^\d{4}-\d{2}-\d{2}$/.test(v) && Dates.diff(v, todayStr()) >= 1; }

  /* ---------- Today ---------- */
  function viewToday() {
    var t0 = todayStr(), tasks = tasksOn(t0), pending = tasks.filter(function (t) { return !t.done; });
    var h = '<div class="stack">';
    if (ui.notice) h += '<div class="banner info"><div class="row"><div class="grow">' + esc(ui.notice) + '</div><button class="link" data-act="dismiss-notice">OK</button></div></div>';
    if (doneCount() === PK().chapters.length) h += banner('ok', 'Syllabus complete — all remaining days are revision + mocks.');
    var u = uncovered();
    if (u > 0) h += banner('warn', u + (u === 1 ? ' chapter doesn\'t' : ' chapters don\'t') + ' fit before your revision phase. More daily hours, or marking chapters you already know as done, will help.');
    h += '<div class="row between"><h1 class="h1">Today, ' + Dates.fmtDM(t0) + '</h1><span class="chip">' + (streak() > 0 ? '🔥 ' + streak() + '-day streak' : 'Start your streak today') + '</span></div>';

    if (!tasks.length) {
      h += '<div class="card">' + empty('Nothing scheduled today — enjoy the breather, or tap Rebuild to pull work forward.') + '</div>';
    } else if (!pending.length) {
      var tm = tasksOn(Dates.add(t0, 1))[0];
      h += '<div class="card focus-card"><div class="muted">Today\'s focus</div><div class="h2" style="margin-top:4px">All done for today. Nice work.</div>' +
        (tm ? '<div class="muted" style="margin-top:8px">Tomorrow starts with: ' + esc(tm.title) + ' (' + fmtMin(tm.minutes) + ')</div>' : '') + '</div>';
    } else {
      var best = pending.filter(function (t) { return (t.type === 'study' || t.type === 'revise') && CH[t.chapterId]; })
        .sort(function (a, b) { return CH[b.chapterId].weightage - CH[a.chapterId].weightage; })[0] || pending[0];
      h += '<div class="card focus-card"><div class="muted">Today\'s focus</div>' + taskRow(best) + '</div>';
    }
    if (tasks.length) h += '<div class="card"><div class="row between" style="margin-bottom:4px"><h2 class="h2">Today\'s checklist</h2><span class="muted">' + (tasks.length - pending.length) + '/' + tasks.length + ' done</span></div>' + tasks.map(function (t) { return taskRow(t); }).join('') + '</div>';

    h += '<div class="card"><div class="rings">' + ring(pct(doneCount(), PK().chapters.length), 'Overall') + ring(weightageCovered(), 'Weightage covered', '#16A34A') +
      ring(tasks.length ? pct(tasks.length - pending.length, tasks.length) : 0, 'Today', '#D97706') + '</div></div>';

    var nx = tasksOn(Dates.add(t0, 1)).slice(0, 2);
    if (nx.length) h += '<div class="card"><h2 class="h2">Up next · tomorrow</h2>' + nx.map(function (t) { return taskRow(t, true); }).join('') + '</div>';
    h += '<button class="btn secondary block" data-act="rebuild">Rebuild my plan</button></div>';
    return h;
  }

  /* ---------- Plan ---------- */
  function viewPlan() {
    var t0 = todayStr(), total = daysLeft(), sel = ui.planDay;
    if (!sel || sel < t0 || (total > 0 && Dates.diff(sel, t0) >= total)) sel = ui.planDay = t0;
    var h = '<div class="stack">';
    if (doneCount() === PK().chapters.length) h += banner('ok', 'Syllabus complete — all remaining days are revision + mocks.');
    var days = []; for (var i = 0; i < Math.max(total, 1); i++) days.push(Dates.add(t0, i));
    h += '<h1 class="h1">Your plan</h1><div class="week" id="week">' + days.map(function (d) {
      var ts = tasksOn(d), dn = ts.filter(function (t) { return t.done; }).length;
      return '<button class="day' + (d === sel ? ' active' : '') + (d === t0 ? ' today' : '') + '" data-act="planday" data-d="' + d + '" data-active="' + (d === sel ? 1 : 0) + '"><span>' + Dates.dow(d) + '</span><b>' + Dates.dayNum(d) + '</b><small>' + (ts.length ? dn + '/' + ts.length : '–') + '</small></button>';
    }).join('') + '</div>';
    h += '<div class="card row between wrap"><div class="muted grow">' + (S.planGeneratedAt ? 'Plan built ' + Dates.fmtDM(Dates.isoToYmd(S.planGeneratedAt)) + ', ' + Dates.fmtTime(S.planGeneratedAt) : 'No plan yet') + '</div><button class="btn small" data-act="rebuild">Rebuild my plan</button></div>';
    var missed = S.tasks.filter(function (t) { return t.date < t0 && !t.done; });
    if (missed.length) {
      h += '<div class="card"><button class="link" style="width:100%;text-align:left;padding:0" data-act="missed-toggle"><span class="row between"><b style="color:var(--text)">Missed (' + missed.length + ')</b><span class="muted">' + (ui.missedOpen ? '▾' : '▸') + '</span></span></button>';
      if (ui.missedOpen) h += '<div style="margin-top:8px">' + missed.map(function (t) { return '<div class="muted" style="margin-top:6px">' + Dates.fmtDM(t.date) + '</div>' + taskRow(t); }).join('') + '<button class="btn block" style="margin-top:12px" data-act="reschedule">Reschedule into my plan</button></div>';
      h += '</div>';
    }
    var ts = tasksOn(sel), sum = ts.reduce(function (a, t) { return a + t.minutes; }, 0);
    h += '<div class="card"><div class="row between"><h2 class="h2">' + Dates.dow(sel) + ', ' + Dates.fmtDM(sel) + '</h2><span class="muted">' + (ts.length ? fmtMin(sum) : '') + '</span></div>' +
      (ts.length ? ts.map(function (t) { return taskRow(t); }).join('') : empty(sel === t0 ? 'Nothing scheduled today — enjoy the breather, or tap Rebuild to pull work forward.' : 'Nothing scheduled for this day.')) + '</div></div>';
    return h;
  }

  /* ---------- Chapters ---------- */
  function chapterList() {
    var q = ui.chSearch.trim().toLowerCase();
    var list = PK().chapters.filter(function (c) {
      return c.subject === ui.chSubject && (!q || c.name.toLowerCase().indexOf(q) > -1) && (ui.chFilter === 'all' || stOf(c.id) === ui.chFilter);
    });
    list.sort(ui.chSort === 'name' ? function (a, b) { return a.name.localeCompare(b.name); } : function (a, b) { return b.weightage - a.weightage || a.difficulty - b.difficulty; });
    if (!list.length) return empty('No chapters match that search.');
    return list.map(function (c) {
      var st = stOf(c.id);
      return '<div class="ch"><div class="row between"><div class="ch-name">' + esc(c.name) + '</div><span class="diff" title="Difficulty">' + '●'.repeat(c.difficulty) + '○'.repeat(3 - c.difficulty) + '</span></div>' +
        '<div class="row" style="margin-top:6px"><div class="wbar"><i style="width:' + (c.weightage / PK().maxWeightage * 100) + '%"></i></div><span class="badge">' + c.weightage + '%</span></div>' +
        '<div class="row between wrap" style="margin-top:8px"><select data-chg="status" data-id="' + c.id + '" aria-label="Status of ' + esc(c.name) + '">' +
        Object.keys(STATUS).map(function (k) { return '<option value="' + k + '"' + (k === st ? ' selected' : '') + '>' + STATUS[k] + '</option>'; }).join('') + '</select>' +
        (st === 'done' ? '<button class="btn secondary small" data-act="revise" data-id="' + c.id + '">Revise</button>' : '') + '</div></div>';
    }).join('');
  }
  function viewChapters() {
    if (PK().subjects.indexOf(ui.chSubject) < 0) ui.chSubject = PK().subjects[0];
    var h = '<div class="stack"><div class="row between"><h1 class="h1">Chapters</h1><button class="btn secondary small" data-act="chsort">Sort: ' + (ui.chSort === 'weight' ? 'Weightage' : 'Name') + '</button></div>' +
      '<div class="tabs">' + PK().subjects.map(function (s) { return '<button data-act="chsubj" data-s="' + s + '" class="' + (ui.chSubject === s ? 'active' : '') + '">' + s + '<small>' + Math.round(subjectPct(s)) + '%</small></button>'; }).join('') + '</div>' +
      '<input class="input" type="search" placeholder="Search chapters" data-inp="search" value="' + esc(ui.chSearch) + '" aria-label="Search chapters">' +
      '<div class="filters">' + [['all', 'All']].concat(Object.keys(STATUS).map(function (k) { return [k, STATUS[k]]; })).map(function (f) {
        return '<button data-act="chfilter" data-f="' + f[0] + '" class="' + (ui.chFilter === f[0] ? 'active' : '') + '">' + f[1] + '</button>';
      }).join('') + '</div><div class="card" id="chlist">' + chapterList() + '</div><p class="muted">' + footnote() + '</p></div>';
    return h;
  }

  /* ---------- Progress ---------- */
  function viewProgress() {
    var t0 = todayStr(), m = doneDates(), tot = PK().chapters.length, d = daysLeft();
    var h = '<div class="stack"><h1 class="h1">Progress</h1><div class="bignums">' +
      '<div class="card"><div class="num">' + doneCount() + '/' + tot + '</div><div class="muted">Chapters done</div></div>' +
      '<div class="card"><div class="num">' + Math.round(weightageCovered()) + '%</div><div class="muted">Weightage covered</div></div>' +
      '<div class="card"><div class="num">' + Math.max(0, d) + '</div><div class="muted">Days left</div></div>' +
      '<div class="card"><div class="num">' + streak() + '</div><div class="muted">Day streak</div></div></div>';
    h += '<div class="card stack"><h2 class="h2">By subject</h2>' + PK().subjects.map(function (s) {
      var p = Math.round(subjectPct(s));
      return '<div><div class="row between"><span class="row"><span class="dot ' + s + '"></span>' + s + '</span><b>' + p + '%</b></div><div class="bar" style="margin-top:6px"><i style="width:' + p + '%"></i></div></div>';
    }).join('') + '<p class="muted">Weightage covered = share of each subject\'s marks sitting in chapters you\'ve finished, averaged across the three subjects.</p></div>';
    var days = []; for (var i = 6; i >= 0; i--) days.push(Dates.add(t0, -i));
    var mx = Math.max(1, Math.max.apply(null, days.map(function (x) { return m[x] || 0; })));
    h += '<div class="card"><h2 class="h2" style="margin-bottom:8px">Last 7 days</h2><div class="chart">' + days.map(function (x) {
      var n = m[x] || 0; return '<div><span>' + n + '</span><i style="height:' + (n / mx * 80) + 'px"></i><span>' + Dates.dow(x).charAt(0) + '</span></div>';
    }).join('') + '</div><p class="muted" style="margin-top:6px">Tasks completed per day</p></div>';
    var rem = PK().chapters.filter(function (c) { return stOf(c.id) !== 'done'; }).sort(function (a, b) { return b.weightage - a.weightage || a.difficulty - b.difficulty; }).slice(0, 5);
    h += '<div class="card"><h2 class="h2">Top 5 remaining</h2>' + (rem.length ? rem.map(function (c) {
      return '<div class="ch"><div class="row between"><div class="grow"><div class="ch-name">' + esc(c.name) + '</div><div class="task-meta"><span class="dot ' + c.subject + '"></span>' + c.subject + ' · ' + c.weightage + '%</div></div>' +
        '<button class="btn secondary small" data-act="studynext" data-id="' + c.id + '"' + (S.pinned[c.id] ? ' disabled' : '') + '>' + (S.pinned[c.id] ? 'Queued' : 'Study next') + '</button></div></div>';
    }).join('') : empty('Syllabus complete — all remaining days are revision + mocks.')) + '</div></div>';
    return h;
  }

  /* ---------- account & sync (optional Google sign-in) ---------- */
  var syncState = { status: 'off', at: null };
  function syncStatusText() {
    if (syncState.status === 'syncing') return 'Syncing…';
    if (syncState.status === 'error') return 'Sync failed — will retry on your next change.';
    if (syncState.status === 'ok') return 'Synced' + (syncState.at ? ' · ' + Dates.fmtTime(syncState.at) : '');
    return 'Not synced yet';
  }
  function setSyncStatus(status, at) {
    syncState.status = status; if (at) syncState.at = at;
    var el = $('#sync-status'); if (el) el.textContent = syncStatusText();
  }
  function pushNow() {
    if (!Auth || !Auth.currentUser()) return Promise.resolve();
    setSyncStatus('syncing', '');
    return Auth.push(S).then(function (ts) { Auth.setWatermark(ts); setSyncStatus('ok', ts); }).catch(function () { setSyncStatus('error', ''); });
  }
  function applyCloud(state, ts) {
    S = state; Store.save(S); Auth.setWatermark(ts); setSyncStatus('ok', ts);
    ui.ob = null; render(); toast('Synced from your Google account.');
  }
  /* Decides what to do with the cloud copy on sign-in / sync: fresh device takes the cloud
     copy, a newer cloud copy wins, otherwise the local plan is pushed up. First sync on a
     device that already has a plan asks which one to keep, so nothing is ever lost silently. */
  function reconcile(cloud) {
    if (!Auth || !Auth.currentUser()) return Promise.resolve();
    if (!cloud || !cloud.state) return pushNow();
    var valid = Store.validate(cloud.state);
    if (!valid) return pushNow();
    var wm = Auth.getWatermark();
    if (!S.onboardingDone) { applyCloud(valid, cloud.updatedAt); return Promise.resolve(); }
    if (wm && cloud.updatedAt <= wm) return pushNow();
    if (!wm) {
      return ask({ title: 'Two plans found', message: 'This device has a plan, and your Google account has one from another device. Which one should we keep?', ok: 'Use the one from Google', cancel: 'Keep this device\'s' }).then(function (useCloud) {
        if (useCloud) applyCloud(valid, cloud.updatedAt); else return pushNow();
      });
    }
    applyCloud(valid, cloud.updatedAt);
    return Promise.resolve();
  }
  function reconcileOnSignIn() {
    setSyncStatus('syncing', '');
    Auth.pull().then(function (cloud) { reconcile(cloud); }).catch(function () { setSyncStatus('error', ''); });
  }
  function manualSync() {
    if (!Auth || !Auth.currentUser()) { toast('Sign in first to sync.'); return; }
    setSyncStatus('syncing', '');
    Auth.pull().then(function (cloud) { return reconcile(cloud); }).then(function () { toast('Synced.'); }).catch(function () { setSyncStatus('error', ''); toast('Sync failed — check your connection.'); });
  }
  function accountCard() {
    var h = '<div class="card stack"><h2 class="h2">Account</h2>';
    if (!Auth || !Auth.isConfigured()) return h + '<p class="muted">Google sign-in isn\'t set up yet. It needs a free Firebase project — the setup steps are in firebase-config.js in the repo.</p></div>';
    if (!Auth.isAvailable()) return h + '<p class="muted">Can\'t reach Google right now (you may be offline). Your plan still works — sign-in will be here when you\'re back online.</p></div>';
    var u = Auth.currentUser();
    if (!u) return h + '<p class="muted">Sign in to back up your plan to your Google account and sync it across devices. Optional — everything works without it.</p><button class="btn block" data-act="auth-signin">Sign in with Google</button></div>';
    var avatar = u.photoURL ? '<img src="' + esc(u.photoURL) + '" alt="" style="width:32px;height:32px;border-radius:50%;object-fit:cover">' : '';
    return h + '<div class="row">' + avatar + '<div class="grow"><b>' + esc(u.displayName || u.email || 'Signed in') + '</b><div class="muted">' + esc(u.email || '') + '</div></div></div>' +
      '<div class="muted" id="sync-status">' + esc(syncStatusText()) + '</div>' +
      '<div class="row"><button class="btn secondary grow" data-act="auth-sync">Sync now</button><button class="btn secondary grow" data-act="auth-signout">Sign out</button></div></div>';
  }

  /* ---------- Settings ---------- */
  function viewSettings() {
    return '<div class="stack"><div class="row"><button class="link" data-act="go" data-r="today">← Back</button></div><h1 class="h1">Settings</h1>' +
      '<div class="card stack"><h2 class="h2">Exam</h2><div><div class="muted" style="margin-bottom:6px">Exam type</div><div class="tabs">' + typeTabs(S.examType, 'set-type') + '</div></div><div><label class="muted" for="s-name">Exam name</label><input id="s-name" class="input" data-chg="setname" value="' + esc(S.examName) + '" maxlength="40"></div>' +
      '<div><label class="muted" for="s-date">Exam date</label><input id="s-date" type="date" class="input" data-chg="setdate" value="' + esc(S.examDate) + '"></div></div>' +
      '<div class="card stack"><h2 class="h2">Daily study hours</h2><div class="hrs">' + [2, 3, 4, 5, 6].map(function (x) { return '<button data-act="sethrs" data-v="' + x * 60 + '" class="' + (S.dailyMinutes === x * 60 ? 'active' : '') + '">' + x + '</button>'; }).join('') + '</div>' +
      '<input type="range" min="1" max="10" step="0.5" value="' + S.dailyMinutes / 60 + '" data-inp="setslider" data-chg="setslider" aria-label="Daily study hours"><b id="s-hrs-label">' + fmtHrs(S.dailyMinutes) + ' per day</b></div>' +
      accountCard() + '<div class="card stack"><h2 class="h2">Your data</h2><p class="muted">Everything lives on this device. Sign in above to also back it up to your Google account and sync it across devices.</p>' +
      '<button class="btn secondary block" data-act="export">Export my data</button><button class="btn secondary block" data-act="import">Import data</button>' +
      '<input type="file" id="import-file" accept="application/json,.json" hidden><button class="btn danger block" data-act="reset">Reset everything</button></div>' +
      '<div class="card stack"><h2 class="h2">About</h2><p>ScorePlan builds your ' + esc(PK().label) + ' revision plan from real paper weightage, and works fully offline.</p><p class="muted">' + footnote() + '</p><p class="muted">v1.0</p></div></div>';
  }

  /* ---------- render ---------- */
  function render() {
    var app = $('#app'), wk = $('#week'); if (wk) ui.weekScroll = wk.scrollLeft;
    if (!S.onboardingDone) { app.innerHTML = viewOnboarding(); return; }
    var views = { today: viewToday, plan: viewPlan, chapters: viewChapters, progress: viewProgress, settings: viewSettings };
    app.innerHTML = '<div class="shell">' + nav() + '<main class="main"><div class="page">' + topbar() + banners() + (views[ui.route] || viewToday)() + '</div></main></div>';
    wk = $('#week');
    if (wk) { var a = wk.querySelector('[data-active="1"]'); if (ui.weekScroll) wk.scrollLeft = ui.weekScroll; else if (a) wk.scrollLeft = Math.max(0, a.offsetLeft - 16); }
  }
  function go(r) { ui.route = r; if (location.hash !== '#/' + r) location.hash = '#/' + r; render(); window.scrollTo(0, 0); }
  window.addEventListener('hashchange', function () {
    var r = location.hash.replace('#/', ''); if (['today', 'plan', 'chapters', 'progress', 'settings'].indexOf(r) > -1 && r !== ui.route) { ui.route = r; render(); window.scrollTo(0, 0); }
  });

  /* ---------- events ---------- */
  function afterHoursChange() {
    if (S.tasks.length) ask({ title: 'Rebuild your plan?', message: 'Rebuild your plan with the new daily hours? Past days stay as they are.', ok: 'Rebuild', cancel: 'Keep' }).then(function (y) { if (y) { rebuild(); toast('Plan rebuilt.'); } render(); });
    else render();
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    var a = el.dataset.act, o = ui.ob;
    switch (a) {
      case 'go': go(el.dataset.r); break;
      case 'rebuild': case 'reschedule': confirmRebuild(); break;
      case 'planday': ui.planDay = el.dataset.d; render(); break;
      case 'missed-toggle': ui.missedOpen = !ui.missedOpen; render(); break;
      case 'dismiss-notice': ui.notice = ''; render(); break;
      case 'dismiss-blocked': ui.blockedDismissed = true; render(); break;
      case 'chsubj': ui.chSubject = el.dataset.s; render(); break;
      case 'chfilter': ui.chFilter = el.dataset.f; render(); break;
      case 'chsort': ui.chSort = ui.chSort === 'weight' ? 'name' : 'weight'; render(); break;
      case 'revise': S.chapters[el.dataset.id] = 'needs-revision'; persist(); render(); toast('Marked for revision. It joins your plan on the next rebuild.'); break;
      case 'studynext': S.pinned[el.dataset.id] = true; persist(); render(); toast('Moved to the front of the queue on your next rebuild.'); break;
      /* onboarding */
      case 'ob-next':
        if (o.step === 1) { o.name = ($('#ob-name').value || '').trim() || 'JEE Main 2027'; if (!validDate(o.date)) { o.err = 'Pick a future date.'; render(); break; } o.err = ''; }
        o.step++; render(); window.scrollTo(0, 0); break;
      case 'ob-back': o.step--; render(); window.scrollTo(0, 0); break;
      case 'ob-type': {
        var np = Data.getPack(el.dataset.t); o.type = np.id; o.name = np.defaultName; o.date = np.defaultDate; o.done = {}; o.err = ''; ui.openSub = {}; S.examType = np.id; render(); break;
      }
      case 'ob-hrs': o.mins = +el.dataset.v; render(); break;
      case 'ob-sub': ui.openSub[el.dataset.s] = !isOpenSub(el.dataset.s); render(); break;
      case 'ob-clear': o.done = {}; render(); break;
      case 'ob-finish':
        S.examType = o.type; S.examName = o.name; S.examDate = o.date; S.dailyMinutes = o.mins || 240; S.chapters = {}; S.lastStudied = {}; S.studiedOn = {}; S.pinned = {}; S.tasks = [];
        PK().chapters.forEach(function (c) { S.chapters[c.id] = o.done[c.id] ? 'done' : 'not-started'; });
        S.onboardingDone = true; rebuild();
        ui.notice = 'Your plan covers ' + planChapterCount() + ' chapters in ' + daysLeft() + ' days.'; ui.ob = null; ui.route = 'today'; location.hash = '#/today'; render(); window.scrollTo(0, 0); break;
      /* settings */
      case 'set-type': {
        var t = el.dataset.t; if (t === S.examType) break;
        ask({ title: 'Switch to ' + Data.PACKS[t].label + '?', message: 'Each exam has its own chapters, so your current chapters and plan on this device will be cleared. Export a backup first if you want to keep them.', ok: 'Switch', danger: true }).then(function (y) {
          if (!y) return;
          var np = Data.PACKS[t]; S.examType = t; S.examName = np.defaultName; S.examDate = np.defaultDate;
          S.chapters = {}; S.lastStudied = {}; S.studiedOn = {}; S.pinned = {}; S.tasks = []; S.planGeneratedAt = null; S.onboardingDone = false;
          ui.ob = null; ui.openSub = {}; ui.chSubject = np.subjects[0]; ui.route = 'today'; location.hash = '#/today'; persist(); render(); if (Auth && Auth.currentUser()) pushNow();
        }); break;
      }
      case 'sethrs': S.dailyMinutes = +el.dataset.v; persist(); afterHoursChange(); break;
      case 'auth-signin': if (Auth) Auth.signIn(); break;
      case 'auth-signout': if (Auth) Auth.signOut(); break;
      case 'auth-sync': manualSync(); break;
      case 'export': {
        var blob = new Blob([Store.exportJSON(S)], { type: 'application/json' }), url = URL.createObjectURL(blob), l = document.createElement('a');
        l.href = url; l.download = 'scoreplan-backup.json'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 500); toast('Backup downloaded.'); break;
      }
      case 'import': $('#import-file').click(); break;
      case 'reset':
        ask({ title: 'Reset everything?', message: 'This deletes your plan, progress and settings from this device' + (Auth && Auth.currentUser() ? ' and from your Google account' : '') + '.', ok: 'Continue', danger: true }).then(function (y1) {
          if (!y1) return;
          ask({ title: 'Are you absolutely sure?', message: 'This cannot be undone. Export a backup first if you might want your data back.', ok: 'Yes, reset everything', danger: true }).then(function (y2) {
            if (!y2) return; Store.wipe(); if (Auth) { Auth.clearWatermark(); Auth.deleteCloud(); } S = Store.defaultState(); ui.ob = null; ui.notice = ''; location.hash = ''; ui.route = 'today'; render();
          });
        }); break;
    }
  });
  document.addEventListener('change', function (e) {
    var el = e.target, c = el.dataset && el.dataset.chg; if (!c) return;
    switch (c) {
      case 'toggle': {
        var row = el.closest('.task'); if (row) row.classList.toggle('done', el.checked);   // instant strike-through
        var id = el.dataset.id; setTimeout(function () { toggleTask(id); }, 160); break;
      }
      case 'status': S.chapters[el.dataset.id] = el.value; persist(); $('#chlist').innerHTML = chapterList(); toast('Saved. Rebuild your plan to apply this change.'); break;
      case 'obdone': if (el.checked) ui.ob.done[el.dataset.id] = true; else delete ui.ob.done[el.dataset.id]; render(); break;
      case 'obdate': ui.ob.date = el.value; ui.ob.err = validDate(el.value) ? '' : 'Pick a future date.'; render(); break;
      case 'setname': S.examName = el.value.trim() || 'JEE Main 2027'; persist(); render(); break;
      case 'setdate': {
        var old = S.examDate, v = el.value;
        if (!validDate(v)) { toast('Pick a future date.'); render(); break; }
        S.examDate = v; persist();
        if (S.tasks.length && v !== old) ask({ title: 'Rebuild your plan?', message: v < old ? 'Your exam moved closer — rebuild your plan?' : 'Your exam date changed — rebuild your plan?', ok: 'Rebuild', cancel: 'Keep' })
          .then(function (y) { if (y) { rebuild(); toast('Plan rebuilt.'); } render(); });
        else render();
        break;
      }
      case 'setslider': S.dailyMinutes = Math.round(+el.value * 60); persist(); afterHoursChange(); break;
    }
  });
  document.addEventListener('input', function (e) {
    var el = e.target, c = el.dataset && el.dataset.inp; if (!c) return;
    if (c === 'search') { ui.chSearch = el.value; $('#chlist').innerHTML = chapterList(); }
    else if (c === 'obname') ui.ob.name = el.value;
    else if (c === 'obslider') {
      ui.ob.mins = Math.round(+el.value * 60); $('#ob-hrs-label').textContent = fmtHrs(ui.ob.mins) + ' per day';
      $('#ob-total').textContent = 'That\'s ~' + Math.floor(Math.max(0, Dates.diff(ui.ob.date, todayStr())) * ui.ob.mins / 60) + ' hours before your exam.';
    } else if (c === 'setslider') $('#s-hrs-label').textContent = fmtHrs(Math.round(+el.value * 60)) + ' per day';
  });
  document.addEventListener('change', function (e) {
    if (e.target.id !== 'import-file') return;
    var f = e.target.files[0]; e.target.value = ''; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      var st = null; try { st = Store.validate(JSON.parse(r.result)); } catch (x) { st = null; }
      if (!st) { ask({ title: 'Import failed', message: 'That file doesn\'t look like a ScorePlan backup.', ok: 'OK', noCancel: true }); return; }
      ask({ title: 'Replace your current data?', message: 'Importing overwrites the plan and progress on this device.', ok: 'Import', danger: true }).then(function (y) {
        if (y) { S = st; persist(); ui.ob = null; render(); toast('Data imported.'); }
      });
    };
    r.onerror = function () { ask({ title: 'Import failed', message: 'That file doesn\'t look like a ScorePlan backup.', ok: 'OK', noCancel: true }); };
    r.readAsText(f);
  });

  /* ---------- boot ---------- */
  if (Auth) Auth.init({
    onUserChange: function (u) {
      if (u) { setSyncStatus('idle', ''); reconcileOnSignIn(); }
      else setSyncStatus('off', '');
      render();
    },
    onSyncStatus: function (status, msg) {
      setSyncStatus(status, msg);
      if (status === 'error' && msg && msg.indexOf('Add this domain') === 0) toast(msg);
    }
  });
  var h0 = location.hash.replace('#/', ''); if (['today', 'plan', 'chapters', 'progress', 'settings'].indexOf(h0) > -1) ui.route = h0;
  render();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
