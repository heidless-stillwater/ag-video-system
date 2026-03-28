import { NextRequest, NextResponse } from 'next/server';
import { getAllProjects } from '@/lib/services/firestore-admin';
import { getAllUsers } from '@/lib/services/roleService';
import { withRole } from '@/lib/auth/roleMiddleware';

/**
 * GET /api/admin/projects
 * Retrieves all projects across all users.
 * Protected: Admin/SU only
 */
export const GET = withRole(['su', 'admin'], async () => {
    try {
        console.log('[Admin Projects API] Fetching all projects');

        // Fetch projects and users in parallel
        const [projects, users] = await Promise.all([
            getAllProjects(),
            getAllUsers()
        ]);

        // Create a user lookup map
        const userMap = new Map(users.map(u => [u.id, u]));

        // Enrich projects with user info
        const enrichedProjects = projects.map(project => ({
            ...project,
            user: userMap.get(project.userId) || {
                email: 'Unknown',
                displayName: 'Unknown User'
            }
        }));

        return NextResponse.json({
            success: true,
            projects: enrichedProjects
        });
    } catch (error: any) {
        console.error('[Admin Projects API] Error fetching all projects:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal Server Error'
        }, { status: 500 });
    }
});
