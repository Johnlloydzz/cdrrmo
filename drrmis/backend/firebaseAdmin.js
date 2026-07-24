const admin = require('firebase-admin');

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://cdrrmo-aa070-default-rtdb.firebaseio.com"
});

const db = admin.database();
const auth = admin.auth();

module.exports = { admin, db, auth };