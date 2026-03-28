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
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = void 0;
const admin = __importStar(require("firebase-admin"));
exports.storageService = {
    async uploadVideo(projectId, localPath, customFileName) {
        const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET;
        if (!bucketName) {
            throw new Error('FIREBASE_STORAGE_BUCKET is not set');
        }
        const bucket = admin.storage().bucket(bucketName);
        const fileName = customFileName
            ? `projects/${projectId}/renders/${customFileName}`
            : `projects/${projectId}/renders/${projectId}.mp4`;
        await bucket.upload(localPath, {
            destination: fileName,
            metadata: { contentType: 'video/mp4' },
        });
        const file = bucket.file(fileName);
        try {
            await file.makePublic();
        }
        catch (e) {
            console.warn('[StorageService] makePublic failed. Ensure bucket is IAM public.', e.message);
        }
        return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    }
};
