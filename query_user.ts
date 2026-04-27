import { admin } from './src/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

async function run() {
    try {
        const auth = admin.auth();
        const user = await auth.getUserByEmail('heidlessemail18@gmail.com');
        console.log('User UID:', user.uid);
        
        const dbVideo = getFirestore(admin.app(), 'autovideo-db-0');
        const dbPrompt = getFirestore(admin.app(), 'prompttool-db-0');

        console.log('============================= VIDEO SYSTEM PROJECTS =============================');
        const videoProjects = await dbVideo.collection('projects').where('ownerId', '==', user.uid).get();
        videoProjects.forEach(doc => {
            const data = doc.data();
            console.log(`- [${data.status}] ${data.title}: ${data.narrativeAngle || data.description} | Category: ${data.broadCategory} | Length: ${data.estimatedDuration}`);
        });

        console.log('============================= PROMPTS =============================');
        const promptProjects = await dbPrompt.collection('prompts').limit(10).get();
        promptProjects.forEach(doc => {
            const data = doc.data();
            console.log(`- [Prompt] ${data.title}: ${JSON.stringify(data).substring(0, 100)}...`);
        });

    } catch (e) {
        console.error('Error fetching user logic:', e);
    }
    process.exit(0);
}

run();
