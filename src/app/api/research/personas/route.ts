import { NextRequest, NextResponse } from 'next/server';
import { getPersonas, savePersona } from '@/lib/services/persona-service';
import { withRole, withAuth } from '@/lib/auth/roleMiddleware';

export const GET = withAuth(async () => {
    try {
        const personas = await getPersonas();
        // Filter to only enabled personas for regular users
        const activePersonas = personas.filter(p => p.isEnabled);
        return NextResponse.json({ success: true, personas: activePersonas });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
});

export const POST = withRole(['su', 'admin'], async (request) => {
    try {
        const persona = await request.json();
        if (!persona.id || !persona.name) {
            return NextResponse.json({ success: false, error: 'ID and Name are required' }, { status: 400 });
        }
        await savePersona(persona);
        return NextResponse.json({ success: true, message: 'Persona saved' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
});
