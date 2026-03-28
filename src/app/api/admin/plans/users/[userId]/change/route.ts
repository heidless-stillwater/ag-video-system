import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { canAccessAdmin } from '@/lib/services/roleService';
import { planService } from '@/lib/services/plan-service';
import { UserPlan } from '@/types';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await getAuth().verifyIdToken(idToken);
        const adminId = decodedToken.uid;

        // Admin check
        const isAdmin = await canAccessAdmin(adminId);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { userId } = await params;
        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        const body = await request.json();
        const { planId, reason } = body;

        if (!planId) {
            return NextResponse.json({ error: 'Missing planId' }, { status: 400 });
        }

        // Record major plan change directly (manual override)
        await planService.recordPlanChange(
            userId,
            planId as UserPlan,
            'upgrade', // Simplified label for admin override
            `admin-override: ${adminId} (${reason || 'N/A'})`
        );

        return NextResponse.json({ success: true, message: `User ${userId} plan changed to ${planId}` });
    } catch (error: any) {
        console.error('Error in admin plan change override:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
