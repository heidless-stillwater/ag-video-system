import os from 'os';
import { execSync } from 'child_process';

/**
 * ResourceGovernor Service
 * Monitors system health and provides recommendations for adaptive performance.
 * Specifically tuned for WSL / Low-resource environments.
 */
export class ResourceGovernor {
    private static instance: ResourceGovernor;
    private isWSL: boolean = false;

    private constructor() {
        try {
            const version = execSync('cat /proc/version').toString().toLowerCase();
            this.isWSL = version.includes('microsoft');
            if (this.isWSL) {
                console.log('[ResourceGovernor] WSL Environment detected. Activating conservative mode.');
            }
        } catch (e) {
            this.isWSL = false;
        }
    }

    public static getInstance(): ResourceGovernor {
        if (!ResourceGovernor.instance) {
            ResourceGovernor.instance = new ResourceGovernor();
        }
        return ResourceGovernor.instance;
    }

    /**
     * Returns a float from 0.0 to 1.0 representing system pressure.
     * 1.0 means the system is fully saturated (load >= core count).
     */
    public getSystemPressure(): number {
        const load = os.loadavg()[0]; // 1-minute load average
        const cores = os.cpus().length;
        return Math.min(1.0, load / cores);
    }

    /**
     * Recommended thread count for FFmpeg.
     * On high pressure or WSL, we leave more cores free.
     */
    public getRecommendedThreads(): number {
        const cores = os.cpus().length;
        const pressure = this.getSystemPressure();

        // Base: leave 2 cores free.
        let recommended = cores - 2;

        // If pressure is high, leave half cores free.
        if (pressure > 0.7 || this.isWSL) {
            recommended = Math.floor(cores / 2);
        }

        // If pressure is extreme, use only 1 thread.
        if (pressure > 0.9) {
            recommended = 1;
        }

        return Math.max(1, recommended);
    }

    /**
     * Recommended delay (ms) between intensive loop iterations.
     */
    public async getAdaptiveDelay(): Promise<void> {
        // Skip throttling in production as loadavg is unreliable in containers
        if (!this.isWSL) return;

        const pressure = this.getSystemPressure();

        let delayMs = 0;
        if (pressure > 0.6) delayMs = 500;
        if (pressure > 0.8) delayMs = 2000;
        if (pressure > 0.95) delayMs = 5000; // Cool down period

        if (this.isWSL && delayMs < 1000 && pressure > 0.5) {
            delayMs = 1000; // Always add at least 1s delay in WSL if under mid-load
        }

        if (delayMs > 0) {
            console.log(`[ResourceGovernor] WSL pressure is ${(pressure * 100).toFixed(0)}%. Applying ${delayMs}ms throttle.`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    /**
     * Recommended concurrency for batch network/disk jobs.
     */
    public getRecommendedConcurrency(defaultLimit: number = 3): number {
        const pressure = this.getSystemPressure();
        if (pressure > 0.8) return 1;
        if (pressure > 0.5) return Math.max(1, Math.floor(defaultLimit / 2));
        if (this.isWSL) return Math.min(2, defaultLimit);
        return defaultLimit;
    }

    /**
     * Checks if the system is currently "safe" to start a major operation.
     */
    public isSystemHealthy(): { healthy: boolean; reason?: string } {
        const pressure = this.getSystemPressure();
        const freeMemGB = os.freemem() / (1024 * 1024 * 1024);

        if (pressure > 0.95) return { healthy: false, reason: 'CPU load is maxed out' };
        if (freeMemGB < 0.5) return { healthy: false, reason: 'Available memory is critically low (<500MB)' };

        return { healthy: true };
    }
}

export const resourceGovernor = ResourceGovernor.getInstance();
