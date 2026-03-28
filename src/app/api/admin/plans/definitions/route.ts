import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { isSuperUser } from '@/lib/services/roleService';
import { db } from '@/lib/firebase-admin';

// Similar to the credits config, this scaffolding allows su to manage definitions.
// Note: Actual system logic relies on PLAN_DEFINITIONS in src/lib/config/pricing.ts.
// Full dynamic logic would involve hydration from Firestore on app load.

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await getAuth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const isSU = await isSuperUser(userId);
        if (!isSU) {
            return NextResponse.json({ error: 'Forbidden: Superuser access required' }, { status: 403 });
        }

        const configDoc = await db.collection('config').doc('plans').get();
        if (!configDoc.exists) {
            return NextResponse.json({ definitions: null });
        }

        return NextResponse.json({ definitions: configDoc.data() });
    } catch (error: any) {
        console.error('Error fetching plan definitions:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await getAuth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const isSU = await isSuperUser(userId);
        if (!isSU) {
            return NextResponse.json({ error: 'Forbidden: Superuser access required' }, { status: 403 });
        }

        const body = await request.json();
        const { definitions } = body;

        if (!definitions) {
            return NextResponse.json({ error: 'Missing definitions data' }, { status: 400 });
        }

        await db.collection('config').doc('plans').set({
            ...definitions,
            updatedAt: new Date(),
            updatedBy: userId,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error updating plan definitions:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
