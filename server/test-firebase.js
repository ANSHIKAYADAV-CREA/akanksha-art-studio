const db = require("./firebase");

async function testFirebase() {
    try {
        const testRef = db.collection("system").doc("connection-test");

        await testRef.set({
            connected: true,
            message: "Firebase connection successful",
            timestamp: new Date().toISOString()
        });

        console.log("✅ Firebase connected successfully!");

        const doc = await testRef.get();

        console.log("📦 Firebase data:", doc.data());

    } catch (error) {
        console.error("❌ Firebase connection failed:");
        console.error(error);
    }
}

testFirebase();