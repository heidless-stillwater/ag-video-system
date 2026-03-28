import { NextRequest, NextResponse } from 'next/server';
import { getSystemConfig, updateSystemConfig } from '@/lib/services/firestore-admin';

export async function GET() {
    try {
        const config = await getSystemConfig();
        return NextResponse.json(config);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { defaultDuration } = body;
        
        if (typeof defaultDuration !== 'number' || defaultDuration <= 0) {
            return NextResponse.json({ error: 'Invalid default duration' }, { status: 400 });
        }

        await updateSystemConfig({ defaultDuration });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
