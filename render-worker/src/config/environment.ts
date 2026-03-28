export enum EnvironmentMode {
    DEVELOPMENT = 'development',
    PRODUCTION = 'production'
}

export function getConfig() {
    return {
        video: {
            resolution: process.env.VIDEO_RESOLUTION || '1080p'
        }
    };
}
