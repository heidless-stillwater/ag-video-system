export const analyticsServerService = {
    async logUsage(data: any, mode: string) {
        console.log(`[Analytics - Mock] Logged usage:`, data);
        // We could write to firestore if we actually want this tracked in the worker.
    }
};
