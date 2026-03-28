import * as admin from 'firebase-admin';

export const storageService = {
    async uploadVideo(projectId: string, localPath: string, customFileName?: string): Promise<string> {
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
        } catch (e: any) {
            console.warn('[StorageService] makePublic failed. Ensure bucket is IAM public.', e.message);
        }
        return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    }
};
