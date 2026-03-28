import { Metadata } from 'next';
import { MediaLibrary } from '@/components/media/MediaLibrary';

export const metadata: Metadata = {
    title: 'Media Library | VideoSystem',
    description: 'Centralized gallery for all your generated media assets across VideoSystem and PromptTool.',
};

export default function MediaLibraryPage() {
    return (
        <div className="min-h-[calc(100vh-64px)] overflow-hidden">
            <MediaLibrary />
        </div>
    );
}
