/* ScorePlan — storage: one key, localStorage, with in-memory fallback. */
(function (root) {
  var KEY = 'scoreplan-state-v1';
  var blocked = false;

  function defaultState() {
    return {
      examType: 'main', examName: 'JEE Main 2027', examDate: '2027-01-20', dailyMinutes: 240,
      chapters: {}, lastStudied: {}, studiedOn: {}, pinned: {},
      tasks: [], planGeneratedAt: null, onboardingDone: false
    };
  }
  function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
  /* Returns a normalised state, or null if the shape is wrong. */
  function validate(o) {
    if (!isObj(o)) return null;
    if (o.app === 'scoreplan' && isObj(o.state)) o = o.state;
    if (typeof o.examDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.examDate)) return null;
    if (typeof o.dailyMinutes !== 'number' || !isFinite(o.dailyMinutes)) return null;
    if (!isObj(o.chapters) || !Array.isArray(o.tasks)) return null;
    var okT = o.tasks.every(function (t) {
      return isObj(t) && typeof t.id === 'string' && typeof t.date === 'string' &&
        typeof t.type === 'string' && typeof t.minutes === 'number';
    });
    if (!okT) return null;
    var d = defaultState();
    return {
      examType: ['main', 'adv', 'neet'].indexOf(o.examType) > -1 ? o.examType : 'main',
      examName: typeof o.examName === 'string' ? o.examName : d.examName,
      examDate: o.examDate, dailyMinutes: o.dailyMinutes > 0 ? o.dailyMinutes : 240,
      chapters: o.chapters, lastStudied: isObj(o.lastStudied) ? o.lastStudied : {},
      studiedOn: isObj(o.studiedOn) ? o.studiedOn : {}, pinned: isObj(o.pinned) ? o.pinned : {},
      tasks: o.tasks, planGeneratedAt: typeof o.planGeneratedAt === 'string' ? o.planGeneratedAt : null,
      onboardingDone: !!o.onboardingDone
    };
  }
  function load() {
    try {
      localStorage.setItem(KEY + '-probe', '1'); localStorage.removeItem(KEY + '-probe');
      var raw = localStorage.getItem(KEY);
      return raw ? validate(JSON.parse(raw)) : null;
    } catch (e) { blocked = true; return null; }
  }
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
    catch (e) { blocked = true; return false; }
  }
  function wipe() { try { localStorage.removeItem(KEY); } catch (e) {} }
  function exportJSON(state) {
    return JSON.stringify({ app: 'scoreplan', version: 1, exportedAt: new Date().toISOString(), state: state }, null, 2);
  }
  root.SPStorage = { defaultState: defaultState, validate: validate, load: load, save: save, wipe: wipe, exportJSON: exportJSON, isBlocked: function () { return blocked; } };
})(window);
