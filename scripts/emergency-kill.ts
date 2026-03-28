import axios from 'axios';
import * as admin from 'firebase-admin';
import * as path from 'path';
import { getFirestore } from 'firebase-admin/firestore';

// Load Service Account
const serviceAccount = require(path.join(process.cwd(), 'service-account.json'));
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}
const db = getFirestore(admin.app(), 'autovideo-db-0');
const cloudRunUrl = "https://render-worker-15797328912.us-central1.run.app";

async function globalKill() {
    console.log("🔪 Sending GLOBAL KILL signal to worker...");
    try {
        const response = await axios.post(`${cloudRunUrl}/kill-all`);
        console.log("✅ Worker Response:", response.data);
    } catch (err: any) {
        console.error("❌ Failed to kill all remote processes:", err.message);
    }

    // Reset EVERYTHING that might be stuck
    const stuckSnap = await db.collection("projects")
        .where("status", "in", ["rendering", "assembling", "generating_media", "failed", "error"])
        .get();

    if (stuckSnap.size > 0) {
        console.log(`⚠️  Found ${stuckSnap.size} potentially stuck projects. Force-resetting to review...`);
        const batch = db.batch();
        stuckSnap.forEach(doc => {
            batch.update(doc.ref, {
                status: "review",
                renderProgress: 0,
                renderMessage: "EMERGENCY: Forcibly terminated and reset."
            });
        });
        await batch.commit();
        console.log("✅ Projects reset to review.");
    } else {
        console.log("No stuck projects found in Firestore.");
    }
}

globalKill().catch(console.error);
