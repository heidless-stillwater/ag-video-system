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
    const projId = '0v7swEP4q06DjcGioO3Y';
    const pDoc = await db.collection('projects').doc(projId).get();
    console.log(JSON.stringify(pDoc.data(), null, 2));
    process.exit(0);
}

run();
