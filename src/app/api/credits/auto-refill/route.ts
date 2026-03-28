import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { db } from '@/lib/firebase-admin';

export async function PUT(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await getAuth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const body = await request.json();
        const { enabled, threshold, packSize } = body;
        const stripePriceId = process.env.STRIPE_PRICE_AUTOREFILL;

        // Basic validation
        if (typeof enabled !== 'boolean' || 
            typeof threshold !== 'number' || 
            typeof packSize !== 'number' || 
            !stripePriceId) {
            console.error('Missing or invalid auto-refill configuration:', { enabled, threshold, packSize, hasPriceId: !!stripePriceId });
            return NextResponse.json({ error: 'Invalid or missing auto-refill configuration' }, { status: 400 });
        }

        const userRef = db.collection('users').doc(userId);
        await userRef.update({
            autoRefill: {
                enabled,
                threshold,
                packSize,
                stripePriceId,
            },
            updatedAt: new Date(),
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error updating auto-refill settings:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
