import { NextRequest, NextResponse } from 'next/server';
import { getAllPlanNicknames, updatePlanNickname, resetPlanNickname } from '@/lib/services/roleService';
import { UserPlan, DEFAULT_PLAN_NICKNAMES } from '@/types';
import { withRole } from '@/lib/auth/roleMiddleware';

/**
 * GET /api/admin/nicknames
 * List all plan nicknames (custom and defaults)
 * Protected: Admin/SU only
 */
export const GET = withRole(['su', 'admin'], async () => {
    try {
        const nicknames = await getAllPlanNicknames();
        return NextResponse.json({
            success: true,
            nicknames,
            defaults: DEFAULT_PLAN_NICKNAMES
        });
    } catch (error: any) {
        console.error('[Nicknames API] Error getting nicknames:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});

/**
 * PUT /api/admin/nicknames
 * Update a plan's nickname
 * Body: { plan: UserPlan, nickname: string }
 * Protected: Admin/SU only
 */
export const PUT = withRole(['su', 'admin'], async (request: NextRequest) => {
    try {
        const body = await request.json();
        const { plan, nickname } = body as { plan: UserPlan; nickname: string };

        if (!plan || !nickname) {
            return NextResponse.json({
                success: false,
                error: 'plan and nickname are required'
            }, { status: 400 });
        }

        // Validate plan type
        const validPlans: UserPlan[] = ['guest', 'trial', 'standard', 'premium', 'custom'];
        if (!validPlans.includes(plan)) {
            return NextResponse.json({
                success: false,
                error: `Invalid plan. Must be one of: ${validPlans.join(', ')}`
            }, { status: 400 });
        }

        const result = await updatePlanNickname(plan, nickname.trim());

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Updated nickname for '${plan}' to '${nickname}'`,
            plan,
            nickname
        });

    } catch (error: any) {
        console.error('[Nicknames API] Error updating nickname:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});

/**
 * DELETE /api/admin/nicknames
 * Reset a plan's nickname to default
 * Body: { plan: UserPlan }
 * Protected: Admin/SU only
 */
export const DELETE = withRole(['su', 'admin'], async (request: NextRequest) => {
    try {
        const body = await request.json();
        const { plan } = body as { plan: UserPlan };

        if (!plan) {
            return NextResponse.json({
                success: false,
                error: 'plan is required'
            }, { status: 400 });
        }

        const result = await resetPlanNickname(plan);

        if (!result.success) {
            return NextResponse.json({
                success: false,
                error: result.error
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Reset nickname for '${plan}' to default`,
            plan,
            defaultNickname: DEFAULT_PLAN_NICKNAMES[plan]
        });

    } catch (error: any) {
        console.error('[Nicknames API] Error resetting nickname:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
});
