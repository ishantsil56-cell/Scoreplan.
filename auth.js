/* ScorePlan — Firebase Auth (Google) + Firestore sync. Sign-in is the first screen;
   a skip link keeps the app usable offline without it, and the Account section in
   Settings always offers sign-in later.
   Uses the Firebase v10 compat SDK (classic scripts, no build step). Sign-in tries a
   popup first (the result comes back to this window) and falls back to the redirect
   flow where popups are blocked.
   Sync model: one Firestore doc per user (users/{uid}) holding { state, updatedAt }.
   Last write wins by updatedAt; the watermark in localStorage (scoreplan-sync-v1) records
   the newest timestamp this device has seen, so it can tell whether the cloud copy is newer. */
(function (root) {
  'use strict';
  var WM_KEY = 'scoreplan-sync-v1';
  var PENDING_KEY = 'scoreplan-signin-pending';
  var auth = null, db = null, user = null, pushTimer = null, pendingPush = null, justRedirected = false;
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

  /* On-screen diagnostics: a timestamped log of auth events. The sign-in screen shows
     it, so a failed sign-in can be diagnosed from a screenshot instead of guesses. */
  var debugLog = [];
  function debug(msg) {
    try {
      debugLog.push(new Date().toISOString().slice(11, 19) + ' ' + msg);
      if (debugLog.length > 40) debugLog.shift();
    } catch (e) {}
  }
  function getDebugLog() { return debugLog.slice(); }

  /* Plain-language sign-in errors: the app shows these on the sign-in screen, so a
     failed sign-in is never a silent "Sign in" button again. */
  function friendlyError(err) {
    if (!err) return 'Sign-in failed.';
    if (err.code === 'auth/operation-not-allowed') return 'Google sign-in is not enabled for this project. In the Firebase console: Authentication → Sign-in method → Google → Enable.';
    if (err.code === 'auth/unauthorized-domain') return 'This site is not an authorized domain. In the Firebase console: Authentication → Settings → Authorized domains → add ishantsil56-cell.github.io.';
    if (err.code === 'auth/popup-blocked') return 'The sign-in popup was blocked. Allow popups for this site and try again.';
    if (err.code === 'auth/network-request-failed') return 'Could not reach Google. Check your connection and try again.';
    if (err.code === 'auth/web-storage-unsupported') return 'This browser blocks the storage sign-in needs. Try opening ScorePlan in Chrome.';
    if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') return 'Sign-in was cancelled. Try again.';
    return err.message || err.code || 'Sign-in failed.';
  }

  function init(callbacks) {
    onUserChange = callbacks.onUserChange; onSyncStatus = callbacks.onSyncStatus;
    debug('init: SDK ' + (typeof root.firebase === 'undefined' ? 'NOT LOADED' : 'loaded') + ', configured=' + isConfigured());
    if (typeof root.firebase === 'undefined' || !isConfigured()) { status('off'); return; }
    try {
      root.firebase.initializeApp(cfg());
      auth = root.firebase.auth();
      db = root.firebase.firestore();
      debug('firebase initialized');
    } catch (e) { debug('init FAILED: ' + (e && e.message)); status('error', 'Firebase setup failed.'); return; }
    auth.onAuthStateChanged(function (u) {
      user = u;
      debug('auth state: ' + (u ? 'signed in as ' + (u.email || u.uid) : 'signed out'));
      if (u) clearPendingRedirect();
      if (!u && pushTimer) { clearTimeout(pushTimer); pushTimer = null; pendingPush = null; }
      if (onUserChange) onUserChange(u);
    });
    auth.getRedirectResult().then(function (result) {
      debug('redirect result: ' + (result && result.user ? 'user found' : 'none'));
      if (result && result.user) { justRedirected = true; clearPendingRedirect(); }
      else if (hasPendingRedirect() && !auth.currentUser) {
        /* The redirect never came back to a window that could use it: it returned to
           a different tab, whose sessionStorage has no record of the sign-in, so the
           SDK silently resolves with no user. Say so plainly instead of silence. */
        debug('LOST REDIRECT detected');
        clearPendingRedirect();
        status('error', 'The sign-in did not come back to this window — it finished in another tab. Open ScorePlan in Chrome and sign in there, then reopen the app.');
      }
    }).catch(function (err) {
      debug('redirect result ERROR: ' + (err && err.code));
      if (!err) return;
      status('error', friendlyError(err));
    });
  }

  /* Popup first: the result comes back to this window, so it can't get lost the way
     a redirect can when the return lands in another tab. Popups don't work
     everywhere (some installed PWAs and mobile browsers block them) — then fall back
     to the redirect flow. A user-cancelled popup is not a fallback case. */
  function signIn() {
    if (!auth) { debug('signIn called but auth not ready'); status('error', 'Sign-in is not ready yet. Reload the app and try again.'); return; }
    debug('signIn tapped — trying popup');
    var provider;
    try {
      provider = new root.firebase.auth.GoogleAuthProvider();
    } catch (e) {
      debug('signIn CRASH creating provider: ' + (e && e.message));
      status('error', friendlyError(e));
      return;
    }
    auth.signInWithPopup(provider).then(function () {
      debug('popup OK');
    }).catch(function (err) {
      if (!err) return;
      debug('popup FAILED: ' + err.code);
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-supported-in-this-environment' || err.code === 'auth/web-storage-unsupported') {
        debug('falling back to redirect');
        setPendingRedirect();
        auth.signInWithRedirect(provider).catch(function (err2) {
          debug('redirect FAILED: ' + (err2 && err2.code));
          clearPendingRedirect();
          if (err2) status('error', friendlyError(err2));
        });
      } else {
        status('error', friendlyError(err));
      }
    });
  }
  /* localStorage (shared across tabs) records that a redirect sign-in was started. */
  function setPendingRedirect() { try { localStorage.setItem(PENDING_KEY, '1'); } catch (e) {} }
  function clearPendingRedirect() { try { localStorage.removeItem(PENDING_KEY); } catch (e) {} }
  function hasPendingRedirect() { try { return localStorage.getItem(PENDING_KEY) === '1'; } catch (e) { return false; } }
  function signOut() { if (auth) auth.signOut().catch(function () {}); }

  /* Re-reads the current user and reports a change. The Google redirect can finish in
     the browser while this window stays stale; a focus/visibility re-check and the
     gate's "check again" button pick that up. */
  function refresh() {
    if (!auth) return;
    var u = auth.currentUser;
    if ((u && u.uid) !== (user && user.uid)) {
      user = u;
      debug('refresh: user ' + (u ? 'found' : 'gone'));
      if (onUserChange) onUserChange(u);
    }
  }
  /* True once, right after a redirect sign-in returns to this window — used for the
     "Signed in as …" confirmation. */
  function justSignedIn() { var j = justRedirected; justRedirected = false; return j; }

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

  root.SPAuth = { init: init, isConfigured: isConfigured, isAvailable: isAvailable, currentUser: currentUser, signIn: signIn, signOut: signOut, refresh: refresh, justSignedIn: justSignedIn, getDebugLog: getDebugLog, pull: pull, push: push, pushSoon: pushSoon, deleteCloud: deleteCloud, getWatermark: getWatermark, setWatermark: setWatermark, clearWatermark: clearWatermark };
})(window);
