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
    console.log('Checking for generating_media projects in autovideo-db-0...');
    const snapshot = await db.collection('projects').where('status', '==', 'generating_media').get();

    if (snapshot.empty) {
        console.log('No generating_media projects found.');
    } else {
        snapshot.forEach(doc => {
            const d = doc.data();
            console.log(`FOUND: ID=${doc.id}, Title=${d.title}`);
            console.log(`  Message: ${d.mediaMessage}`);
            console.log(`  Progress: ${d.mediaProgress}%`);
        });
    }

    console.log('\nChecking for rendering projects...');
    const snapshot2 = await db.collection('projects').where('status', '==', 'rendering').get();
    if (snapshot2.empty) {
        console.log('No rendering projects found.');
    } else {
        snapshot2.forEach(doc => {
            const d = doc.data();
            console.log(`FOUND: ID=${doc.id}, Title=${d.title}`);
            console.log(`  Message: ${d.renderMessage}`);
            console.log(`  Progress: ${d.renderProgress}%`);
        });
    }
    process.exit(0);
}

run();
