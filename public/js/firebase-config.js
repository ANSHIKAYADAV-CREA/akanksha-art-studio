/**
 * AKANKSHA ART STUDIO - Firebase & Cloud Firestore Integration
 * Optional: Connect your Firebase project here to store all data directly in Cloud Firestore.
 */

// Replace with your Firebase project configuration from the Firebase Console (Settings -> Project Settings -> General -> Web Apps)
const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const FirebaseService = {
  isConfigured: false,
  db: null,

  init() {
    // Check if real config keys are provided
    if (typeof firebase !== 'undefined' && firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY") {
      try {
        firebase.initializeApp(firebaseConfig);
        this.db = firebase.firestore();
        this.isConfigured = true;
        console.log("🔥 Cloud Firestore connected successfully!");
      } catch (err) {
        console.warn("Firebase initialization warning:", err.message);
      }
    } else {
      console.log("ℹ️ Running in Hybrid mode (Express REST backend + Persistent database + Local offline sync).");
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  FirebaseService.init();
});
