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

// Fallback built-in service account configuration
if (!serviceAccount) {
    console.log("🔒 Using embedded Firebase service account configuration");
    serviceAccount = {
        type: "service_account",
        project_id: "akanksha-art-portfolio",
        private_key_id: "622fef92ada451def76d598855206622b8af10b9",
        private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDJkAWL/2qUPe19\nUkgZuBpnDtsqIc/g1lUgPftSN4EceSMN90C87mgq9ng64Ycw97Xu8H/prWybfO/0\np0uMRQtitl5/z2BLULaNj8zrNaWq5YhZF1qiuy4H/lCvjBvaLGYtiuBuU2AsFR59\n/uIiF7xVs2EELg5nI921kWdQ1TzJ7Dqn1u9AzGeGYPoP4jSbNdLxjGhYM01R8+5e\nXQn6TTuY1TahPD8yUETV468Ng3x/rWLCcPLtYNXKXkhtuveYGZRSEzVU3M0P4EC4\nTPN1BwfnWyts8KjBIP6DdM+/DtoGXyv5CuDg8Mm9CCBCCG2fFzhYV6Oz5a+LfAuW\nPF7oMorxAgMBAAECggEAK0o63sALKG6KgLV41clEJmk66fgcGQp/eu7E+PoByVc9\nD6VQaqN7jOqllOPWMM6q7PgLSOld36E8OhvqLmSv1tIbRrEH2fUqWAoP9V5ux98H\nYzcQWM4By2az9pgNbVTG1zYyEI/ool8gzue8spzNbsyZZBfuMPmzhukFOwepSCaK\nOCAMHWzSajadNF4RSRuf8J+03IRAHbZGCYRYEYGzmcsZkBkip5ge7LJObO09QHXj\nMunaBrEqtWFVjOX84wO0Xer2ZdJSSy1UuhQMu98EnPQky8W3Vr1eMfDz7XMxbAlC\nPWWtlZL5AChbIFnDJ0T/ZdWFy/YbJh6eYgyumMvniQKBgQDlWAUALGjkrwE+V731\np5+0hy3o0Bwz85YA3Ycm7AVGNykIvAcYctOPyfPWMRBj4Mr7WTw/FHVk4i3tCf/a\nW4dpy5RTtYd+xhLRsvcRJ0K5M2Nhrp2iVX1Dv3ylVIeMNMwCj1rHq5EQkrG/bsHM\nE0gw4ldphG5U3Z6AexBQwQRu9QKBgQDg/WOMfnzG0SKUMFa0Z28kUBgtC/B+UdsX\nKnSb3O7h9Q1puE7PO+mtlXxaeupZZr7oa2Dc+lYBEgUJCnTLruflSrvzHR1pwr95\n9lyuNO1SIcMREVnC9p3Y15v+P824P52mqLye+VOQQk+yvRbJ1MZVGRBEMq/swhN6\nj7nxhFr2jQKBgDbGAsu7z4FuWnmtMu0Mj5PqBQjpSxMNRfIG9lRRYiEW43H2lis8\noVJiBR5OsX9pHJFTCpR2KmNhsV4/WR+pZHnb6Rzk6etZGv2CJIewPLtGjqGxtmwi\nxrv7a6WAvq65nU+vNRsi2o5+unzh0t8Oa9tg80d8HW2fUE+XFJp0vr5RAoGACg1I\nFU7RZFCTqus99HFqlcS+T8Toybv+fdp3uz7zrUS1hLOnUbrrhcXX+HLlZXkhrmCd\nw0Gr9gBIGU9OSItX8PaVzxbN6Zu50kkfeukCcVjwziJoUD2Ub8uyPHm9Ry4QbRG8\n251oDlnoFaQ9EGdhNQwZnfJlyb4iAKfLNu8i4UECgYAzeXwUUnpC1UPbZoxlsdPy\nJG2ZDT/8PRMGR6CaWw+f3TyIrZUNruMqQfaBjrqQSip5fHFiOZIVYLU6pnZT8b8x\n8zM6otK3szzC+IFuEI4iFky7lB9Sp2JLQG6fC1XkTtvP1DcaOaj+wnznOMni7em1\npU1s/dBYPEWQYn7QfmAnyQ==\n-----END PRIVATE KEY-----\n",
        client_email: "firebase-adminsdk-fbsvc@akanksha-art-portfolio.iam.gserviceaccount.com",
        client_id: "105660525487965139798",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40akanksha-art-portfolio.iam.gserviceaccount.com",
        universe_domain: "googleapis.com"
    };
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
