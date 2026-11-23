/* ScorePlan — Firebase config.
   HOW TO FILL THIS IN (one-time setup, free Spark plan — no card needed):
   1. console.firebase.google.com → Add project → name it ScorePlan (skip Google Analytics) → Create project.
   2. Authentication → Get started → Sign-in method → Google → Enable → pick a support email → Save.
   3. Authentication → Settings → Authorized domains → Add domain → ishantsil56-cell.github.io → Add.
   4. Firestore Database → Create database → Start in production mode → Enable.
   5. Firestore Database → Rules → paste the contents of firestore.rules → Publish.
   6. Project settings (gear icon) → Your apps → Web app (</>) → register it → copy the firebaseConfig values below.
   7. Commit this file.
   These values are public client identifiers, not secrets — Firebase security comes from the
   Firestore rules, not from hiding these. Do NOT upgrade the project to Identity Platform:
   on the free Spark plan that caps sign-ins at 3,000 daily active users.
   Until this is filled in, ScorePlan works exactly as before; the Account section in
   Settings says sign-in isn't set up yet. */
window.SPFirebaseConfig = {
  apiKey: 'PASTE-YOUR-API-KEY',
  authDomain: 'PASTE-YOUR-PROJECT-ID.firebaseapp.com',
  projectId: 'PASTE-YOUR-PROJECT-ID',
  storageBucket: 'PASTE-YOUR-PROJECT-ID.appspot.com',
  messagingSenderId: 'PASTE-YOUR-SENDER-ID',
  appId: 'PASTE-YOUR-APP-ID'
};
