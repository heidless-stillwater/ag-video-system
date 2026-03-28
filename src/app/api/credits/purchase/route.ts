import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { stripeService } from '@/lib/services/stripe-service';

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await getAuth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const body = await request.json();
        const { packId } = body;

        if (!packId || typeof packId !== 'string') {
            return NextResponse.json({ error: 'Missing or invalid packId' }, { status: 400 });
        }

        const session = await stripeService.createCreditPackCheckout(userId, packId);

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('Error creating credit pack checkout:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
