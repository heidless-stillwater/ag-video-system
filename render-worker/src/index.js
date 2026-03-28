"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const admin = __importStar(require("firebase-admin"));
// Initialize environment variables and Firebase Admin
dotenv_1.default.config();
if (!admin.apps.length) {
    // If GOOGLE_APPLICATION_CREDENTIALS is set, Admin SDK auto-initializes.
    // Otherwise you can provide service account credential locally.
    admin.initializeApp();
}
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
// Need high payload limit for complex scenes
app.use(express_1.default.json({ limit: '50mb' }));
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});
// Primary render trigger
app.post('/render', async (req, res) => {
    const payload = req.body;
    const { projectId } = payload;
    if (!projectId) {
        return res.status(400).json({ error: 'projectId is required' });
    }
    console.log(`[RenderWorker] Received render payload for project: ${projectId}`);
    // In Cloud Run, if CPU is allocated only during request processing,
    // we MUST NOT close the HTTP response until the render finishes.
    // If the caller times out (like Vercel dropping the connection), that's fine,
    // Cloud Run will continue processing the request until the max timeout (60m).
    try {
        console.log(`[RenderWorker] Processing job for ${projectId}...`);
        // TODO: Port render-engine.ts here
        // ...
        // Mock success for now
        res.status(200).json({ success: true, url: 'PLACEHOLDER_URL' });
    }
    catch (error) {
        console.error(`[RenderWorker] Fatal error for ${projectId}:`, error);
        res.status(500).json({ error: error.message || 'Render failed' });
    }
});
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Render worker listening on port ${PORT}`);
});
//# sourceMappingURL=index.js.map