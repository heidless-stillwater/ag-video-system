
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables BEFORE importing firebase-admin
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Deferred import
const { db } = require('../src/lib/firebase-admin');

const PERSONAS = [
    {
        email: 'sara@heidless-ai.test',
        displayName: 'Standard Sara',
        data: {
            roles: ['user'],
            plan: 'standard',
            planNickname: 'Hobbyist',
            creditBalance: 50,
            subscriptionStatus: 'active',
            stripeSubscriptionId: 'sub_mock_standard_sara',
        }
    },
    {
        email: 'gary@heidless-ai.test',
        displayName: 'Guest Gary',
        data: {
            roles: ['user'],
            plan: 'guest',
            planNickname: 'Visitor',
            creditBalance: 0,
            subscriptionStatus: 'none',
        }
    },
    {
        email: 'paul@heidless-ai.test',
        displayName: 'Premium Paul',
        data: {
            roles: ['user'],
            plan: 'premium',
            planNickname: 'Semi-Pro',
            creditBalance: 1250,
            subscriptionStatus: 'active',
            stripeSubscriptionId: 'sub_mock_premium_paul',
            autoRefill: {
                enabled: true,
                threshold: 50,
                packSize: 300
            }
        }
    }
];

async function seedPersonas() {
    console.log('🚀 Initializing Persona Seeding (Firestore Only)...');

    for (const persona of PERSONAS) {
        try {
            // 1. Find User by Email in Firestore
            console.log(`Searching for: ${persona.email}...`);
            const userSnap = await db.collection('users').where('email', '==', persona.email).get();
            
            if (userSnap.empty) {
                console.log(`  🟡 No Firestore record found for ${persona.email}. Please sign up with this email on the UI first.`);
                continue;
            }

            const userDoc = userSnap.docs[0];
            const userId = userDoc.id;

            // 2. Seed Firestore Profile
            const timestamp = new Date();
            await db.collection('users').doc(userId).set({
                ...persona.data,
                updatedAt: timestamp,
            }, { merge: true });

            console.log(`  ✅ Profile Seeded: ${persona.displayName} (ID: ${userId})`);

        } catch (error: any) {
            console.error(`  ❌ Error seeding ${persona.email}:`, error.message);
        }
    }

    console.log('\n✨ Seeding Complete.');
    process.exit(0);
}

seedPersonas();
