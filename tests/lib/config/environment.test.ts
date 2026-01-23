import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getEnvironmentMode, getConfig, estimateCost } from '@/lib/config/environment';

describe('Environment Configuration', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    describe('getEnvironmentMode', () => {
        it('should return DEV as default mode', () => {
            const mode = getEnvironmentMode();
            expect(mode).toBe('DEV');
        });
    });

    describe('getConfig', () => {
        it('should return DEV config by default', () => {
            const config = getConfig();
            expect(config.mode).toBe('DEV');
            expect(config.firebase.useEmulators).toBe(true);
            expect(config.ai.model).toBe('mock');
        });

        it('should have correct TTS settings for sleep content', () => {
            const config = getConfig();
            expect(config.tts.speakingRate).toBeLessThanOrEqual(1.0);
            expect(config.tts.speakingRate).toBeGreaterThanOrEqual(0.8);
        });
    });

    describe('estimateCost', () => {
        it('should return zero cost for DEV mode', () => {
            const cost = estimateCost(10000, 120, 'DEV');
            expect(cost.scriptGeneration).toBe(0);
            expect(cost.voiceGeneration).toBe(0);
        });

        it('should calculate costs for STAGING mode', () => {
            const cost = estimateCost(10000, 5, 'STAGING');
            expect(cost.total).toBeGreaterThan(0);
            expect(cost.scriptGeneration).toBeGreaterThanOrEqual(0);
            expect(cost.voiceGeneration).toBeGreaterThan(0);
        });

        it('should calculate higher costs for PRODUCTION mode', () => {
            const stagingCost = estimateCost(100000, 120, 'STAGING');
            const prodCost = estimateCost(100000, 120, 'PRODUCTION');

            expect(prodCost.total).toBeGreaterThan(stagingCost.total);
            expect(prodCost.voiceGeneration).toBeGreaterThan(stagingCost.voiceGeneration);
        });

        it('should estimate reasonable costs for a 2-hour documentary', () => {
            // ~200k characters for 2 hours at 130 WPM
            const cost = estimateCost(200000, 120, 'PRODUCTION');

            // Total should be roughly in the $20-30 range as per plan
            expect(cost.total).toBeGreaterThan(1);
            expect(cost.total).toBeLessThan(50);
        });
    });
});
