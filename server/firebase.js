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
        console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", e.message);
        throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT JSON: " + e.message);
    }
}

else {
    throw new Error(
        "Firebase credentials not found. Missing serviceAccountKey.json and FIREBASE_SERVICE_ACCOUNT."
    );
}

// Initialize Firebase only once
if (getApps().length === 0) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}

// Get Firestore database
const db = getFirestore();

console.log("✅ Firebase Firestore initialized successfully!");

module.exports = db;
