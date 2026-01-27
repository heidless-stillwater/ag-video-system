import path from 'path';
import fs from 'fs';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import axios from 'axios';
import { Scene } from './video-engine';
import { analyticsServerService } from './analytics-server';
import { EnvironmentMode } from '../config/environment';
import { resourceGovernor } from './resource-governor';

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
// WSL Stability: Use 'veryfast' preset and dynamically adaptive threads.
const getDynamicH264Opts = () => {
    const threadCount = resourceGovernor.getRecommendedThreads();
    return [
        '-vcodec libx264',
        '-pix_fmt yuv420p',
        '-profile:v main',
        '-level 5.1',
        '-crf 18',
        '-g 30',
        '-tune stillimage',
        '-preset veryfast',
        `-threads ${threadCount}`,
        '-r 30'
    ];
};

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
        backgroundMusicVolume: number = 0.2,
        ambianceUrl?: string,
        ambianceVolume: number = 0.1,
        narrationVolume: number = 1.0,
        globalSfxVolume: number = 0.4,
        subtitlesEnabled: boolean = false,
        subtitleStyle: string = 'minimal',
        onProgress?: (progress: number, message: string) => Promise<void>
    ): Promise<string> {
        console.log(`[FFmpegRenderEngine] Starting high-fidelity 4K render for: ${projectId} (Subtitles: ${subtitlesEnabled}, Narration: ${narrationVolume}, SFX: ${globalSfxVolume})`);

        const startTime = Date.now();
        const tempDir = path.join(process.cwd(), 'tmp', `render-${projectId}`);
        const outputDir = path.join(process.cwd(), 'public', 'renders');
        const outputFile = path.join(outputDir, `${projectId}.mp4`);

        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

        try {
            // 1. Download all assets locally
            if (onProgress) await onProgress(0, `Downloading ${scenes.length} assets...`);
            console.log(`[FFmpegRenderEngine] Downloading assets for ${scenes.length} scenes...`);
            const assetPaths = await this.downloadAssets(projectId, scenes, backgroundMusicUrl, ambianceUrl, tempDir);

            // 2. Pre-scale images to 4K to match preview fidelity
            console.log(`[FFmpegRenderEngine] Pre-scaling ${assetPaths.images.length} images to 4K Ultra HD...`);
            for (let i = 0; i < assetPaths.images.length; i++) {
                if (onProgress) {
                    const progress = 10 + Math.round((i / assetPaths.images.length) * 15);
                    await onProgress(progress, `Processing 4K visual ${i + 1}/${assetPaths.images.length}...`);
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
            await this.generateCineVideo(scenes, assetPaths, outputFile, tempDir, onProgress, backgroundMusicVolume, ambianceVolume, narrationVolume, globalSfxVolume, subtitlesEnabled, subtitleStyle);

            console.log(`[FFmpegRenderEngine] SUCCESS: ${outputFile}`);

            // 8. Log Analytics
            const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
            await analyticsServerService.logUsage({
                service: 'render',
                operation: 'rendering',
                model: 'ffmpeg-h264',
                inputCount: Math.ceil(totalDuration), // Duration in seconds
                executionTimeMs: Date.now() - startTime,
                projectId: projectId
            }, 'PRODUCTION'); // Rendering is always considered a heavy/production-level task

            return outputFile;
        } catch (error: any) {
            console.error('[FFmpegRenderEngine] FATAL ERROR:', error);
            throw new Error(`FFmpeg Rendering failed: ${error.message}`);
        } finally {
            // Cleanup temp directory
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    },

    async downloadAssets(projectId: string, scenes: Scene[], backgroundMusicUrl: string | undefined, ambianceUrl: string | undefined, tempDir: string) {
        const imagePaths: string[] = [];
        const audioPaths: Record<string, string> = {};
        const sfxPaths: Record<string, string> = {};
        let backgroundMusicPath: string | null = null;
        let ambiancePath: string | null = null;

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

        // Download SFX
        for (const scene of scenes) {
            if (scene.sfxUrl) {
                const sfxPath = path.join(tempDir, `sfx-${scene.id}.mp3`);
                await this.downloadFile(scene.sfxUrl, sfxPath);
                sfxPaths[scene.id] = sfxPath;
            }
        }

        // Download Background Music
        if (backgroundMusicUrl) {
            backgroundMusicPath = path.join(tempDir, 'bg-music.mp3');
            console.log(`[FFmpegRenderEngine] Downloading background music: ${backgroundMusicUrl}`);
            await this.downloadFile(backgroundMusicUrl, backgroundMusicPath);
        }

        // Download Ambiance
        if (ambianceUrl) {
            ambiancePath = path.join(tempDir, 'ambiance.mp3');
            console.log(`[FFmpegRenderEngine] Downloading ambiance: ${ambianceUrl}`);
            await this.downloadFile(ambianceUrl, ambiancePath);
        }

        return { images: imagePaths, audio: audioPaths, backgroundMusic: backgroundMusicPath, ambiance: ambiancePath, sfx: sfxPaths };
    },

    generateAssFile(scenes: Scene[], tempDir: string, styleType: string = 'minimal'): string {
        const assPath = path.join(tempDir, 'subtitles.ass');

        let fontSize = 128;
        let bold = 0;
        let primaryColour = '&H33FFFFFF'; // 80% opacity white

        if (styleType === 'bold') {
            fontSize = 144;
            bold = -1; // ASS bold is -1
            primaryColour = '&H00FFFFFF'; // 100% white
        } else if (styleType === 'classic') {
            fontSize = 116;
            primaryColour = '&H00FFFFFF';
        }

        const header = [
            '[Script Info]',
            'Title: VideoSystem Subtitles',
            'ScriptType: v4.00+',
            'WrapStyle: 0',
            'ScaledBorderAndShadow: yes',
            'YCbCr Matrix: TV.601',
            'PlayResX: 3840',
            'PlayResY: 2160',
            '',
            '[V4+ Styles]',
            'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
            `Style: Default,Arial,${fontSize},${primaryColour},&H000000FF,&H00000000,&H80000000,${bold},0,0,0,100,100,2,0,1,0,2,2,300,300,200,1`,
            '',
            '[Events]',
            'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text'
        ].join('\n');

        const formatAssTime = (seconds: number) => {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            const ms = Math.floor((seconds % 1) * 100); // ASS uses centiseconds
            return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
        };

        const dialogues = scenes
            .filter(s => s.narrationText)
            .map(scene => {
                const start = formatAssTime(scene.startTime);
                const end = formatAssTime(scene.startTime + scene.duration);
                // Escape simple braces and replace newlines with \N
                const text = scene.narrationText!.replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/\n/g, '\\N');
                return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
            })
            .join('\n');

        fs.writeFileSync(assPath, header + '\n' + dialogues + '\n');
        return assPath;
    },

    async downloadFile(url: string, dest: string) {
        if (!url.startsWith('http')) {
            const localPath = path.join(process.cwd(), 'public', url);
            console.log(`[FFmpegRenderEngine] Using local asset: ${localPath}`);
            if (fs.existsSync(localPath)) {
                fs.copyFileSync(localPath, dest);
                return;
            } else {
                throw new Error(`Local asset not found: ${localPath}`);
            }
        }

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
                .renice(10)
                .outputOptions([
                    '-vf', 'scale=3840:2160:force_original_aspect_ratio=increase,crop=3840:2160,setsar=1'
                ])
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .save(dest);
        });
    },

    async createSteadySegment(imgPath: string, duration: number, outPath: string) {
        return new Promise<void>((resolve, reject) => {
            ffmpeg(imgPath)
                .renice(10)
                .loop(duration)
                .outputOptions([
                    '-t', duration.toString(),
                    ...getDynamicH264Opts()
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
                .renice(10)
                .input(imgAPath).inputOptions(['-loop 1', `-t ${duration}`])
                .input(imgBPath).inputOptions(['-loop 1', `-t ${duration}`])
                .complexFilter([
                    `[0:v]fps=30,format=yuv420p[v0];[1:v]fps=30,format=yuv420p[v1];[v0][v1]xfade=transition=${fType}:duration=${duration}:offset=0`
                ])
                .outputOptions([
                    '-t', duration.toString(),
                    ...getDynamicH264Opts()
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
                .renice(10)
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
    async generateCineVideo(
        scenes: Scene[],
        assetPaths: any,
        outputPath: string,
        tempDir: string,
        onProgress?: (p: number, m: string) => Promise<void>,
        backgroundMusicVolume: number = 0.2,
        ambianceVolume: number = 0.1,
        narrationVolume: number = 1.0,
        globalSfxVolume: number = 0.4,
        subtitlesEnabled: boolean = false,
        subtitleStyle: string = 'minimal'
    ) {
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

                // Adaptive Throttling: Let the system breathe in WSL / High Load
                await resourceGovernor.getAdaptiveDelay();

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
            await this.muxFinalAudio(silentVideoPath, scenes, assetPaths, outputPath, backgroundMusicVolume, ambianceVolume, narrationVolume, globalSfxVolume, subtitlesEnabled, subtitleStyle, tempDir);

            if (onProgress) await onProgress(100, 'Render complete!');

            this.logResources('FINISH_GEN_VIDEO');
        } catch (error) {
            console.error('[FFmpegRenderEngine] Segmented render failed:', error);
            throw error;
        }
    },

    async muxFinalAudio(
        videoPath: string,
        scenes: Scene[],
        assetPaths: any,
        outputPath: string,
        backgroundMusicVolume: number = 0.2,
        ambianceVolume: number = 0.1,
        narrationVolume: number = 1.0,
        globalSfxVolume: number = 0.4,
        subtitlesEnabled: boolean = false,
        subtitleStyle: string = 'minimal',
        tempDir: string = ''
    ) {
        return new Promise<void>((resolve, reject) => {
            const command = ffmpeg(videoPath);
            command.renice(10);
            let inputCounter = 1;

            // 1. Add narration inputs
            const uniqueSectionIds = Array.from(new Set(scenes.map(s => s.sectionId)));
            const audioInputMap: Record<string, number> = {};
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

            // 3. Add ambiance
            let ambianceIndex = -1;
            if (assetPaths.ambiance) {
                command.input(assetPaths.ambiance);
                ambianceIndex = inputCounter++;
            }

            // 4. Add scene-specific SFX
            const sfxInputMap: Record<string, number> = {};
            scenes.forEach(scene => {
                if (assetPaths.sfx[scene.id]) {
                    command.input(assetPaths.sfx[scene.id]);
                    sfxInputMap[scene.id] = inputCounter++;
                }
            });

            // 3. Complex Filter for Audio and Video (Subtitles)
            const filters: any[] = [];
            const audioMixInputs: string[] = [];

            // Video Filter: Subtitles (ASS focus for 1:1 parity)
            if (subtitlesEnabled) {
                const assPath = this.generateAssFile(scenes, tempDir, subtitleStyle);
                // We must use forward slashes and escape colons for absolute paths
                const escapedAssPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');

                filters.push({
                    filter: 'ass',
                    options: `filename='${escapedAssPath}'`,
                    inputs: '0:v',
                    outputs: 'v_sub'
                });
            }

            // Narration Processing
            uniqueSectionIds.forEach((sid, idx) => {
                if (assetPaths.audio[sid]) {
                    const scene = scenes.find(s => s.sectionId === sid);
                    const startTimeMs = Math.round((scene?.startTime || 0) * 1000);
                    const inputIdx = audioInputMap[sid];
                    const label = `[anar${idx}]`;
                    filters.push({
                        filter: 'volume',
                        options: narrationVolume.toString(),
                        inputs: `${inputIdx}:a`,
                        outputs: `anar_vol${idx}`
                    });
                    filters.push({
                        filter: 'aresample',
                        options: '44100',
                        inputs: `anar_vol${idx}`,
                        outputs: `anar_res${idx}`
                    });
                    filters.push({
                        filter: 'aformat',
                        options: 'sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo',
                        inputs: `anar_res${idx}`,
                        outputs: `anar_fmt${idx}`
                    });
                    filters.push({
                        filter: 'adelay',
                        options: `${startTimeMs}|${startTimeMs}`,
                        inputs: `anar_fmt${idx}`,
                        outputs: `anar${idx}`
                    });
                    audioMixInputs.push(label);
                }
            });

            // SFX Processing
            scenes.forEach((scene, idx) => {
                if (assetPaths.sfx[scene.id]) {
                    const startTimeMs = Math.round(scene.startTime * 1000);
                    const inputIdx = sfxInputMap[scene.id];
                    const vol = globalSfxVolume || 0.4;
                    filters.push({
                        filter: 'volume',
                        options: vol.toString(),
                        inputs: `${inputIdx}:a`,
                        outputs: `asfx_vol${idx}`
                    });
                    filters.push({
                        filter: 'aresample',
                        options: '44100',
                        inputs: `asfx_vol${idx}`,
                        outputs: `asfx_res${idx}`
                    });
                    filters.push({
                        filter: 'aformat',
                        options: 'sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo',
                        inputs: `asfx_res${idx}`,
                        outputs: `asfx_fmt${idx}`
                    });
                    filters.push({
                        filter: 'adelay',
                        options: `${startTimeMs}|${startTimeMs}`,
                        inputs: `asfx_fmt${idx}`,
                        outputs: `asfx${idx}`
                    });
                    audioMixInputs.push(`[asfx${idx}]`);
                }
            });

            // Global Ambiance
            if (ambianceIndex !== -1) {
                filters.push({
                    filter: 'volume',
                    options: ambianceVolume.toString(),
                    inputs: `${ambianceIndex}:a`,
                    outputs: `aamb_vol`
                });
                filters.push({
                    filter: 'aresample',
                    options: '44100',
                    inputs: `aamb_vol`,
                    outputs: `aamb_res`
                });
                filters.push({
                    filter: 'aformat',
                    options: 'sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo',
                    inputs: `aamb_res`,
                    outputs: 'aamb'
                });
                audioMixInputs.push('[aamb]');
            }

            // Background Music with Ducking
            if (bgMusicIndex !== -1) {
                // Build ducking expression: if time 't' is within any narration range, use 30% of base volume.
                // We construct a series of 'between(t, start, end)' checks.
                const narrationRanges: { start: number, end: number }[] = [];

                // Track occupied timestamps to avoid overlapping ducking logic
                uniqueSectionIds.forEach(sid => {
                    if (assetPaths.audio[sid]) {
                        const sectionScenes = scenes.filter(s => s.sectionId === sid);
                        if (sectionScenes.length > 0) {
                            const start = sectionScenes[0].startTime;
                            const end = sectionScenes[sectionScenes.length - 1].startTime + sectionScenes[sectionScenes.length - 1].duration;
                            narrationRanges.push({ start, end });
                        }
                    }
                });

                let volumeExpr = backgroundMusicVolume.toString();
                if (narrationRanges.length > 0) {
                    const duckFactor = 0.3; // Match browser preview ducking factor
                    const duckStr = narrationRanges.map(r => `between(t,${r.start.toFixed(3)},${r.end.toFixed(3)})`).join('+');
                    // Expression: base_vol * (1 - (is_narrating * (1 - duck_factor)))
                    // This is more efficient in FFmpeg than complex nested if()
                    volumeExpr = `'${backgroundMusicVolume}*(1-(${duckStr})*(1-${duckFactor}))'`;
                }

                filters.push({
                    filter: 'volume',
                    options: volumeExpr,
                    inputs: `${bgMusicIndex}:a`,
                    outputs: `abg_vol`
                });
                filters.push({
                    filter: 'aresample',
                    options: '44100',
                    inputs: `abg_vol`,
                    outputs: `abg_res`
                });
                filters.push({
                    filter: 'aformat',
                    options: 'sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo',
                    inputs: `abg_res`,
                    outputs: 'abg'
                });
                audioMixInputs.push('[abg]');
            }

            // Calculate total duration for precise truncation
            const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

            // Final Mixed Output
            if (audioMixInputs.length > 1) {
                filters.push({
                    filter: 'amix',
                    // CRITICAL: changed from 'first' to 'longest' to prevent truncation after first section
                    // We also set normalize=0 to avoid FFmpeg automatically lowering levels when multiple tracks are mixed,
                    // which ensures the volume matches our preview levels exactly.
                    options: { inputs: audioMixInputs.length, duration: 'longest', normalize: 0 },
                    inputs: audioMixInputs.map(i => i.replace('[', '').replace(']', '')),
                    outputs: 'finalaudio'
                });
            } else if (audioMixInputs.length === 1) {
                filters.push({
                    filter: 'acopy',
                    inputs: audioMixInputs[0].replace('[', '').replace(']', ''),
                    outputs: 'finalaudio'
                });
            }

            command.complexFilter(filters);

            // CRITICAL: We use explicit -t instead of -shortest to avoid truncation if any sub-audio track is short.
            // This ensures the video runs exactly as long as the visual scenes calculated.
            const outputOptions = ['-t', totalDuration.toFixed(3), '-y'];

            // Map Video
            if (subtitlesEnabled) {
                outputOptions.push('-map [v_sub]', ...getDynamicH264Opts());
            } else {
                outputOptions.push('-map 0:v', '-c:v copy');
            }

            // Map Audio
            if (audioMixInputs.length > 0) {
                outputOptions.push('-map [finalaudio]');
            } else {
                outputOptions.push('-an');
            }

            command
                .outputOptions(outputOptions)
                .on('end', () => resolve())
                .on('error', (err) => {
                    console.error('[FFmpegRenderEngine] Muxing Error:', err);
                    reject(err);
                })
                .save(outputPath);
        });
    },

    /**
     * Forcibly terminates all running FFmpeg and Remotion compositor processes.
     * This is an emergency "Panic Stop" mechanism.
     */
    async killAllProcesses() {
        console.warn('[FFmpegRenderEngine] PANIC STOP: Terminating all render processes...');
        const { exec } = await import('child_process');

        return new Promise<void>((resolve) => {
            // Kill all ffmpeg and remotion compositor instances
            exec('pkill -9 -f ffmpeg; pkill -9 -f compositor', (err) => {
                if (err) {
                    console.log('[FFmpegRenderEngine] No processes were found to kill or pkill failed.');
                } else {
                    console.log('[FFmpegRenderEngine] Successfully sent SIGKILL to all render processes.');
                }
                resolve();
            });
        });
    }
};
