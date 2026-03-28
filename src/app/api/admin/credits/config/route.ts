import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { isSuperUser } from '@/lib/services/roleService';
import { db } from '@/lib/firebase-admin';

// The PRICING_CONFIG is currently static in pricing.ts. 
// A full dynamic PRICING_CONFIG would involve moving it to Firestore.
// For Phase 2, we implement the scaffolding to retrieve/update it.
// If the config collection doesn't exist, we fallback to the static export (managed in UI).

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

        const configDoc = await db.collection('config').doc('pricing').get();
        if (!configDoc.exists) {
            // Return empty or signal to use static defaults
            return NextResponse.json({ config: null });
        }

        return NextResponse.json({ config: configDoc.data() });
    } catch (error: any) {
        console.error('Error fetching dynamic pricing config:', error);
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
        const { config } = body;

        if (!config) {
            return NextResponse.json({ error: 'Missing config data' }, { status: 400 });
        }

        await db.collection('config').doc('pricing').set({
            ...config,
            updatedAt: new Date(),
            updatedBy: userId,
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error updating dynamic pricing config:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
