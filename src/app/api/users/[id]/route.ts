import { NextRequest, NextResponse } from 'next/server';
import { getUserById, assignRole, removeRole, updateUserPlan } from '@/lib/services/roleService';
import { UserRole, UserPlan } from '@/types';
import { withRole } from '@/lib/auth/roleMiddleware';

/**
 * GET /api/users/[id]
 * Get a specific user by ID
 * Protected: Admin/SU only (Ordinary users should use /api/profile for their own data)
 */
export const GET = withRole(['su', 'admin'], async (
    request: NextRequest,
    context: any
) => {
    try {
        const { params } = context;
        const { id } = await params;
        const user = await getUserById(id);

        if (!user) {
            return NextResponse.json({
                success: false,
                error: 'User not found'
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            user
        });

    } catch (error: any) {
        console.error('[User API] Error getting user:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});

/**
 * PUT /api/users/[id]
 * Update user roles and/or plan
 * Body: { roles?: UserRole[], plan?: UserPlan }
 * Protected: Admin/SU only
 */
export const PUT = withRole(['su', 'admin'], async (
    request: NextRequest,
    context: any
) => {
    try {
        const { params } = context;
        const { id } = await params;
        const body = await request.json();
        const { roles, plan, action, role } = body as {
            roles?: UserRole[];
            plan?: UserPlan;
            action?: 'add' | 'remove';
            role?: UserRole;
        };

        const results: string[] = [];

        // Handle role add/remove actions
        if (action === 'add' && role) {
            const result = await assignRole(id, role);
            if (!result.success) {
                return NextResponse.json({
                    success: false,
                    error: result.error
                }, { status: 400 });
            }
            results.push(`Added role: ${role}`);
        }

        if (action === 'remove' && role) {
            const result = await removeRole(id, role);
            if (!result.success) {
                return NextResponse.json({
                    success: false,
                    error: result.error
                }, { status: 400 });
            }
            results.push(`Removed role: ${role}`);
        }

        // Handle plan update
        if (plan) {
            const result = await updateUserPlan(id, plan);
            if (!result.success) {
                return NextResponse.json({
                    success: false,
                    error: result.error
                }, { status: 400 });
            }
            results.push(`Updated plan to: ${plan}`);
        }

        // Get updated user
        const updatedUser = await getUserById(id);

        return NextResponse.json({
            success: true,
            message: results.join(', ') || 'No changes made',
            user: updatedUser
        });

    } catch (error: any) {
        console.error('[User API] Error updating user:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});
