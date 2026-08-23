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
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
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
