/**
 * GET /api/prompttool/images
 *
 * Proxies PromptTool image searches into VideoSystem via the bridge service.
 * Requires authenticated VideoSystem user (Bearer token).
 *
 * Query params:
 *   userId       - filter by PT userId
 *   tags         - comma-separated tag list
 *   quality      - 'standard' | 'high' | 'ultra'
 *   aspectRatio  - '16:9' | '1:1' | etc.
 *   onlyPublished - 'true' to filter for community-published images
 *   limit        - number (max 100, default 20)
 *   orderBy      - 'createdAt' | 'downloadCount'
 *   mode         - 'community' to fetch community highlights instead
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/roleMiddleware';
import { PromptToolBridgeService, PTImageSearchOptions } from '@/lib/services/prompttool-bridge';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
    const ctx = await verifyAuth(req);
    if (!ctx) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const mode = searchParams.get('mode');

    // Community highlights shortcut
    if (mode === 'community') {
        const limit = parseInt(searchParams.get('limit') ?? '20', 10);
        const result = await PromptToolBridgeService.getCommunityHighlights(limit);
        return NextResponse.json(result);
    }

    // Build search options from query params
    const opts: PTImageSearchOptions = {};

    const userId = searchParams.get('userId');
    if (userId) opts.userId = userId;

    const tags = searchParams.get('tags');
    if (tags) opts.tags = tags.split(',').map(t => t.trim()).filter(Boolean);

    const quality = searchParams.get('quality');
    if (quality) opts.quality = quality as PTImageSearchOptions['quality'];

    const aspectRatio = searchParams.get('aspectRatio');
    if (aspectRatio) opts.aspectRatio = aspectRatio as PTImageSearchOptions['aspectRatio'];

    const onlyPublished = searchParams.get('onlyPublished');
    if (onlyPublished === 'true') opts.onlyPublished = true;

    const limit = parseInt(searchParams.get('limit') ?? '20', 10);
    opts.limit = Math.min(isNaN(limit) ? 20 : limit, 100);

    const orderBy = searchParams.get('orderBy');
    if (orderBy === 'downloadCount' || orderBy === 'createdAt') opts.orderBy = orderBy;

    const result = await PromptToolBridgeService.searchImages(opts);
    console.log(`[PT Images Proxy] Found ${result.count} images for opts:`, JSON.stringify(opts));
    return NextResponse.json(result);
}
