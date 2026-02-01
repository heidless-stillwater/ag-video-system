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
    const ids = ['0v7swEP4q06DjcGioO3Y', 'eA9yJjDozn8B22heQ2Zi'];

    for (const id of ids) {
        console.log(`Resetting project ${id}...`);
        await db.collection('projects').doc(id).update({
            status: 'assembling',
            renderProgress: 0,
            renderMessage: 'Emergency Reset triggered by Admin'
        });
        console.log(`✅ Project ${id} reset.`);
    }
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
