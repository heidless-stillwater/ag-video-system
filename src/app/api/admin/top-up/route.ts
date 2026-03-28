import { NextRequest, NextResponse } from 'next/server';
import { withRole } from '@/lib/auth/roleMiddleware';
import { creditService } from '@/lib/services/credit-service';
import { db } from '@/lib/firebase-admin';

/**
 * POST /api/admin/top-up
 * Admin tool to top up credits for a user
 */
export const POST = withRole(['admin', 'su'], async (request) => {
    try {
        const body = await request.json();
        const { userId, amount } = body;
        let identifier = userId; // Map for existing logic

        if (!identifier || typeof amount !== 'number') {
            return NextResponse.json({ success: false, error: 'User identifier and numeric amount required' }, { status: 400 });
        }

        let targetUserId = userId;

        // If it looks like an email, try to find the user ID
        if (identifier.includes('@')) {
            const userSnap = await db.collection('users').where('email', '==', identifier).limit(1).get();
            if (userSnap.empty) {
                return NextResponse.json({ success: false, error: `No user found with email ${identifier}` }, { status: 404 });
            }
            targetUserId = userSnap.docs[0].id;
        }

        const newBalance = await creditService.addCredits(targetUserId, amount, 'admin-topup');

        return NextResponse.json({ 
            success: true, 
            message: `Successfully added ${amount} credits to user ${identifier}`,
            newBalance 
        });
    } catch (error: any) {
        console.error('[AdminTopUp API] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
});
