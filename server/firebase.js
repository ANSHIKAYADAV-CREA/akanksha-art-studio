const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT
);

// Initialize Firebase only once
if (getApps().length === 0) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}

// Get Firestore database
const db = getFirestore();

module.exports = db;