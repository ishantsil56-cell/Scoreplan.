/* ScorePlan — Firebase Auth (Google) + Firestore sync. Optional: the app works fully without it.
   Uses the Firebase v10 compat SDK (classic scripts, no build step). Sign-in uses the redirect
   flow, which works inside an installed PWA where popups are blocked.
   Sync model: one Firestore doc per user (users/{uid}) holding { state, updatedAt }.
   Last write wins by updatedAt; the watermark in localStorage (scoreplan-sync-v1) records
   the newest timestamp this device has seen, so it can tell whether the cloud copy is newer. */
(function (root) {
  'use strict';
  var WM_KEY = 'scoreplan-sync-v1';
  var auth = null, db = null, user = null, pushTimer = null, pendingPush = null;
  var onUserChange = null, onSyncStatus = null;

  function cfg() { return root.SPFirebaseConfig; }
  function isConfigured() {
    var c = cfg();
    if (!c || typeof c !== 'object') return false;
    var keys = ['apiKey', 'authDomain', 'projectId', 'appId'];
    return keys.every(function (k) { return typeof c[k] === 'string' && c[k] && c[k].indexOf('PASTE-') !== 0; });
  }
  function isAvailable() { return !!auth; }
  function currentUser() { return user; }
  function status(s, msg) { if (onSyncStatus) onSyncStatus(s, msg || ''); }

  function init(callbacks) {
    onUserChange = callbacks.onUserChange; onSyncStatus = callbacks.onSyncStatus;
    if (typeof root.firebase === 'undefined' || !isConfigured()) { status('off'); return; }
    try {
      root.firebase.initializeApp(cfg());
      auth = root.firebase.auth();
      db = root.firebase.firestore();
    } catch (e) { status('error', 'Firebase setup failed.'); return; }
    auth.onAuthStateChanged(function (u) {
      user = u;
      if (!u && pushTimer) { clearTimeout(pushTimer); pushTimer = null; pendingPush = null; }
      if (onUserChange) onUserChange(u);
    });
    auth.getRedirectResult().catch(function (err) {
      if (!err) return;
      if (err.code === 'auth/unauthorized-domain') status('error', 'Add this domain in Firebase console: Authentication → Settings → Authorized domains.');
      else status('error', err.message || err.code || 'Sign-in failed.');
    });
  }

  function signIn() {
    if (!auth) return;
    var provider = new root.firebase.auth.GoogleAuthProvider();
    auth.signInWithRedirect(provider).catch(function (err) {
      if (err && err.code === 'auth/unauthorized-domain') status('error', 'Add this domain in Firebase console: Authentication → Settings → Authorized domains.');
      else if (err) status('error', err.message || err.code || 'Sign-in failed.');
    });
  }
  function signOut() { if (auth) auth.signOut().catch(function () {}); }

  function docRef() { return db.collection('users').doc(user.uid); }
  function pull() {
    if (!auth || !user) return Promise.resolve(null);
    return docRef().get().then(function (doc) {
      if (!doc.exists) return null;
      var d = doc.data();
      return d && d.state ? { state: d.state, updatedAt: d.updatedAt || '' } : null;
    });
  }
  function push(state) {
    if (!auth || !user) return Promise.reject(new Error('not signed in'));
    var ts = new Date().toISOString();
    return docRef().set({ state: state, updatedAt: ts }).then(function () { return ts; });
  }
  /* Debounced push: waits 1.5s after the last change, so a burst of edits costs one write. */
  function pushSoon(getState) {
    if (!auth || !user) return;
    pendingPush = getState;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(function () {
      pushTimer = null;
      var fn = pendingPush; pendingPush = null;
      if (!fn) return;
      status('syncing');
      push(fn()).then(function (ts) { setWatermark(ts); status('ok', ts); }).catch(function () { status('error', ''); });
    }, 1500);
  }
  function deleteCloud() {
    if (!auth || !user) return Promise.resolve();
    return docRef().delete().catch(function () {});
  }
  function getWatermark() {
    try { var w = JSON.parse(localStorage.getItem(WM_KEY)); return w && w.updatedAt ? w.updatedAt : null; } catch (e) { return null; }
  }
  function setWatermark(ts) { try { localStorage.setItem(WM_KEY, JSON.stringify({ updatedAt: ts })); } catch (e) {} }
  function clearWatermark() { try { localStorage.removeItem(WM_KEY); } catch (e) {} }

  root.SPAuth = { init: init, isConfigured: isConfigured, isAvailable: isAvailable, currentUser: currentUser, signIn: signIn, signOut: signOut, pull: pull, push: push, pushSoon: pushSoon, deleteCloud: deleteCloud, getWatermark: getWatermark, setWatermark: setWatermark, clearWatermark: clearWatermark };
})(window);
