import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/services/roleService';
import { withRole } from '@/lib/auth/roleMiddleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users
 * List all users (admin/su access required)
 */
export const GET = withRole(['su', 'admin'], async (request) => {
    try {
        const users = await getAllUsers();

        return NextResponse.json({
            success: true,
            users,
            count: users.length
        });

    } catch (error: any) {
        console.error('[Users API] Error getting users:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});
