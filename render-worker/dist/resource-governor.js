"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resourceGovernor = void 0;
const os_1 = __importDefault(require("os"));
exports.resourceGovernor = {
    getRecommendedThreads() {
        // Cloud run typically 2 CPUs
        const cpus = os_1.default.cpus().length;
        return cpus || 2;
    }
};
