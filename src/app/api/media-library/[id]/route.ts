import { NextRequest, NextResponse } from 'next/server';
import { mediaLibraryServerService } from '@/lib/services/media-library-server';
import { auth } from '@/lib/firebase-admin';

/**
 * DELETE /api/media-library/[id]
 * 
 * Removes an entry from the media library.
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const { id } = await params; // Next.js 15 params are async

        await mediaLibraryServerService.deleteEntry(userId, id);
        return NextResponse.json({ success: true, message: 'Deleted successfully' });

    } catch (err: any) {
        console.error(`[API] DELETE /api/media-library/${params.id} error:`, err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * PATCH /api/media-library/[id]
 * 
 * Updates an entry's properties (e.g. isFavorite, tags).
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
        if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        const { id } = await params;
        const body = await req.json();

        await mediaLibraryServerService.updateEntry(userId, id, body);
        return NextResponse.json({ success: true, message: 'Updated successfully' });

    } catch (err: any) {
        console.error(`[API] PATCH /api/media-library/${params.id} error:`, err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
