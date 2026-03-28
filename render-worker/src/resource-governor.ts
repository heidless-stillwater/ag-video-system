import os from 'os';

export const resourceGovernor = {
    getRecommendedThreads(): number {
        // Cloud run typically 2 CPUs
        const cpus = os.cpus().length;
        return cpus || 2;
    }
};
