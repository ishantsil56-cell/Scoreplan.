const D = require('../dates.js'), Data = require('../syllabus.js'), { SYLLABUS, subjectTotals } = Data, { generatePlan } = require('../planner.js');
let fails = 0;
var ok = (c, m) => { if (!c) { fails++; console.log('  FAIL:', m); } };
const today = '2026-11-22';
Data.ORDER.forEach(k => { const p = Data.getPack(k), tt = subjectTotals(p);
  p.subjects.forEach(s => ok(tt[s] === 100, k + ' ' + s + ' sums to ' + tt[s]));
  ok(new Set(p.chapters.map(c => c.id)).size === p.chapters.length, k + ' duplicate ids');
  console.log(k, p.chapters.length, 'chapters', JSON.stringify(tt)); });
console.log('subject totals', subjectTotals(), 'chapters', SYLLABUS.length);
function base(days, mins, extra) {
  return Object.assign({ examName: 'x', examDate: D.add(today, days), dailyMinutes: mins, chapters: {}, lastStudied: {}, studiedOn: {}, pinned: {}, tasks: [] }, extra || {});
}
function check(days, mins, label) {
  console.log('\n==', label, days + 'd', mins + 'min');
  const s = base(days, mins), t = generatePlan(s, SYLLABUS, today);
  const by = {}; t.forEach(x => (by[x.date] = by[x.date] || []).push(x));
  const crash = days < 14, revDays = crash ? days : Math.min(21, Math.max(7, Math.round(days * 0.2))), learn = days - revDays;
  for (let i = 0; i < days; i++) {
    const dt = D.add(today, i), ts = by[dt] || [], sum = ts.reduce((a, x) => a + x.minutes, 0);
    ok(sum <= mins + 15, dt + ' over capacity ' + sum);
    const nw = new Set(ts.filter(x => x.type === 'study').map(x => x.chapterId)).size;
    ok(nw <= 2, dt + ' >2 new chapters');
    if (i >= learn) ok(!ts.some(x => x.type === 'study'), dt + ' study in revision phase');
  }
  const last = by[D.add(today, days - 1)] || [];
  ok(last.reduce((a, x) => a + x.minutes, 0) <= 120, 'day before exam not light');
  if (!crash) {
    for (let j = 0; j + 2 < revDays; j += 3) {
      const win = []; for (let q = j; q < j + 3; q++) win.push(...(by[D.add(today, learn + q)] || []));
      ok(win.some(x => x.type === 'mock') || j + 3 >= revDays, 'no mock in window ' + j);
    }
    // revisions at +1,+3,+7 for each fully scheduled chapter
    const studyEnd = {}; t.filter(x => x.type === 'study').forEach(x => studyEnd[x.chapterId] = x.date);
    let checked = 0;
    for (const id in studyEnd) for (const [k, off] of [[1, 1], [2, 3], [3, 7]]) {
      const rd = D.add(studyEnd[id], off);
      if (D.diff(rd, today) < learn) { checked++; ok(t.some(x => x.type === 'revise' && x.chapterId === id && x.rev === k), id + ' missing R' + k); }
    }
    console.log('  revision slots verified:', checked);
  }
  console.log('  tasks', t.length, '| study chapters', new Set(t.filter(x => x.type === 'study').map(x => x.chapterId)).size, '| mocks', t.filter(x => x.type === 'mock').length);
  return t;
}
const t = check(60, 240, 'worked example');
const d0 = t.filter(x => x.date === today);
ok(d0.length === 1 && d0[0].title === 'Study: Modern Physics (Atoms, Nuclei, Dual Nature, Semiconductors)' && d0[0].minutes === 240, 'Day1 must be Modern Physics 4h');
const mp = t.filter(x => x.chapterId === 'phy-modern-physics-atoms-nuclei-dual-nature-semiconductors' && x.type === 'revise' && x.rev > 0);
console.log('Modern Physics revisions:', mp.map(x => D.diff(x.date, today) + 1 + ':' + x.minutes).join(', '), '(expect 2:30, 4:30, 8:45)');
ok(mp.map(x => D.diff(x.date, today) + 1).join() === '2,4,8', 'revisions Days 2/4/8');
const d1 = t.filter(x => x.date === D.add(today, 1)).map(x => x.title + ' ' + x.minutes);
console.log('Day2:', d1);
[[120, 240], [45, 120], [30, 360], [14, 240], [13, 240], [8, 180], [3, 120], [1, 240], [90, 600], [25, 60]].forEach(([d, m]) => check(d, m, 'scenario'));

// rebuild: past days untouched, missed boosted
const s = base(60, 240); s.tasks = generatePlan(s, SYLLABUS, today);
const day3 = D.add(today, 3); s.tasks.filter(x => x.date < day3 && x.type === 'study').forEach((x, i) => { if (i === 0) { x.done = true; s.chapters[x.chapterId] = 'done'; s.studiedOn[x.chapterId] = x.date; } });
const before = JSON.stringify(s.tasks.filter(x => x.date < day3));
const t2 = generatePlan(s, SYLLABUS, day3);
ok(JSON.stringify(t2.filter(x => x.date < day3)) === before, 'rebuild must keep past days untouched');
const missed = s.tasks.filter(x => x.date < day3 && x.type === 'study' && !x.done).map(x => x.chapterId);
console.log('\nrebuild: missed chapters re-queued:', missed.every(id => t2.some(x => x.date >= day3 && x.chapterId === id && x.type === 'study')));

// every pack plans cleanly
Data.ORDER.forEach(k => { const p = Data.getPack(k); const s = base(75, 300, { examType: k }); const tt = generatePlan(s, p.chapters, today);
  const bad = tt.filter(x => x.chapterId && !p.chapters.some(c => c.id === x.chapterId));
  ok(bad.length === 0, k + ' tasks reference foreign chapters');
  console.log(k, 'plan:', tt.length, 'tasks,', new Set(tt.filter(x => x.type === 'study').map(x => x.chapterId)).size, 'chapters studied'); });
console.log(fails ? 'PACK CHECKS FAILED' : 'ALL PACK CHECKS PASSED');
process.exit(fails ? 1 : 0);
