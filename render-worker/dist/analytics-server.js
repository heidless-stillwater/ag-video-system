"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsServerService = void 0;
exports.analyticsServerService = {
    async logUsage(data, mode) {
        console.log(`[Analytics - Mock] Logged usage:`, data);
        // We could write to firestore if we actually want this tracked in the worker.
    }
};
