
import { admin } from './src/lib/firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

async function checkProjects() {
    // Ensure admin is initialized
    console.log('[Diag] Initializing Firebase Admin...');

    // The import already triggers initialization if ENV vars are set
    if (!admin.apps.length) {
        console.error('[Diag] Firebase Admin failed to initialize!');
        return;
    }

    const databases = ['(default)', 'autovideo-db-0'];

    for (const dbName of databases) {
        try {
            console.log(`\n--- Checking database: ${dbName} ---`);
            const db = getFirestore(dbName);

            console.log(`Listing ALL projects in ${dbName}...`);
            const snapshot = await db.collection('projects').get();

            console.log(`Found ${snapshot.size} total projects.`);
            snapshot.forEach(doc => {
                const data = doc.data();
                console.log(`- ID: ${doc.id} | User: ${data.userId} | Title: ${data.title} | Created: ${data.createdAt?.toDate?.() || data.createdAt}`);
            });
        } catch (error: any) {
            console.error(`Error checking database ${dbName}:`, error.message);
        }
    }
}

checkProjects();
