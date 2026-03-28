import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { db } from '@/lib/firebase-admin';
import { planService } from '@/lib/services/plan-service';
import { User } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await getAuth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const userData = userDoc.data() as User;
        const currentPlan = userData.plan || 'guest';
        const planDef = planService.getPlanDefinition(currentPlan);

        return NextResponse.json({ 
            plan: currentPlan,
            planDefinition: planDef,
            planStartedAt: userData.planStartedAt,
            planExpiresAt: userData.planExpiresAt,
            subscriptionStatus: userData.subscriptionStatus,
        });
    } catch (error: any) {
        console.error('Error fetching current plan:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
