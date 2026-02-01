const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./service-account.json');

const projectId = 'heidless-firebase-2';

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId
    });
}

const app = admin.app();
const db = getFirestore(app, 'autovideo-db-0');

async function run() {
    const doc = await db.collection('projects').doc('0v7swEP4q06DjcGioO3Y').get();
    if (doc.exists) {
        const d = doc.data();
        console.log('--- Project Status ---');
        console.log(`Status: ${d.status}`);
        console.log(`Media Progress: ${d.mediaProgress}%`);
        console.log(`Media Message: ${d.mediaMessage}`);
        console.log(`Render Progress: ${d.renderProgress}%`);
        console.log(`Render Message: ${d.renderMessage}`);
        console.log(`Performance Profile: ${JSON.stringify(d.performanceProfile)}`);
        console.log('----------------------');
    } else {
        console.log('Project not found');
    }
    process.exit(0);
}

run();
