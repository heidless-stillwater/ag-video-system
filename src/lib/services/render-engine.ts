import path from 'path';
import fs from 'fs';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import axios from 'axios';
import { Scene } from './video-engine';

// Configure ffmpeg to use the static binary
const getFFmpegPath = () => {
    if (ffmpegStatic) {
        // If it starts with /ROOT or looks like a relative path, try to resolve it relative to process.cwd()
        if (ffmpegStatic.startsWith('/ROOT') || !path.isAbsolute(ffmpegStatic)) {
            const relativePath = ffmpegStatic.replace(/^\/ROOT\//, '');
            return path.join(process.cwd(), relativePath);
        }
        return ffmpegStatic;
    }
    return null;
};

const getFFprobePath = () => {
    if (ffprobeStatic && ffprobeStatic.path) {
        if (ffprobeStatic.path.startsWith('/ROOT') || !path.isAbsolute(ffprobeStatic.path)) {
            const relativePath = ffprobeStatic.path.replace(/^\/ROOT\//, '');
            return path.join(process.cwd(), relativePath);
        }
        return ffprobeStatic.path;
    }
    return null;
};

const finalFFmpegPath = getFFmpegPath();
const finalFFprobePath = getFFprobePath();

if (finalFFmpegPath) {
    console.log(`[FFmpegRenderEngine] FFmpeg path configured: ${finalFFmpegPath}`);
    ffmpeg.setFfmpegPath(finalFFmpegPath);
}
if (finalFFprobePath) {
    console.log(`[FFmpegRenderEngine] FFprobe path configured: ${finalFFprobePath}`);
    ffmpeg.setFfprobePath(finalFFprobePath);
}

// Common encoding settings to ensure all segments are identical for concatenation
// This prevents "unsupported encoding settings" errors in media players.
const H264_OPTS = [
    '-vcodec libx264',
    '-pix_fmt yuv420p',
    '-profile:v main',
    '-level 4.0',
    '-crf 18',
    '-g 30', // Ensure frequent keyframes (especially at boundaries)
    '-tune stillimage', // Optimized for documentary style
    '-r 30'
];

/**
 * Server-side service to render documentary videos using direct FFmpeg assembly.
 * Bypasses the need for a headless browser, making it extremely robust.
 */
export const renderEngine = {
    /**
     * Renders a documentary video to a local file.
     */
    async renderDocumentary(
        projectId: string,
        scenes: Scene[],
        backgroundMusicUrl?: string,
        onProgress?: (progress: number, message: string) => Promise<void>
    ): Promise<string> {
        console.log(`[FFmpegRenderEngine] Starting high-quality render for: ${projectId}`);

        const tempDir = path.join(process.cwd(), 'tmp', `render-${projectId}`);
        const outputDir = path.join(process.cwd(), 'public', 'renders');
        const outputFile = path.join(outputDir, `${projectId}.mp4`);

        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        try {
            // 1. Download all assets locally
            if (onProgress) await onProgress(0, `Downloading ${scenes.length} assets...`);
            console.log(`[FFmpegRenderEngine] Downloading assets for ${scenes.length} scenes...`);
            const assetPaths = await this.downloadAssets(projectId, scenes, backgroundMusicUrl, tempDir);

            // 2. Pre-scale images to 1080p to save memory during assembly
            console.log(`[FFmpegRenderEngine] Pre-scaling ${assetPaths.images.length} images to HD...`);
            for (let i = 0; i < assetPaths.images.length; i++) {
                if (onProgress) {
                    const progress = 10 + Math.round((i / assetPaths.images.length) * 15);
                    await onProgress(progress, `Pre-scaling image ${i + 1}/${assetPaths.images.length}...`);
                }
                const originalPath = assetPaths.images[i];
                const processedPath = path.join(tempDir, `proc-img-${i}.jpg`);
                await this.preProcessImage(originalPath, processedPath);
                assetPaths.images[i] = processedPath;
                // Delete original to save space
                fs.unlinkSync(originalPath);
            }

            // 3. Perform single-pass render with transitions
            console.log(`[FFmpegRenderEngine] Running single-pass complex render...`);
            await this.generateCineVideo(scenes, assetPaths, outputFile, tempDir, onProgress);

            console.log(`[FFmpegRenderEngine] SUCCESS: ${outputFile}`);
            return outputFile;
        } catch (error: any) {
            console.error('[FFmpegRenderEngine] FATAL ERROR:', error);
            throw new Error(`FFmpeg Rendering failed: ${error.message}`);
        } finally {
            // Cleanup temp directory
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    },

    async downloadAssets(projectId: string, scenes: Scene[], backgroundMusicUrl: string | undefined, tempDir: string) {
        const imagePaths: string[] = [];
        const audioPaths: Record<string, string> = {};
        let backgroundMusicPath: string | null = null;

        // Download Images
        for (let i = 0; i < scenes.length; i++) {
            const imgPath = path.join(tempDir, `img-${i}.jpg`);
            await this.downloadFile(scenes[i].imageUrl, imgPath);
            imagePaths.push(imgPath);
        }

        // Download Section Audio (Unique per section)
        const uniqueSections = Array.from(new Set(scenes.map(s => s.sectionId)));
        for (const sectionId of uniqueSections) {
            const sectionScenes = scenes.filter(s => s.sectionId === sectionId);
            const sceneWithAudio = sectionScenes.find(s => s.audioUrl);
            if (sceneWithAudio?.audioUrl) {
                const audPath = path.join(tempDir, `aud-${sectionId}.mp3`);
                await this.downloadFile(sceneWithAudio.audioUrl, audPath);
                audioPaths[sectionId] = audPath;
            }
        }

        // Download Music
        if (backgroundMusicUrl) {
            backgroundMusicPath = path.join(tempDir, 'music.mp3');
            await this.downloadFile(backgroundMusicUrl, backgroundMusicPath);
        }

        return { images: imagePaths, audio: audioPaths, backgroundMusic: backgroundMusicPath };
    },

    async downloadFile(url: string, dest: string) {
        const response = await axios({
            url,
            method: 'GET',
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const writer = fs.createWriteStream(dest);
        response.data.pipe(writer);
        return new Promise<void>((resolve, reject) => {
            writer.on('finish', () => resolve());
            writer.on('error', (err) => reject(err));
        });
    },

    logResources(label: string) {
        const memory = process.memoryUsage();
        const load = os.loadavg();
        console.log(`[Resources] [${label}] RAM: RSS=${(memory.rss / 1024 / 1024).toFixed(2)}MB, Heap=${(memory.heapUsed / 1024 / 1024).toFixed(2)}MB | CPU Load (1m): ${load[0].toFixed(2)}`);
    },

    async preProcessImage(src: string, dest: string) {
        return new Promise<void>((resolve, reject) => {
            ffmpeg(src)
                .outputOptions([
                    '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,setsar=1'
                ])
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .save(dest);
        });
    },

    async createSteadySegment(imgPath: string, duration: number, outPath: string) {
        return new Promise<void>((resolve, reject) => {
            ffmpeg(imgPath)
                .loop(duration)
                .outputOptions([
                    '-t', duration.toString(),
                    ...H264_OPTS
                ])
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .save(outPath);
        });
    },

    async createTransitionSegment(imgAPath: string, imgBPath: string, type: string, duration: number, outPath: string) {
        return new Promise<void>((resolve, reject) => {
            // Mapping UI types to FFmpeg xfade types
            const transitionMap: Record<string, string> = {
                'fade': 'fade',
                'blur': 'dissolve',
                'zoom': 'zoomin',
                'slide': 'slideleft'
            };
            const fType = transitionMap[type] || 'fade';

            ffmpeg()
                .input(imgAPath).inputOptions(['-loop 1', `-t ${duration}`])
                .input(imgBPath).inputOptions(['-loop 1', `-t ${duration}`])
                .complexFilter([
                    `[0:v]fps=30,format=yuv420p[v0];[1:v]fps=30,format=yuv420p[v1];[v0][v1]xfade=transition=${fType}:duration=${duration}:offset=0`
                ])
                .outputOptions([
                    '-t', duration.toString(),
                    ...H264_OPTS
                ])
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .save(outPath);
        });
    },

    async concatenateSegments(segmentPaths: string[], outPath: string, tempDir: string) {
        return new Promise<void>((resolve, reject) => {
            const listPath = path.join(tempDir, 'concat.txt');
            const listContent = segmentPaths.map(p => `file '${path.resolve(p)}'`).join('\n');
            fs.writeFileSync(listPath, listContent);

            ffmpeg()
                .input(listPath)
                .inputOptions(['-f concat', '-safe 0'])
                .outputOptions(['-c copy']) // Lossless
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .save(outPath);
        });
    },

    /**
     * Generates the final video using a single complex filter graph to handle transitions precisely.
     */
    async generateCineVideo(scenes: Scene[], assetPaths: any, outputPath: string, tempDir: string, onProgress?: (p: number, m: string) => Promise<void>) {
        this.logResources('START_GEN_VIDEO');
        const segmentFiles: string[] = [];

        try {
            for (let i = 0; i < scenes.length; i++) {
                const isLast = i === scenes.length - 1;
                const nextScene = scenes[i + 1];

                const transitionDuration = (!isLast && nextScene) ?
                    Math.min((nextScene.transitionDuration || 1000) / 1000, scenes[i].duration / 2, nextScene.duration / 2) : 0;

                // Update progress for scene rendering (25-90% range)
                if (onProgress) {
                    const progress = 25 + Math.round((i / scenes.length) * 65);
                    await onProgress(progress, `Baking scene ${i + 1}/${scenes.length}...`);
                }

                // 1. Render Steady Part
                const steadyDuration = scenes[i].duration - transitionDuration;
                if (steadyDuration > 0.05) {
                    const steadyPath = path.join(tempDir, `segment-steady-${i}.mp4`);
                    console.log(`[FFmpegRenderEngine] Rendering steady segment ${i} (${steadyDuration.toFixed(2)}s)`);
                    await this.createSteadySegment(assetPaths.images[i], steadyDuration, steadyPath);
                    segmentFiles.push(steadyPath);
                }

                // 2. Render Transition Part
                if (transitionDuration > 0) {
                    const transPath = path.join(tempDir, `segment-trans-${i}.mp4`);
                    console.log(`[FFmpegRenderEngine] Rendering transition segment ${i} -> ${i + 1} (${transitionDuration.toFixed(2)}s)`);
                    await this.createTransitionSegment(
                        assetPaths.images[i],
                        assetPaths.images[i + 1],
                        nextScene.transitionType,
                        transitionDuration,
                        transPath
                    );
                    segmentFiles.push(transPath);
                }

                this.logResources(`SCENE_${i}_COMPLETE`);
            }

            // 3. Concatenate all segments
            if (onProgress) await onProgress(90, 'Stitching segments together...');
            const silentVideoPath = path.join(tempDir, 'silent_video.mp4');
            console.log(`[FFmpegRenderEngine] Concatenating ${segmentFiles.length} segments...`);
            await this.concatenateSegments(segmentFiles, silentVideoPath, tempDir);

            // 4. Final Mux with Audio
            if (onProgress) await onProgress(95, 'Finalizing audio mix...');
            console.log(`[FFmpegRenderEngine] Final audio muxing...`);
            await this.muxFinalAudio(silentVideoPath, scenes, assetPaths, outputPath);

            if (onProgress) await onProgress(100, 'Render complete!');

            this.logResources('FINISH_GEN_VIDEO');
        } catch (error) {
            console.error('[FFmpegRenderEngine] Segmented render failed:', error);
            throw error;
        }
    },

    async muxFinalAudio(videoPath: string, scenes: Scene[], assetPaths: any, outputPath: string) {
        return new Promise<void>((resolve, reject) => {
            const command = ffmpeg(videoPath);

            // 1. Add narration inputs
            const uniqueSectionIds = Array.from(new Set(scenes.map(s => s.sectionId)));
            const audioInputMap: Record<string, number> = {};
            let inputCounter = 1; // 0 is the video

            uniqueSectionIds.forEach((sid) => {
                if (assetPaths.audio[sid]) {
                    command.input(assetPaths.audio[sid]);
                    audioInputMap[sid] = inputCounter++;
                }
            });

            // 2. Add background music
            let bgMusicIndex = -1;
            if (assetPaths.backgroundMusic) {
                command.input(assetPaths.backgroundMusic);
                bgMusicIndex = inputCounter++;
            }

            // 3. Complex Filter for Audio
            const filters: string[] = [];
            const audioMixInputs: string[] = [];

            uniqueSectionIds.forEach((sid, idx) => {
                if (assetPaths.audio[sid]) {
                    const scene = scenes.find(s => s.sectionId === sid);
                    const startTimeMs = Math.round((scene?.startTime || 0) * 1000);
                    const inputIdx = audioInputMap[sid];
                    const label = `[anar${idx}]`;
                    filters.push(`[${inputIdx}:a]adelay=${startTimeMs}|${startTimeMs}${label}`);
                    audioMixInputs.push(label);
                }
            });

            let finalNarration = '';
            if (audioMixInputs.length > 1) {
                filters.push(`${audioMixInputs.join('')}amix=inputs=${audioMixInputs.length}:duration=longest[narration]`);
                finalNarration = '[narration]';
            } else if (audioMixInputs.length === 1) {
                finalNarration = audioMixInputs[0];
            }

            let finalAudio = '';
            if (bgMusicIndex !== -1) {
                filters.push(`[${bgMusicIndex}:a]volume=0.1[bgvol]`);
                if (finalNarration) {
                    filters.push(`${finalNarration}[bgvol]amix=inputs=2:duration=first[finalaudio]`);
                    finalAudio = '[finalaudio]';
                } else {
                    finalAudio = '[bgvol]';
                }
            } else if (finalNarration) {
                finalAudio = finalNarration;
            }

            if (filters.length > 0) {
                command.complexFilter(filters);
            }

            const outputOptions = ['-c:v copy', '-map 0:v'];
            if (finalAudio) {
                outputOptions.push(`-map ${finalAudio}`);
            } else {
                outputOptions.push('-an');
            }

            command
                .outputOptions([...outputOptions, '-shortest', '-y'])
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .save(outputPath);
        });
    }
};
