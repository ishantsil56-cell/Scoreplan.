/* Weakest chapters: studied first (weightage orders within the group), a 4th
   revision two weeks after finishing, revised first in the revision phase, and
   marked with a star in the plan. */
const D = require('../dates.js'), Data = require('../syllabus.js'), { SYLLABUS } = Data, { generatePlan } = require('../planner.js');
let fails = 0;
const ok = (c, m) => { if (c) console.log('  ok:', m); else { fails++; console.log('  FAIL:', m); } };
const today = '2026-11-22';
const byName = n => SYLLABUS.find(c => c.name === n);
const rot = byName('Rotational Motion'), grav = byName('Gravitation'), modern = byName('Modern Physics (Atoms, Nuclei, Dual Nature, Semiconductors)');
ok(rot && rot.weightage === 8, 'Rotational Motion is 8%');
ok(grav && grav.weightage === 3, 'Gravitation is 3%');
ok(modern && modern.weightage === 11, 'Modern Physics is 11%');

function base(weakest) {
  return { examName: 'x', examDate: D.add(today, 60), dailyMinutes: 240, chapters: {}, lastStudied: {}, studiedOn: {}, pinned: {}, weakest: weakest || {}, tasks: [] };
}

const weak = {}; weak[rot.id] = true; weak[grav.id] = true;
const t = generatePlan(base(weak), SYLLABUS, today);
const study = t.filter(x => x.type === 'study');
const firstStudy = {};
study.forEach(x => { if (!firstStudy[x.chapterId]) firstStudy[x.chapterId] = x.date; });

ok(study[0].chapterId === rot.id, 'first study task is the highest-weightage weakest chapter (Rotational Motion)');
ok(firstStudy[rot.id] <= firstStudy[grav.id], 'weakest chapters ordered by weightage (Rotational before Gravitation)');
ok(firstStudy[grav.id] < firstStudy[modern.id], 'a 3% weakest chapter is studied before the 11% non-weakest chapter');
ok(study[0].title.indexOf('★') > -1, 'weakest study tasks are starred');

const rev4 = t.filter(x => x.type === 'revise' && x.rev === 4);
ok(rev4.some(x => x.chapterId === rot.id), 'weakest chapter gets a 4th revision (rev 4)');
ok(rev4.some(x => x.chapterId === grav.id), 'second weakest chapter also gets a 4th revision');
ok(!rev4.some(x => x.chapterId === modern.id), 'non-weakest chapter gets no 4th revision');
ok(rev4.every(x => x.minutes === 60), '4th revision is 60 minutes');

const revDays = Math.min(21, Math.max(7, Math.round(60 * 0.2))), phaseStart = D.add(today, 60 - revDays);
const phaseRev = t.filter(x => x.type === 'revise' && x.date >= phaseStart);
ok(phaseRev.length > 0, 'revision phase has revise tasks');
ok(phaseRev[0].chapterId === rot.id, 'revision phase starts with the highest-weightage weakest chapter');

const ctrl = generatePlan(base({}), SYLLABUS, today).filter(x => x.type === 'study');
ok(ctrl[0].chapterId === modern.id, 'without weakest marks, the 11% chapter is studied first (control)');

if (fails) { console.log('WEAKEST CHECKS FAILED:', fails); process.exit(1); }
console.log('ALL WEAKEST CHECKS PASSED');
