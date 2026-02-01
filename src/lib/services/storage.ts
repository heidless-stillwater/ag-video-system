import { storage } from '../firebase-admin';

/**
 * Handles uploading audio buffers to Firebase Storage and returning public URLs.
 */
export const storageService = {
    /**
     * Uploads an MP3 buffer to Firebase Storage.
     * Path: projects/[projectId]/audio/[sectionId].mp3
     */
    async uploadAudio(projectId: string, sectionId: string, audioBuffer: Buffer): Promise<string> {
        const bucket = storage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
        const fileName = `projects/${projectId}/audio/${sectionId}.mp3`;
        const file = bucket.file(fileName);

        try {
            await file.save(audioBuffer, {
                metadata: {
                    contentType: 'audio/mpeg',
                },
            });

            // Make the file publicly accessible (relevant for dev/MVP)
            // Or generate a signed URL if you want it private
            try {
                await file.makePublic();
            } catch (aclError: any) {
                console.warn('[Storage Service] Could not make audio public (might be bucket settings):', aclError.message);
            }

            return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        } catch (error) {
            console.error('[Storage Service] Upload error:', error);
            throw error;
        }
    },

    /**
     * Uploads a Buffer as a JPG image to Firebase Storage.
     * Path: projects/[projectId]/images/[id].jpg
     */
    async uploadImage(projectId: string, imageId: string, imageBuffer: Buffer): Promise<string> {
        const bucket = storage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
        const fileName = `projects/${projectId}/images/${imageId}.jpg`;
        const file = bucket.file(fileName);

        try {
            await file.save(imageBuffer, {
                metadata: {
                    contentType: 'image/jpeg',
                },
            });

            try {
                await file.makePublic();
            } catch (aclError: any) {
                console.warn('[Storage Service] Could not make image public (might be bucket settings):', aclError.message);
            }
            return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        } catch (error) {
            console.error('[Storage Service] Image upload error:', error);
            throw error;
        }
    },

    /**
     * Uploads a local MP4 file to Firebase Storage.
     */
    async uploadVideo(projectId: string, localPath: string, customFileName?: string): Promise<string> {
        const bucket = storage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
        const fileName = customFileName
            ? `projects/${projectId}/renders/${customFileName}`
            : `projects/${projectId}/renders/${projectId}.mp4`;
        const file = bucket.file(fileName);

        try {
            await bucket.upload(localPath, {
                destination: fileName,
                metadata: {
                    contentType: 'video/mp4',
                },
            });

            try {
                await file.makePublic();
            } catch (aclError: any) {
                console.warn('[Storage Service] Could not make video public (might be bucket settings):', aclError.message);
            }
            return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        } catch (error) {
            console.error('[Storage Service] Video upload error:', error);
            throw error;
        }
    },

    /**
     * Gets a readable stream and file size for a rendered video.
     */
    async getVideoStream(projectId: string, archiveId?: string, customFileName?: string, start?: number, end?: number): Promise<{ stream: NodeJS.ReadableStream; size: number }> {
        const bucket = storage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
        let fileName = `projects/${projectId}/renders/${projectId}.mp4`;

        if (archiveId) {
            fileName = `projects/${projectId}/renders/archives/${projectId}_${archiveId}.mp4`;
        } else if (customFileName) {
            fileName = `projects/${projectId}/renders/${customFileName}`;
        }

        const file = bucket.file(fileName);

        const [exists] = await file.exists();
        if (!exists) throw new Error(`Video file not found in storage: ${fileName}`);

        const [metadata] = await file.getMetadata();
        const size = parseInt(metadata.size, 10);

        return {
            stream: file.createReadStream({ start, end }),
            size
        };
    },

    /**
     * Archives a rendered video by copying it to a unique path in storage.
     */
    async archiveVideo(projectId: string, label: string): Promise<{ archiveUrl: string; archiveId: string }> {
        const bucket = storage.bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
        const sourceFileName = `projects/${projectId}/renders/${projectId}.mp4`;
        const timestamp = Date.now();
        const safeLabel = label.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const archiveId = `${safeLabel}_${timestamp}`;
        const archiveFileName = `projects/${projectId}/renders/archives/${projectId}_${archiveId}.mp4`;

        const sourceFile = bucket.file(sourceFileName);
        const [exists] = await sourceFile.exists();
        if (!exists) throw new Error('Source video not found in storage');

        const archiveFile = bucket.file(archiveFileName);
        await sourceFile.copy(archiveFile);

        try {
            await archiveFile.makePublic();
        } catch (aclError: any) {
            console.warn('[Storage Service] Could not make archive public (might be bucket settings):', aclError.message);
        }

        return {
            archiveUrl: `https://storage.googleapis.com/${bucket.name}/${archiveFileName}`,
            archiveId
        };
    }
};
