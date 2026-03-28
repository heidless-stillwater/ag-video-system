import { NextRequest } from 'next/server';
import { StillwaterResearchService, ResearchLog } from '@/lib/research/StillwaterResearchService';
import { updateProject, getProject } from '@/lib/services/firestore-admin';
import { analyticsServerService } from '@/lib/services/analytics-server';
import { getEnvironmentMode } from '@/lib/config/environment';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const encoder = new TextEncoder();
    const { projectId, topic, persona = 'standard' } = await req.json();

    if (!projectId || !topic) {
        return new Response(JSON.stringify({ error: 'Project ID and Topic are required' }), { status: 400 });
    }

    const startTime = Date.now();
    const envMode = getEnvironmentMode();
    const project = await getProject(projectId);

    if (!project) {
        return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404 });
    }

    // CREDIT CHECK
    try {
        const { creditService } = await import('@/lib/services/credit-service');
        const RESEARCH_COST = 0.5; // Matches analytics-server.ts 'research-deep-dive'
        await creditService.deductCredits(project.userId, RESEARCH_COST);
        console.log(`[Research API] Proactively deducted ${RESEARCH_COST} credits from user: ${project.userId}`);
    } catch (creditError: any) {
        console.warn(`[Research API] Credit Check Failed: ${creditError.message}`);
        return new Response(JSON.stringify({
            error: creditError.message,
            requiresCredits: true
        }), { status: 402 }); // Payment Required
    }

    const stream = new ReadableStream({
        async start(controller) {
            const sendLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
                const data = JSON.stringify({ message, type, timestamp: new Date().toISOString() });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            };

            try {
                sendLog(`[SYSTEM] Initializing research agent for: "${topic}"`, 'info');
                sendLog(`[SYSTEM] Selecting persona: ${persona.toUpperCase()}`, 'info');

                const researchService = new StillwaterResearchService();
                
                // Initialize events
                const sendEvent = (event: string, payload: any) => {
                    const data = JSON.stringify({ ...payload, event, timestamp: new Date().toISOString() });
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                };

                const result = await researchService.performResearch(topic, persona, {
                    onLog: (log: ResearchLog) => {
                        const data = JSON.stringify({ ...log, timestamp: new Date().toISOString() });
                        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                    },
                    onEvent: (event: string, payload: any) => sendEvent(event, payload)
                });

                // Update Database
                await updateProject(projectId, {
                    status: 'scripting',
                    research: {
                        sources: result.sources || [],
                        facts: result.facts || [],
                        quotes: result.quotes || [],
                        outline: result.outline || [],
                        persona,
                        completionPercentage: 100
                    }
                });

                // Final payload - send AFTER DB update to avoid race condition
                controller.enqueue(encoder.encode(`event: complete\ndata: ${JSON.stringify({ sources: result.sources, facts: result.facts })}\n\n`));

                // TRACK ANALYTICS (Background)
                analyticsServerService.logUsage({
                    service: 'research-discovery',
                    operation: 'research-deep-dive',
                    model: 'stillwater-multi-agent',
                    inputCount: topic.length,
                    executionTimeMs: Date.now() - startTime,
                    projectId,
                    userId: project?.userId,
                    metadata: {
                        topic,
                        persona,
                        sourceCount: result.sources?.length,
                        factCount: result.facts?.length
                    }
                }, envMode).catch(e => console.error('[Research API] Analytics error:', e));

                controller.close();
            } catch (error: any) {
                console.error('[Research API] Error:', error);
                sendLog(`[FATAL] ${error.message || 'Unknown research failure'}`, 'error');
                
                // Update project status to allow retry or show error
                try {
                    // Refresh project data to get current logs
                    const currentProject = await getProject(projectId);
                    const currentLogs = currentProject?.research?.logs || [];
                    
                    await updateProject(projectId, {
                        status: 'draft', // Reset to draft so they can TRY AGAIN
                        research: {
                            ...(currentProject?.research || {
                                sources: [],
                                facts: [],
                                outline: [],
                                completionPercentage: 0
                            }),
                            lastError: error.message,
                            logs: [...currentLogs, `[ERROR] ${new Date().toISOString()}: ${error.message}`]
                        }
                    });
                } catch (dbError) {
                    console.error('[Research API] Failed to update project status on failure:', dbError);
                }

                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
