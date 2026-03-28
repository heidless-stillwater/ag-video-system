import { NextResponse } from 'next/server';
import { seedDefaultPersonas } from '@/lib/services/persona-service';
import { RESEARCH_AGENTS } from '@/lib/research/agents';

import { withRole } from '@/lib/auth/roleMiddleware';

export const POST = withRole(['su', 'admin'], async () => {
    try {
        await seedDefaultPersonas(RESEARCH_AGENTS);
        return NextResponse.json({ message: 'Personas seeded successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
