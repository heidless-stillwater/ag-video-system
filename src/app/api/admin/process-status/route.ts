import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Diagnostic API endpoint to check for running render processes.
 * Returns information about active FFmpeg and compositor processes.
 */
export async function GET(req: NextRequest) {
    try {
        console.log('[Process Status API] Checking for running render processes');

        // Check for FFmpeg processes
        let ffmpegProcesses = [];
        try {
            const { stdout: ffmpegOut } = await execAsync('ps aux | grep -i ffmpeg | grep -v grep');
            ffmpegProcesses = ffmpegOut.trim().split('\n').filter(line => line.length > 0);
        } catch (err) {
            // No processes found (grep returns exit code 1)
            ffmpegProcesses = [];
        }

        // Check for compositor processes
        let compositorProcesses = [];
        try {
            const { stdout: compOut } = await execAsync('ps aux | grep -i compositor | grep -v grep');
            compositorProcesses = compOut.trim().split('\n').filter(line => line.length > 0);
        } catch (err) {
            compositorProcesses = [];
        }

        // Get system resource usage
        let memoryInfo = {};
        let cpuInfo = {};

        try {
            const { stdout: memOut } = await execAsync('free -m');
            const memLines = memOut.trim().split('\n');
            if (memLines.length > 1) {
                const memValues = memLines[1].split(/\s+/);
                memoryInfo = {
                    total: parseInt(memValues[1]),
                    used: parseInt(memValues[2]),
                    free: parseInt(memValues[3]),
                    available: parseInt(memValues[6] || memValues[3])
                };
            }
        } catch (err) {
            console.warn('[Process Status API] Could not get memory info:', err);
        }

        try {
            const { stdout: cpuOut } = await execAsync('top -bn1 | grep "Cpu(s)"');
            cpuInfo = { raw: cpuOut.trim() };
        } catch (err) {
            console.warn('[Process Status API] Could not get CPU info:', err);
        }

        const totalProcesses = ffmpegProcesses.length + compositorProcesses.length;

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            processes: {
                ffmpeg: {
                    count: ffmpegProcesses.length,
                    details: ffmpegProcesses
                },
                compositor: {
                    count: compositorProcesses.length,
                    details: compositorProcesses
                },
                total: totalProcesses
            },
            system: {
                memory: memoryInfo,
                cpu: cpuInfo
            },
            status: totalProcesses > 0 ? 'ACTIVE_RENDERS' : 'IDLE'
        });
    } catch (error: any) {
        console.error('[Process Status API] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to check process status' },
            { status: 500 }
        );
    }
}
