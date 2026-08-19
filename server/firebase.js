const path = require("path");

const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccount = require(
    path.join(__dirname, "serviceAccountKey.json")
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