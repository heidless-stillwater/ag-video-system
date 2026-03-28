import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { canAccessAdmin } from '@/lib/services/roleService';
import { creditService } from '@/lib/services/credit-service';

export async function GET(
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
        const currentUserId = decodedToken.uid;

        // Admin check
        const isAdmin = await canAccessAdmin(currentUserId);
        if (!isAdmin) {
            return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const { userId } = await params;
        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        const url = new URL(request.url);
        const limitStr = url.searchParams.get('limit') || '50';
        const limit = parseInt(limitStr, 10);

        const transactions = await creditService.getTransactionHistory(userId, limit);

        return NextResponse.json({ transactions });
    } catch (error: any) {
        console.error('Error fetching user credit transactions (admin):', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
