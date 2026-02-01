import { db } from './src/lib/services/firestore-admin';

async function checkRenderingProjects() {
    const snapshot = await db.collection('projects').where('status', '==', 'rendering').get();
    if (snapshot.empty) {
        console.log('No projects with status "rendering" found.');
        return;
    }

    snapshot.forEach(doc => {
        console.log(`STUCK PROJECT FOUND:`);
        console.log(`ID: ${doc.id}`);
        console.log(`Title: ${doc.data().title}`);
        console.log(`Message: ${doc.data().renderMessage}`);
        console.log(`Progress: ${doc.data().renderProgress}%`);
    });
}

checkRenderingProjects();
