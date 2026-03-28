'use client';

import React from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { UserRole } from '@/types';

interface RoleGuardProps {
    /** Roles that can access the guarded content */
    requiredRoles: UserRole[];
    /** Whether ANY of the roles is sufficient (OR) or ALL roles are required (AND) */
    mode?: 'any' | 'all';
    /** Content to render if access is denied */
    fallback?: React.ReactNode;
    /** Children to render if access is granted */
    children: React.ReactNode;
}

/**
 * Route/page protection component.
 * Renders children only if the user has the required role(s).
 * 
 * @example
 * // Require admin OR su role
 * <RoleGuard requiredRoles={['admin', 'su']}>
 *   <AdminPage />
 * </RoleGuard>
 * 
 * @example
 * // Require BOTH admin AND user roles
 * <RoleGuard requiredRoles={['admin', 'user']} mode="all">
 *   <SpecialPage />
 * </RoleGuard>
 */
export function RoleGuard({
    requiredRoles,
    mode = 'any',
    fallback,
    children
}: RoleGuardProps) {
    const { user, loading, hasRole } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm">Checking access...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="text-center p-8 bg-slate-800/50 rounded-2xl border border-white/10 max-w-md">
                    <div className="text-6xl mb-4">🔒</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Sign In Required</h2>
                    <p className="text-slate-400 mb-4">
                        Please sign in to access this page.
                    </p>
                </div>
            </div>
        );
    }

    const hasAccess = mode === 'any'
        ? requiredRoles.some(role => hasRole(role))
        : requiredRoles.every(role => hasRole(role));

    if (!hasAccess) {
        if (fallback) {
            return <>{fallback}</>;
        }

        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900">
                <div className="text-center p-8 bg-slate-800/50 rounded-2xl border border-white/10 max-w-md">
                    <div className="text-6xl mb-4">⛔</div>
                    <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                    <p className="text-slate-400 mb-4">
                        You don't have permission to access this page.
                        <br />
                        Required role(s): <span className="text-blue-400">{requiredRoles.join(', ')}</span>
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

export default RoleGuard;
