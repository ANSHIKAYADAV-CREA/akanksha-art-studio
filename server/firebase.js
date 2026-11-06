const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

let serviceAccount;

// LOCAL: use serviceAccountKey.json
const localKeyPath = path.join(__dirname, "serviceAccountKey.json");

if (fs.existsSync(localKeyPath)) {
    console.log("🔥 Using local serviceAccountKey.json");
    serviceAccount = require(localKeyPath);
}

// RENDER: use FIREBASE_SERVICE_ACCOUNT
else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log("☁️ Using FIREBASE_SERVICE_ACCOUNT");
    try {
        let raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
        // Handle potential outer quotes added by env wrappers
        if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
            raw = raw.slice(1, -1);
        }
        // Handle escaped newlines
        if (!raw.startsWith('{') && raw.includes('{')) {
            raw = raw.substring(raw.indexOf('{'));
        }
        serviceAccount = JSON.parse(raw);
    } catch (e) {
        console.warn("⚠️ Could not parse FIREBASE_SERVICE_ACCOUNT JSON:", e.message);
    }
}

// Initialize Firebase Admin safely
let db = null;

if (serviceAccount) {
    try {
        if (getApps().length === 0) {
            initializeApp({
                credential: cert(serviceAccount)
            });
        }
        db = getFirestore();
        console.log("✅ Firebase Firestore initialized successfully!");
    } catch (err) {
        console.warn("⚠️ Firebase initialization error:", err.message);
    }
} else {
    console.warn("⚠️ No Firebase service account configured. To enable live Firestore sync, place 'server/serviceAccountKey.json' or set FIREBASE_SERVICE_ACCOUNT environment variable.");
}

module.exports = db;
