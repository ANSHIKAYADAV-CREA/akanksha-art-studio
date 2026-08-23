/**
 * One-time script to clear the institution field from Firestore settings.
 * Run with: node server/clear-institution.js
 */
const db = require('./firebase');

async function clearInstitution() {
  try {
    console.log('🔍 Reading settings/main from Firestore...');
    const docRef = db.collection('settings').doc('main');
    const doc = await docRef.get();

    if (!doc.exists) {
      console.log('⚠️  No settings/main document found in Firestore.');
      process.exit(0);
    }

    const data = doc.data();
    console.log('Current institution value:', data.institution);

    // Clear the institution field
    await docRef.update({ institution: '' });

    console.log('✅ institution field cleared in Firestore!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

clearInstitution();
