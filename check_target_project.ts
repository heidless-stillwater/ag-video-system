import { db } from './src/lib/firebase-admin';

async function check() {
    const projectId = 'gLbZXDrtkNRJJwTpEbTS';
    const doc = await db.collection('projects').doc(projectId).get();
    if (!doc.exists) {
        console.log('Project not found');
        return;
    }
    const data = doc.data();
    console.log(`Project: ${doc.id}`);
    console.log(`Status: ${data?.status}`);
    console.log(`DownloadUrl: ${data?.downloadUrl}`);
}

check().catch(console.error);
