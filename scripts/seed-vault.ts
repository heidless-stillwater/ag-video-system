import { knowledgeService, ResearchArtifact } from '../src/lib/services/knowledge-service';

const mockArtifacts: ResearchArtifact[] = [
    {
        userId: 'dev-user-123',
        sessionId: 'session-001',
        topic: 'The Neurobiology of Deep Sleep',
        personaName: 'Dr. Aris Thorne (Neuroscientist)',
        category: 'Science',
        summary: 'Investigation into the glymphatic system and its role in metabolic waste clearance during slow-wave sleep.',
        content: `
# Decrypting the Glymphatic System: The Nightly Brain Wash

Memory consolidation and cognitive health are directly tied to the efficiency of the glymphatic system—a macroscopic waste clearance system.

### Key Observations:
1. **Delta Wave Synchronization**: During Deep Sleep (S3), cerebrospinal fluid (CSF) pulses through the brain with 2.5x more velocity than while awake.
2. **Amyloid-Beta Clearance**: Efficient sleep cycles reduce the buildup of neurotoxic proteins linked to Alzheimer's by up to 40% nightly.
3. **The Prefrontal Cortex Bias**: The first half of the night is critical for metabolic restoration, while the second half (REM) focuses on emotional processing.
        `,
        keyFindings: [
            'CSF velocity increases significantly during Delta wave synchronization',
            'Slayer wave sleep acts as a "pressure wash" for neural waste',
            'Sleep deprivation leads to immediate neuro-inflammatory spikes'
        ],
        sources: [
            'Nature Neuroscience (2023)',
            'Journal of Cerebral Blood Flow & Metabolism',
            'Stanford Sleep Medicine Center'
        ],
        createdAt: new Date()
    },
    {
        userId: 'dev-user-123',
        sessionId: 'session-002',
        topic: 'Dream Incubation in Ancient Cultures',
        personaName: 'Elias Vance (Investigative Historian)',
        category: 'History',
        summary: 'Analysis of Asklepion temples in Ancient Greece and the ritualistic use of "temple sleep" for psychic healing.',
        content: `
# Temple Sleep: The Proto-Scientific Origins of Psychoanalysis

In the 5th Century BC, the sick traveled to the sanctuaries of Asclepius to participate in *enkoimesis*—divine sleep rituals.

### Historical Patterns:
1. **Architectural Isolation**: The Abaton (sacred sleeping hall) was designed with specific acoustic properties to induce hypnagogic states.
2. **The Viper Ritual**: Non-venomous snakes were often released to crawl among sleepers, acting as sensory anchors for vivid dreaming.
3. **The Dream Catalyst**: Patients were required to share their dreams with priest-physicians, who then prescribed physical lifestyle changes.
        `,
        keyFindings: [
            'Asklepian temples were the world\'s first specialized "sleep clinics"',
            'Ancient Greeks recognized the placebo effect of ritualistic sleep environments',
            'The link between dream narratives and physical diagnosis dates back 2,500 years'
        ],
        sources: [
            'Harvard Theological Review',
            'Archaeological Institute of America',
            'The Healing Power of Dreams (Oxford Press)'
        ],
        createdAt: new Date()
    }
];

async function seed() {
    console.log('🚀 INITIALIZING KNOWLEDGE VAULT POPULATION...');
    for (const artifact of mockArtifacts) {
        try {
            await knowledgeService.storeArtifact(artifact);
            console.log(`✅ DECRYPTED & STORED: ${artifact.topic}`);
        } catch (error) {
            console.error(`❌ FAILED TO STORE: ${artifact.topic}`, error);
        }
    }
    console.log('🏁 POPULATION SEQUENCE COMPLETED.');
    process.exit(0);
}

seed();
