import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables IMMEDIATELY
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Import the database ONLY after environment variables are set
const { db: dbAdmin } = require('../src/lib/firebase-admin');

async function manageCredits() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log('Usage: npx tsx scripts/manage-credits.ts <userId_or_email> <amount>');
        console.log('Example: npx tsx scripts/manage-credits.ts test@example.com 50');
        process.exit(1);
    }

    const identifier = args[0];
    const amount = parseInt(args[1], 10);

    if (isNaN(amount)) {
        console.error('Error: Amount must be a number');
        process.exit(1);
    }

    try {
        let userId = identifier;
        
        // Try to find user by email if it looks like one
        if (identifier.includes('@')) {
            console.log(`Searching for user with email: ${identifier}...`);
            const userSnap = await dbAdmin.collection('users').where('email', '==', identifier).get();
            if (userSnap.empty) {
                console.error(`Error: No user found with email ${identifier}`);
                process.exit(1);
            }
            userId = userSnap.docs[0].id;
        }

        const userDoc = dbAdmin.collection('users').doc(userId);
        const doc = await userDoc.get();

        if (!doc.exists) {
            console.error(`Error: User document ${userId} not found`);
            process.exit(1);
        }

        const currentCredits = doc.data()?.creditBalance || 0;
        console.log(`User: ${userId} (${doc.data()?.email || 'N/A'})`);
        console.log(`Current Credits: ${currentCredits}`);
        
        await userDoc.update({
            creditBalance: amount,
            updatedAt: new Date()
        });

        console.log(`✅ Success! Credit balance updated to: ${amount}`);
        process.exit(0);
    } catch (error: any) {
        console.error('Fatal Error:', error.message);
        process.exit(1);
    }
}

manageCredits();
