
import { db } from './src/lib/firebase-admin';

async function createMockUser() {
    try {
        await db.collection('users').doc('mock-user-123').set({
            id: 'mock-user-123',
            email: 'director@heidless-ai.test',
            displayName: 'Lead Director (Mock)',
            roles: ['su', 'admin', 'user'],
            plan: 'premium',
            creditBalance: 100,
            createdAt: new Date(),
        });
        console.log('Mock user created in Firestore.');
        process.exit(0);
    } catch (error) {
        console.error('Error creating mock user:', error);
        process.exit(1);
    }
}

createMockUser();
