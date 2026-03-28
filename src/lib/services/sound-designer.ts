import { generateContent } from './ai';
import { SOUND_EFFECTS, AMBIANCE_LAYERS } from './audio';
import { Script } from '@/types';

export const soundDesigner = {
    async generateSoundDesign(script: Script, envMode?: any) {
        // Collect all cue descriptions
        const cues = script.sections.flatMap(s => s.visualCues || []).map(cue => ({
            id: cue.id,
            description: cue.description
        }));

        const sfxLibrary = SOUND_EFFECTS.map(s => `${s.id}: ${s.label} (${s.category})`).join('\n');
        const ambianceLibrary = AMBIANCE_LAYERS.map(a => `${a.id}: ${a.label}`).join('\n');

        const prompt = `
            You are a professional Sound Designer for cinematic, sleep-optimized documentaries.
            Your goal is to enrich the following scenes with contextual sound effects and a global ambiance.

            AVAILABLE SOUND EFFECTS (SFX):
            ${sfxLibrary}

            AVAILABLE GLOBAL AMBIANCE:
            ${ambianceLibrary}

            SCENES TO PROCESS:
            ${JSON.stringify(cues, null, 2)}

            INSTRUCTIONS:
            1. For each scene, pick the most appropriate SFX ID from the library if it fits the description. If no sound fits perfectly, leave it blank.
            2. Choose ONE global ambiance ID for the entire documentary.
            3. Return a JSON object with:
               - "ambianceId": (string)
               - "assignments": array of { 
                   "cueId": string, 
                   "sfxId": string, 
                   "delayMs": number (0-2000), 
                   "volume": number (0.1-1.0) 
                 }

            Focus on calming, atmospheric sounds. DO NOT hallucinate IDs outside the provided list.
        `;

        try {
            const response = await generateContent(prompt, envMode);
            const jsonStr = response.replace(/```json|```/g, '').trim();
            const result = JSON.parse(jsonStr) as {
                ambianceId: string;
                assignments: { cueId: string; sfxId: string; delayMs?: number; volume?: number }[]
            };

            // Map IDs back to URLs
            return {
                ambiance: AMBIANCE_LAYERS.find(a => a.id === result.ambianceId),
                assignments: result.assignments.map(as => ({
                    cueId: as.cueId,
                    sfx: SOUND_EFFECTS.find(s => s.id === as.sfxId),
                    sfxOffset: as.delayMs,
                    sfxVolume: as.volume
                })).filter(as => as.sfx) // Filter out any failed matches
            };
        } catch (error) {
            console.error('[Sound Designer] AI generation failed:', error);
            return {
                ambiance: AMBIANCE_LAYERS[0],
                assignments: []
            };
        }
    }
};
