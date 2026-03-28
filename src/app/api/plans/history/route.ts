import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { planService } from '@/lib/services/plan-service';

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await getAuth().verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const url = new URL(request.url);
        const limitStr = url.searchParams.get('limit') || '20';
        const limit = parseInt(limitStr, 10);

        const history = await planService.getPlanChangeHistory(userId, limit);

        return NextResponse.json({ history });
    } catch (error: any) {
        console.error('Error fetching plan history:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
