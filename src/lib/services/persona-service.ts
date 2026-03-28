import { db as dbAdmin } from '../firebase-admin';
import { ResearchAgent } from '../research/agents';

/**
 * Service to manage research personas (agents) in Firestore.
 */

export interface PersonaDoc extends ResearchAgent {
    isEnabled: boolean;
    isCustom: boolean; // True if user-created
    userId?: string;   // Optional for user-specific personas
    updatedAt: Date;
}

export async function getPersonas(): Promise<PersonaDoc[]> {
    const snapshot = await dbAdmin.collection('personas').orderBy('name').get();
    return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            id: doc.id,
            ...data,
            updatedAt: data.updatedAt?.toDate() || new Date()
        } as PersonaDoc;
    });
}

export async function savePersona(persona: Omit<PersonaDoc, 'updatedAt'>): Promise<string> {
    const docRef = dbAdmin.collection('personas').doc(persona.id);
    await docRef.set({
        ...persona,
        updatedAt: new Date()
    }, { merge: true });
    return docRef.id;
}

export async function deletePersona(personaId: string): Promise<void> {
    await dbAdmin.collection('personas').doc(personaId).delete();
}

/**
 * Initializes default personas from internal constants if collection is empty.
 */
export async function seedDefaultPersonas(agents: Record<string, ResearchAgent>): Promise<void> {
    const existing = await getPersonas();
    if (existing.length > 0) return;

    const batch = dbAdmin.batch();
    Object.values(agents).forEach(agent => {
        const ref = dbAdmin.collection('personas').doc(agent.id);
        batch.set(ref, {
            ...agent,
            isEnabled: true,
            isCustom: false,
            updatedAt: new Date()
        });
    });
    await batch.commit();
}
