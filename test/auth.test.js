/* ScorePlan — auth sign-in flow tests (node, fake Firebase SDK). Run: node test/auth.test.js
   Covers: popup-first with redirect fallback, user-cancelled popup (no fallback),
   lost-redirect detection via the localStorage pending flag, and a clean normal boot. */
const fs = require('fs'), vm = require('vm');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('  FAIL:', m); } else console.log('  ok:', m); };
const tick = () => new Promise(r => setTimeout(r, 20));

function makeEnv(opts) {
  opts = opts || {};
  const store = {};
  const localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; }
  };
  const calls = { popup: 0, redirect: 0 };
  const fakeAuth = {
    currentUser: opts.currentUser || null,
    onAuthStateChanged: function (cb) { this._cb = cb; },
    getRedirectResult: function () { return Promise.resolve(opts.redirectResult === undefined ? null : opts.redirectResult); },
    signInWithPopup: function () {
      calls.popup++;
      if (opts.popupError) return Promise.reject(opts.popupError);
      return Promise.resolve({ user: { uid: 'u1' } });
    },
    signInWithRedirect: function () {
      calls.redirect++;
      if (opts.redirectError) return Promise.reject(opts.redirectError);
      return Promise.resolve();
    },
    signOut: function () { return Promise.resolve(); }
  };
  const fakeFirebase = {
    initializeApp: function () {},
    auth: function () { return fakeAuth; },
    firestore: function () { return {}; }
  };
  fakeFirebase.auth.GoogleAuthProvider = function () {};
  const sandbox = {
    window: {},
    localStorage: localStorage,
    console: console,
    setTimeout: setTimeout, clearTimeout: clearTimeout,
    Promise: Promise
  };
  sandbox.window.firebase = fakeFirebase;
  sandbox.window.SPFirebaseConfig = { apiKey: 'k', authDomain: 'x.firebaseapp.com', projectId: 'x', appId: 'a' };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(__dirname + '/../auth.js', 'utf8'), sandbox);
  return { SPAuth: sandbox.window.SPAuth, fakeAuth, calls, localStorage };
}

async function run() {
  // 1. Popup success: no redirect, no pending flag.
  {
    const e = makeEnv();
    e.SPAuth.init({ onUserChange: function () {}, onSyncStatus: function () {} });
    e.SPAuth.signIn();
    await tick();
    ok(e.calls.popup === 1, 'popup tried first');
    ok(e.calls.redirect === 0, 'no redirect after popup success');
    ok(e.localStorage.getItem('scoreplan-signin-pending') === null, 'no pending flag after popup success');
    ok(e.SPAuth.getDebugLog().some(function (l) { return /trying popup/.test(l); }), 'debug log records popup attempt');
    ok(e.SPAuth.getDebugLog().some(function (l) { return /popup OK/.test(l); }), 'debug log records popup success');
  }
  // 2. Popup blocked -> redirect fallback + pending flag.
  {
    const e = makeEnv({ popupError: { code: 'auth/popup-blocked' } });
    e.SPAuth.init({ onUserChange: function () {}, onSyncStatus: function () {} });
    e.SPAuth.signIn();
    await tick();
    ok(e.calls.redirect === 1, 'redirect fallback after popup-blocked');
    ok(e.localStorage.getItem('scoreplan-signin-pending') === '1', 'pending flag set on redirect');
    ok(e.SPAuth.getDebugLog().some(function (l) { return /falling back to redirect/.test(l); }), 'debug log records redirect fallback');
  }
  // 3. Popup closed by user -> error shown, no redirect.
  {
    const e = makeEnv({ popupError: { code: 'auth/popup-closed-by-user', message: 'closed' } });
    const statuses = [];
    e.SPAuth.init({ onUserChange: function () {}, onSyncStatus: function (s, m) { statuses.push([s, m]); } });
    e.SPAuth.signIn();
    await tick();
    ok(e.calls.redirect === 0, 'no redirect after user cancelled popup');
    ok(statuses.some(function (x) { return x[0] === 'error'; }), 'cancelled popup reports an error');
  }
  // 4. Lost redirect: pending flag + null redirect result + no user -> lost-redirect error, flag cleared.
  {
    const e = makeEnv({ redirectResult: null, currentUser: null });
    e.localStorage.setItem('scoreplan-signin-pending', '1');
    const statuses = [];
    e.SPAuth.init({ onUserChange: function () {}, onSyncStatus: function (s, m) { statuses.push([s, m]); } });
    await tick();
    ok(statuses.some(function (x) { return x[0] === 'error' && /did not come back/.test(x[1]); }), 'lost redirect reports the lost-redirect error');
    ok(e.localStorage.getItem('scoreplan-signin-pending') === null, 'pending flag cleared after reporting');
    ok(e.SPAuth.getDebugLog().some(function (l) { return /LOST REDIRECT/.test(l); }), 'debug log records lost redirect');
  }
  // 5. Redirect success: result with user -> justSignedIn true, flag cleared.
  {
    const e = makeEnv({ redirectResult: { user: { uid: 'u1' } } });
    e.localStorage.setItem('scoreplan-signin-pending', '1');
    e.SPAuth.init({ onUserChange: function () {}, onSyncStatus: function () {} });
    await tick();
    ok(e.SPAuth.justSignedIn() === true, 'redirect success flags justSignedIn');
    ok(e.SPAuth.justSignedIn() === false, 'justSignedIn is one-shot');
    ok(e.localStorage.getItem('scoreplan-signin-pending') === null, 'pending flag cleared on redirect success');
  }
  // 6. No pending flag, null redirect result -> no error (normal boot).
  {
    const e = makeEnv({ redirectResult: null });
    const statuses = [];
    e.SPAuth.init({ onUserChange: function () {}, onSyncStatus: function (s, m) { statuses.push([s, m]); } });
    await tick();
    ok(!statuses.some(function (x) { return x[0] === 'error'; }), 'normal boot reports no error');
  }
  console.log(fails ? fails + ' FAILURES' : 'ALL AUTH CHECKS PASSED');
  process.exit(fails ? 1 : 0);
}
run();
