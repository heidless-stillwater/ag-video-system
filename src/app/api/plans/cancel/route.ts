import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { planService } from '@/lib/services/plan-service';

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await getAuth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        // Call our internal plan service which handles Stripe cancellation
        await planService.cancelPlan(userId);

        return NextResponse.json({ 
            success: true, 
            message: 'Plan cancellation initiated. Your access will continue until the end of the billing period.' 
        });
    } catch (error: any) {
        console.error('Error canceling plan subscription:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
