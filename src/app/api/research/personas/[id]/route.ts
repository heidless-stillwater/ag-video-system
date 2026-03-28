import { NextRequest, NextResponse } from 'next/server';
import { deletePersona } from '@/lib/services/persona-service';
import { withRole } from '@/lib/auth/roleMiddleware';

export const DELETE = withRole(['su', 'admin'], async (request, { params }) => {
    try {
        const { id } = params;
        await deletePersona(id);
        return NextResponse.json({ success: true, message: 'Persona deleted' });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
});
