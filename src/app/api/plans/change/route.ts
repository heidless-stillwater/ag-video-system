import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { stripeService } from '@/lib/services/stripe-service';
import { UserPlan } from '@/types';

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
        const { planId } = body;

        if (!planId || typeof planId !== 'string') {
            return NextResponse.json({ error: 'Missing or invalid planId' }, { status: 400 });
        }

        // Create Stripe checkout session for plan subscription
        const session = await stripeService.createPlanCheckout(userId, planId as UserPlan);

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('Error initiating plan change:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
