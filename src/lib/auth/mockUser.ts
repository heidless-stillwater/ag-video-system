import { User } from '@/types';

/**
 * Stable mock user for development and testing.
 * This user satisfies the User interface and includes default settings.
 */
export const MOCK_USER: User = {
    id: 'mock-user-123',
    email: 'director@heidless-ai.test',
    displayName: 'Lead Director (Mock)',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=director',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    settings: {
        defaultMode: 'DEV',
        notifications: true,
        autoSave: true,
        youtubeConnected: true
    },
    // Role and plan for mock user (full access for testing)
    roles: ['su', 'admin', 'user'],
    plan: 'premium',
    creditBalance: 100,
    youtubeChannelInfo: {
        id: 'UCtest-mock-channel-id',
        title: 'Heidless AI Test Channel',
        thumbnailUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=youtube'
    }
};

/**
 * Key for localStorage persistence of mock session.
 */
export const MOCK_SESSION_KEY = 'video_system_mock_session';

/**
 * Checks if mock login is enabled via environment variables.
 */
export function isMockAuthEnabled(): boolean {
    return process.env.NEXT_PUBLIC_ENABLE_MOCK_LOGIN === 'true';
}
