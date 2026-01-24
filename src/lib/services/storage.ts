import { admin } from '../firebase-admin';

/**
 * Handles uploading audio buffers to Firebase Storage and returning public URLs.
 */
export const storageService = {
    /**
     * Uploads an MP3 buffer to Firebase Storage.
     * Path: projects/[projectId]/audio/[sectionId].mp3
     */
    async uploadAudio(projectId: string, sectionId: string, audioBuffer: Buffer): Promise<string> {
        const bucket = admin.storage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
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
            await file.makePublic();

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
        const bucket = admin.storage().bucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
        const fileName = `projects/${projectId}/images/${imageId}.jpg`;
        const file = bucket.file(fileName);

        try {
            await file.save(imageBuffer, {
                metadata: {
                    contentType: 'image/jpeg',
                },
            });

            await file.makePublic();
            return `https://storage.googleapis.com/${bucket.name}/${fileName}`;
        } catch (error) {
            console.error('[Storage Service] Image upload error:', error);
            throw error;
        }
    }
};
