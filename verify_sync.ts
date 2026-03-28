import { db } from './src/lib/firebase-admin';
import { promptToolDb } from './src/lib/firebase-prompttool-db';

async function verifySync() {
    const email = 'test15@test.com';
    console.log(`Searching for user: ${email}`);

    try {
        // 1. Check VideoSystem (autovideo-db-0)
        const vsSnap = await db.collection('users').where('email', '==', email).get();
        
        if (vsSnap.empty) {
            console.log('❌ User NOT found in VideoSystem (autovideo-db-0)');
            process.exit(0);
        }

        const vsUser = vsSnap.docs[0].data();
        const uid = vsSnap.docs[0].id;
        console.log(`✅ User found in VideoSystem. UID: ${uid}`);
        console.log('Roles:', vsUser.roles);

        // 2. Check PromptTool (prompttool-db-0)
        const ptUserRef = promptToolDb.collection('users').doc(uid);
        const ptSnap = await ptUserRef.get();

        if (ptSnap.exists) {
            console.log('✅ User found in PromptTool (prompttool-db-0)');
            const data = ptSnap.data();
            console.log('Role:', data?.role);
            console.log('Synced At:', data?.syncedAt ? (data.syncedAt.toDate ? data.syncedAt.toDate().toISOString() : data.syncedAt) : 'N/A');
        } else {
            console.log('❌ User NOT found in PromptTool (prompttool-db-0). Sync failed or pending.');
        }
    } catch (err) {
        console.error('Error during verification:', err);
    }
    process.exit(0);
}

verifySync();
