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
    // Get scriptId from project
    const pDoc = await db.collection('projects').doc(projId).get();
    const scriptId = pDoc.data().scriptId;
    console.log(`Script ID: ${scriptId}`);

    const sDoc = await db.collection('scripts').doc(scriptId).get();
    const scenes = sDoc.data().scenes;
    console.log(`Visual 1 (i=0) URL: ${scenes[0].imageUrl}`);
    console.log(`Visual 2 (i=1) URL: ${scenes[1].imageUrl}`);

    process.exit(0);
}

run();
