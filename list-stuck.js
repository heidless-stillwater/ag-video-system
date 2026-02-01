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
    console.log('Checking for rendering projects in autovideo-db-0...');
    const snapshot = await db.collection('projects').where('status', '==', 'rendering').get();

    if (snapshot.empty) {
        console.log('No rendering projects found.');
        process.exit(0);
    }

    snapshot.forEach(doc => {
        console.log(`FOUND: ID=${doc.id}, Title=${doc.data().title}`);
    });
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
