const admin = require('firebase-admin');

// Initialize Firebase Admin
// Uses GOOGLE_APPLICATION_CREDENTIALS or default service account
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: process.env.PROJECT_ID || 'yorisoi-medical',
        // databaseURL is not consistently needed for Firestore, 
        // but useful if leveraging Realtime Database. 
        // storageBucket can be set here if needed, but we use @google-cloud/storage directly elsewhere currently.
    });
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
const auth = admin.auth();

module.exports = { admin, db, auth };
