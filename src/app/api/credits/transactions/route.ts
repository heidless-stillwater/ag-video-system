import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { creditService } from '@/lib/services/credit-service';

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
        
        // Offset/pagination placeholder (can be expanded later with lastDoc)
        const offsetStr = url.searchParams.get('offset') || '0';
        const offset = parseInt(offsetStr, 10);

        const transactions = await creditService.getTransactionHistory(userId, limit, offset);

        return NextResponse.json({ transactions });
    } catch (error: any) {
        console.error('Error fetching credit transactions:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
