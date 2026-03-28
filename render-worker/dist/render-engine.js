"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderEngine = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
// Native ffmpeg from PATH
const axios_1 = __importDefault(require("axios"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const analytics_server_1 = require("./analytics-server");
const environment_1 = require("./config/environment");
const resource_governor_1 = require("./resource-governor");
const storage_1 = require("./storage");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
// Utilizing native ffmpeg binaries on the OS (Cloud Run image contains it)
// Common encoding settings to ensure all segments are identical for concatenation
const getDynamicH264Opts = () => {
    const threadCount = resource_governor_1.resourceGovernor.getRecommendedThreads();
    return [
        '-vcodec libx264',
        '-pix_fmt yuv420p',
        '-profile:v main',
        '-level 4.1', // Safer level for 720p/1080p
        '-crf 18',
        '-g 30',
        '-max_muxing_queue_size 1024', // Prevent crashes on complex streams
        '-tune stillimage',
        '-preset veryfast',
        `-threads ${threadCount}`,
        '-r 30'
    ];
};
/**
 * Server-side service to render documentary videos using direct FFmpeg assembly.
 */
const activeCommands = new Map();
const trackCommand = (projectId, command) => {
    if (!activeCommands.has(projectId)) {
        activeCommands.set(projectId, new Set());
    }
    activeCommands.get(projectId).add(command);
};
const untrackCommand = (projectId, command) => {
    const list = activeCommands.get(projectId);
    if (list) {
        list.delete(command);
        if (list.size === 0) {
            activeCommands.delete(projectId);
        }
    }
};
exports.renderEngine = {
    async renderDocumentary(projectId, scenes, backgroundMusicUrl, backgroundMusicVolume = 0.2, ambianceUrl, ambianceVolume = 0.1, narrationVolume = 1.0, globalSfxVolume = 0.4, subtitlesEnabled = false, subtitleStyle = 'minimal', aspectRatio = '16:9', customFileName, performanceProfile, onProgress) {
        const config = (0, environment_1.getConfig)();
        const targetRes = config.video.resolution || '1080p';
        const isVertical = aspectRatio === '9:16';
        if (onProgress)
            await onProgress(0, `Starting ${isVertical ? 'Vertical (9:16)' : `${targetRes} Horizontal (16:9)`} render...`);
        // Inside Cloud Run Worker: Executing Locally
        const startTime = Date.now();
        const baseTemp = os_1.default.tmpdir();
        const tempDir = path_1.default.join(baseTemp, `render-${projectId}-${Date.now()}`);
        const outputDir = path_1.default.join(baseTemp, 'renders');
        const fileName = customFileName || `${projectId}.mp4`;
        const outputFile = path_1.default.join(outputDir, fileName);
        if (!fs_1.default.existsSync(tempDir))
            fs_1.default.mkdirSync(tempDir, { recursive: true });
        if (!fs_1.default.existsSync(outputDir))
            fs_1.default.mkdirSync(outputDir, { recursive: true });
        try {
            if (onProgress)
                await onProgress(5, `Downloading ${scenes.length} assets...`);
            const assetPaths = await this.downloadAssets(projectId, scenes, backgroundMusicUrl, ambianceUrl, tempDir);
            for (let i = 0; i < assetPaths.images.length; i++) {
                if (onProgress) {
                    const progress = 10 + Math.round((i / assetPaths.images.length) * 15);
                    await onProgress(progress, `Processing ${targetRes} visual ${i + 1}/${assetPaths.images.length}...`);
                }
                const originalPath = assetPaths.images[i];
                const processedPath = path_1.default.join(tempDir, `proc-img-${i}.jpg`);
                console.log(`[FFmpegRenderEngine] Scaling visual ${i}: ${originalPath} -> ${processedPath} (${targetRes})`);
                await this.preProcessImage(projectId, originalPath, processedPath, aspectRatio, targetRes);
                assetPaths.images[i] = processedPath;
                if (fs_1.default.existsSync(originalPath))
                    fs_1.default.unlinkSync(originalPath);
            }
            await this.generateCineVideo(projectId, scenes, assetPaths, outputFile, tempDir, onProgress, backgroundMusicVolume, ambianceVolume, narrationVolume, globalSfxVolume, subtitlesEnabled, subtitleStyle, aspectRatio, performanceProfile, targetRes);
            // 7. Upload to Storage
            if (onProgress)
                await onProgress(98, '🚀 UPLOADING TO HI-RES CLOUD...');
            // Log local file size for debugging
            try {
                const stats = fs_1.default.statSync(outputFile);
                console.log(`[FFmpegRenderEngine] Finalizing upload. Local file size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
            }
            catch (err) {
                console.warn('[FFmpegRenderEngine] Could not get local file size before upload');
            }
            const finalUrl = await storage_1.storageService.uploadVideo(projectId, outputFile, customFileName);
            if (onProgress)
                await onProgress(100, 'Render complete!');
            const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
            await analytics_server_1.analyticsServerService.logUsage({
                service: 'render',
                operation: 'rendering',
                model: 'ffmpeg-h264',
                inputCount: Math.ceil(totalDuration),
                executionTimeMs: Date.now() - startTime,
                projectId: projectId
            }, 'PRODUCTION');
            return finalUrl;
        }
        catch (error) {
            console.error('[FFmpegRenderEngine] FATAL ERROR:', error);
            throw new Error(`FFmpeg Rendering failed: ${error.message}`);
        }
        finally {
            fs_1.default.rmSync(tempDir, { recursive: true, force: true });
        }
    },
    async downloadAssets(projectId, scenes, backgroundMusicUrl, ambianceUrl, tempDir) {
        const imagePaths = [];
        const videoPaths = {};
        const audioPaths = {};
        const sfxPaths = {};
        let backgroundMusicPath = null;
        let ambiancePath = null;
        for (let i = 0; i < scenes.length; i++) {
            const scene = scenes[i];
            // Download thumbnail/image
            const imgPath = path_1.default.join(tempDir, `img-${i}.jpg`);
            await this.downloadFile(scene.imageUrl, imgPath);
            imagePaths.push(imgPath);
            // Download video source if exists
            if (scene.videoUrl) {
                const vidPath = path_1.default.join(tempDir, `vid-src-${i}.mp4`);
                await this.downloadFile(scene.videoUrl, vidPath);
                videoPaths[i] = vidPath;
            }
        }
        const uniqueSections = Array.from(new Set(scenes.map(s => s.sectionId)));
        for (const sectionId of uniqueSections) {
            const sectionScenes = scenes.filter(s => s.sectionId === sectionId);
            const sceneWithAudio = sectionScenes.find(s => s.audioUrl);
            if (sceneWithAudio?.audioUrl) {
                const audPath = path_1.default.join(tempDir, `aud-${sectionId}.mp3`);
                await this.downloadFile(sceneWithAudio.audioUrl, audPath);
                audioPaths[sectionId] = audPath;
            }
        }
        for (const scene of scenes) {
            if (scene.sfxUrl) {
                const sfxPath = path_1.default.join(tempDir, `sfx-${scene.id}.mp3`);
                await this.downloadFile(scene.sfxUrl, sfxPath);
                sfxPaths[scene.id] = sfxPath;
            }
        }
        if (backgroundMusicUrl) {
            backgroundMusicPath = path_1.default.join(tempDir, 'bg-music.mp3');
            await this.downloadFile(backgroundMusicUrl, backgroundMusicPath);
        }
        if (ambianceUrl) {
            ambiancePath = path_1.default.join(tempDir, 'ambiance.mp3');
            await this.downloadFile(ambianceUrl, ambiancePath);
        }
        return {
            images: imagePaths,
            videos: videoPaths,
            audio: audioPaths,
            backgroundMusic: backgroundMusicPath,
            ambiance: ambiancePath,
            sfx: sfxPaths
        };
    },
    async downloadFile(url, dest) {
        if (!url.startsWith('http')) {
            const localPath = path_1.default.join(process.cwd(), 'public', url);
            if (fs_1.default.existsSync(localPath)) {
                fs_1.default.copyFileSync(localPath, dest);
                return;
            }
            else {
                throw new Error(`Local asset not found: ${localPath}`);
            }
        }
        const response = await (0, axios_1.default)({
            url,
            method: 'GET',
            responseType: 'stream',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const writer = fs_1.default.createWriteStream(dest);
        response.data.pipe(writer);
        return new Promise((resolve, reject) => {
            writer.on('finish', () => resolve());
            writer.on('error', (err) => reject(err));
        });
    },
    generateAssFile(scenes, tempDir, styleType = 'minimal', aspectRatio = '16:9') {
        const assPath = path_1.default.join(tempDir, 'subtitles.ass');
        const isVertical = aspectRatio === '9:16';
        let playResX = 3840, playResY = 2160, fontSize = 92, alignment = 2, marginV = 202, marginLR = 480, bold = 0, primaryColour = '&H33FFFFFF', spacing = 3.5;
        if (isVertical) {
            playResX = 1080;
            playResY = 1920;
            fontSize = 32;
            marginV = 59;
            marginLR = 135;
            spacing = 1.2;
        }
        if (styleType === 'bold') {
            fontSize = isVertical ? 48 : 123;
            bold = -1;
            primaryColour = '&H00FFFFFF';
            spacing = -1.5;
        }
        else if (styleType === 'classic') {
            fontSize = isVertical ? 38 : 108;
            primaryColour = '&H00FFFFFF';
            spacing = 0;
        }
        const header = [
            '[Script Info]', 'Title: VideoSystem Subtitles', 'ScriptType: v4.00+', 'WrapStyle: 0', 'ScaledBorderAndShadow: yes', 'YCbCr Matrix: TV.601',
            `PlayResX: ${playResX}`, `PlayResY: ${playResY}`, '',
            '[V4+ Styles]', 'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
            `Style: Default,Arial,${fontSize},${primaryColour},&H000000FF,&H00000000,&H80000000,${bold},0,0,0,100,100,${spacing},0,1,0.5,2,${alignment},${marginLR},${marginLR},${marginV},1`,
            '', '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text'
        ].join('\n');
        const formatAssTime = (seconds) => {
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = Math.floor(seconds % 60);
            const ms = Math.floor((seconds % 1) * 100);
            return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
        };
        const dialogues = scenes.filter(s => s.narrationText).map(scene => {
            const start = formatAssTime(scene.startTime);
            const end = formatAssTime(scene.startTime + scene.duration);
            const text = scene.narrationText.replace(/[\r\n]+/g, ' ').replace(/\s\s+/g, ' ').trim();
            return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
        }).join('\n');
        fs_1.default.writeFileSync(assPath, header + '\n' + dialogues + '\n');
        return assPath;
    },
    logResources(label) {
        const memory = process.memoryUsage();
        const load = os_1.default.loadavg();
        console.log(`[Resources] [${label}] RAM: RSS=${(memory.rss / 1024 / 1024).toFixed(2)}MB | Load: ${load[0].toFixed(2)}`);
    },
    async preProcessImage(projectId, src, dest, aspectRatio = '16:9', resolution = '4k') {
        const isVertical = aspectRatio === '9:16';
        const RESOLUTIONS = {
            '4k': { w: 3840, h: 2160 },
            '1080p': { w: 1920, h: 1080 },
            '720p': { w: 1280, h: 720 }
        };
        const dim = RESOLUTIONS[resolution] || RESOLUTIONS['4k'];
        const targetW = isVertical ? dim.h / (16 / 9) : dim.w; // Simplified for MVP
        const targetH = isVertical ? dim.h : dim.h;
        // Accurate vertical scaling
        const scaleW = isVertical ? 1080 : dim.w;
        const scaleH = isVertical ? 1920 : dim.h;
        return new Promise((resolve, reject) => {
            const command = (0, fluent_ffmpeg_1.default)(src);
            const timeout = setTimeout(() => {
                command.kill('SIGKILL');
                untrackCommand(projectId, command);
                reject(new Error('FFmpeg pre-scale timeout (90s)'));
            }, 90000);
            trackCommand(projectId, command);
            let cmdLine = '';
            command.on('start', (cmd) => { cmdLine = cmd; console.log(`[FFmpeg] Scale: ${cmd}`); })
                .outputOptions([
                '-vf', `scale=${scaleW}:${scaleH}:force_original_aspect_ratio=increase,crop=${scaleW}:${scaleH},setsar=1`,
                '-frames:v', '1' // Force only one frame for image scaling
            ])
                .on('end', () => {
                clearTimeout(timeout);
                untrackCommand(projectId, command);
                resolve();
            })
                .on('error', (err) => {
                clearTimeout(timeout);
                untrackCommand(projectId, command);
                reject(new Error(`${err.message} (CMD: ${cmdLine})`));
            })
                .save(dest);
        });
    },
    async createSteadySegment(projectId, imgPath, duration, outPath) {
        return new Promise((resolve, reject) => {
            const command = (0, fluent_ffmpeg_1.default)(imgPath);
            const timeout = setTimeout(() => {
                command.kill('SIGKILL');
                untrackCommand(projectId, command);
                reject(new Error('FFmpeg steady timeout (180s)'));
            }, 180000);
            trackCommand(projectId, command);
            let cmdLine = '';
            command.on('start', (cmd) => { cmdLine = cmd; console.log(`[FFmpeg] Steady Segment: ${cmd}`); })
                .loop(duration)
                .outputOptions(['-t', duration.toString(), ...getDynamicH264Opts()])
                .on('end', () => {
                clearTimeout(timeout);
                untrackCommand(projectId, command);
                resolve();
            })
                .on('error', (err) => {
                clearTimeout(timeout);
                untrackCommand(projectId, command);
                reject(new Error(`${err.message} (CMD: ${cmdLine})`));
            })
                .save(outPath);
        });
    },
    async createVideoSegment(projectId, vidPath, duration, outPath, aspectRatio = '16:9', resolution = '4k') {
        const isVertical = aspectRatio === '9:16';
        const RESOLUTIONS = {
            '4k': { w: 3840, h: 2160 },
            '1080p': { w: 1920, h: 1080 },
            '720p': { w: 1280, h: 720 }
        };
        const dim = RESOLUTIONS[resolution] || RESOLUTIONS['4k'];
        const scaleW = isVertical ? 1080 : dim.w;
        const scaleH = isVertical ? 1920 : dim.h;
        return new Promise((resolve, reject) => {
            const command = (0, fluent_ffmpeg_1.default)(vidPath);
            const timeout = setTimeout(() => {
                command.kill('SIGKILL');
                untrackCommand(projectId, command);
                reject(new Error('FFmpeg video segment timeout (180s)'));
            }, 180000);
            trackCommand(projectId, command);
            let cmdLine = '';
            command.on('start', (cmd) => { cmdLine = cmd; console.log(`[FFmpeg] Video Segment (${resolution}): ${cmd}`); })
                .outputOptions([
                '-t', duration.toString(),
                '-vf', `fps=30,scale=${scaleW}:${scaleH}:force_original_aspect_ratio=increase,crop=${scaleW}:${scaleH},setsar=1`,
                ...getDynamicH264Opts(),
                '-an' // Remove audio from video segment, audio is muxed separately
            ])
                .on('end', () => {
                clearTimeout(timeout);
                untrackCommand(projectId, command);
                resolve();
            })
                .on('error', (err) => {
                clearTimeout(timeout);
                untrackCommand(projectId, command);
                reject(new Error(`${err.message} (CMD: ${cmdLine})`));
            })
                .save(outPath);
        });
    },
    async createTransitionSegment(projectId, imgAPath, imgBPath, type, duration, outPath) {
        return new Promise((resolve, reject) => {
            const command = (0, fluent_ffmpeg_1.default)();
            const timeout = setTimeout(() => {
                command.kill('SIGKILL');
                untrackCommand(projectId, command);
                reject(new Error('FFmpeg transition timeout (180s)'));
            }, 180000);
            const transitionMap = { 'fade': 'fade', 'blur': 'dissolve', 'zoom': 'zoomin', 'slide': 'slideleft' };
            const fType = transitionMap[type] || 'fade';
            command.input(imgAPath).inputOptions(['-loop 1', `-t ${duration}`])
                .input(imgBPath).inputOptions(['-loop 1', `-t ${duration}`])
                .on('start', (cmdLine) => console.log(`[FFmpeg] Transition: ${cmdLine}`))
                .complexFilter([`[0:v]fps=30,format=yuv420p[v0];[1:v]fps=30,format=yuv420p[v1];[v0][v1]xfade=transition=${fType}:duration=${duration}:offset=0`])
                .outputOptions(['-t', duration.toString(), ...getDynamicH264Opts()])
                .on('end', () => {
                clearTimeout(timeout);
                untrackCommand(projectId, command);
                resolve();
            })
                .on('error', (err) => {
                clearTimeout(timeout);
                untrackCommand(projectId, command);
                reject(err);
            });
            trackCommand(projectId, command);
            command.save(outPath);
        });
    },
    async concatenateSegments(projectId, segmentPaths, outPath, tempDir) {
        return new Promise((resolve, reject) => {
            const listPath = path_1.default.join(tempDir, 'concat.txt');
            const listContent = segmentPaths.map(p => `file '${path_1.default.resolve(p).replace(/'/g, "'\\''")}'`).join('\n');
            fs_1.default.writeFileSync(listPath, listContent);
            const command = (0, fluent_ffmpeg_1.default)();
            const timeout = setTimeout(() => {
                command.kill('SIGKILL');
                untrackCommand(projectId, command);
                reject(new Error('FFmpeg concat timeout (300s)'));
            }, 300000);
            trackCommand(projectId, command);
            command.input(listPath).inputOptions(['-f concat', '-safe 0']).outputOptions(['-c copy'])
                .on('end', () => {
                clearTimeout(timeout);
                untrackCommand(projectId, command);
                resolve();
            })
                .on('error', (err) => {
                clearTimeout(timeout);
                untrackCommand(projectId, command);
                reject(err);
            })
                .save(outPath);
        });
    },
    async generateCineVideo(projectId, scenes, assetPaths, outputPath, tempDir, onProgress, backgroundMusicVolume = 0.2, ambianceVolume = 0.1, narrationVolume = 1.0, globalSfxVolume = 0.4, subtitlesEnabled = false, subtitleStyle = 'minimal', renderAspectRatio = '16:9', performanceProfile, resolution = '4k') {
        this.logResources('START_GEN_VIDEO');
        const primaryScenes = scenes.filter(s => !s.trackId || s.trackId === 'video').sort((a, b) => a.startTime - b.startTime);
        const brollScenes = scenes.filter(s => s.trackId === 'broll').sort((a, b) => a.startTime - b.startTime);
        const segmentFiles = [];
        const isTurbo = performanceProfile?.mode === 'turbo';
        const batchSize = isTurbo ? 2 : 1;
        try {
            // 1. Generate Primary Track (Sequential)
            for (let i = 0; i < primaryScenes.length; i += batchSize) {
                const batchPromises = [];
                for (let j = 0; j < batchSize && (i + j) < primaryScenes.length; j++) {
                    const sceneIdxInPrimary = i + j;
                    const scene = primaryScenes[sceneIdxInPrimary];
                    const isLast = sceneIdxInPrimary === primaryScenes.length - 1;
                    const nextScene = primaryScenes[sceneIdxInPrimary + 1];
                    const transitionDuration = (!isLast && nextScene) ?
                        Math.min((nextScene.transitionDuration || 1000) / 1000, scene.duration / 2, nextScene.duration / 2) : 0;
                    if (onProgress) {
                        const progress = 20 + Math.round((sceneIdxInPrimary / primaryScenes.length) * 40);
                        const msg = isTurbo ? `🚀 Primary BAKING ${sceneIdxInPrimary + 1}/${primaryScenes.length}...` : `Baking primary scene ${sceneIdxInPrimary + 1}/${primaryScenes.length}...`;
                        await onProgress(progress, msg);
                    }
                    batchPromises.push((async () => {
                        const sceneSegs = [];
                        const safeSceneDuration = Math.max(scene.duration, 0.5);
                        const steadyDuration = safeSceneDuration - transitionDuration;
                        const sceneIdxInOriginal = scenes.findIndex(s => s.id === scene.id);
                        if (steadyDuration > 0.05) {
                            const steadyPath = path_1.default.join(tempDir, `primary-steady-${sceneIdxInPrimary}.mp4`);
                            if (assetPaths.videos[sceneIdxInOriginal]) {
                                await this.createVideoSegment(projectId, assetPaths.videos[sceneIdxInOriginal], steadyDuration, steadyPath, renderAspectRatio, resolution);
                            }
                            else {
                                await this.createSteadySegment(projectId, assetPaths.images[sceneIdxInOriginal], steadyDuration, steadyPath);
                            }
                            sceneSegs.push(steadyPath);
                        }
                        if (transitionDuration > 0) {
                            const transPath = path_1.default.join(tempDir, `primary-trans-${sceneIdxInPrimary}.mp4`);
                            const curIdxInOrig = scenes.findIndex(s => s.id === scene.id);
                            const nextIdxInOrig = scenes.findIndex(s => s.id === nextScene.id);
                            await this.createTransitionSegment(projectId, assetPaths.images[curIdxInOrig], assetPaths.images[nextIdxInOrig], nextScene.transitionType, transitionDuration, transPath);
                            sceneSegs.push(transPath);
                        }
                        return sceneSegs;
                    })());
                }
                const batchResults = await Promise.all(batchPromises);
                batchResults.forEach(res => res.forEach(p => segmentFiles.push(p)));
            }
            if (onProgress)
                await onProgress(70, 'Stitching primary track...');
            const silentVideoPath = path_1.default.join(tempDir, 'silent_video.mp4');
            await this.concatenateSegments(projectId, segmentFiles, silentVideoPath, tempDir);
            // 2. Generate B-Roll Overlays (Absolute)
            const overlaySegments = [];
            for (let i = 0; i < brollScenes.length; i++) {
                const scene = brollScenes[i];
                const overlayPath = path_1.default.join(tempDir, `broll-segment-${i}.mp4`);
                const sceneIdxInOriginal = scenes.findIndex(s => s.id === scene.id);
                if (onProgress) {
                    const progress = 75 + Math.round((i / brollScenes.length) * 15);
                    await onProgress(progress, `Baking B-Roll clip ${i + 1}/${brollScenes.length}...`);
                }
                if (assetPaths.videos[sceneIdxInOriginal]) {
                    await this.createVideoSegment(projectId, assetPaths.videos[sceneIdxInOriginal], scene.duration, overlayPath, renderAspectRatio, resolution);
                }
                else {
                    await this.createSteadySegment(projectId, assetPaths.images[sceneIdxInOriginal], scene.duration, overlayPath);
                }
                overlaySegments.push({ path: overlayPath, startTime: scene.startTime, duration: scene.duration });
            }
            if (onProgress)
                await onProgress(95, 'Finalizing mix with overlays...');
            await this.muxFinalAudio(projectId, silentVideoPath, scenes, assetPaths, outputPath, backgroundMusicVolume, ambianceVolume, narrationVolume, globalSfxVolume, subtitlesEnabled, subtitleStyle, tempDir, renderAspectRatio, overlaySegments);
            if (onProgress)
                await onProgress(100, 'Render complete!');
        }
        catch (error) {
            console.error('[FFmpegRenderEngine] Multi-track render failed:', error);
            throw error;
        }
    },
    async muxFinalAudio(projectId, videoPath, scenes, assetPaths, outputPath, backgroundMusicVolume = 0.2, ambianceVolume = 0.1, narrationVolume = 1.0, globalSfxVolume = 0.4, subtitlesEnabled = false, subtitleStyle = 'minimal', tempDir = '', renderAspectRatio = '16:9', overlaySegments = []) {
        return new Promise((resolve, reject) => {
            const command = (0, fluent_ffmpeg_1.default)(videoPath);
            let inputCounter = 1;
            // 1. Add inputs for B-Roll Video Overlays
            const brollInputMap = {};
            overlaySegments.forEach((seg, idx) => {
                command.input(seg.path);
                brollInputMap[idx] = inputCounter++;
            });
            // 2. Add inputs for Narration Audio
            const uniqueSectionIds = Array.from(new Set(scenes.map(s => s.sectionId)));
            const audioInputMap = {};
            uniqueSectionIds.forEach((sid) => {
                if (assetPaths.audio[sid]) {
                    command.input(assetPaths.audio[sid]);
                    audioInputMap[sid] = inputCounter++;
                }
            });
            let bgMusicIndex = -1;
            if (assetPaths.backgroundMusic) {
                command.input(assetPaths.backgroundMusic);
                bgMusicIndex = inputCounter++;
            }
            let ambianceIndex = -1;
            if (assetPaths.ambiance) {
                command.input(assetPaths.ambiance);
                ambianceIndex = inputCounter++;
            }
            const sfxInputMap = {};
            scenes.forEach(scene => {
                if (assetPaths.sfx[scene.id]) {
                    command.input(assetPaths.sfx[scene.id]);
                    sfxInputMap[scene.id] = inputCounter++;
                }
            });
            const filters = [];
            const audioMixInputs = [];
            // --- VIDEO FILTERS ---
            let lastVideoLabel = '0:v';
            // Apply Subtitles first (on primary video)
            if (subtitlesEnabled) {
                const assPath = this.generateAssFile(scenes, tempDir, subtitleStyle, renderAspectRatio);
                const escapedAssPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');
                filters.push({ filter: 'ass', options: `filename='${escapedAssPath}'`, inputs: lastVideoLabel, outputs: 'v_sub' });
                lastVideoLabel = 'v_sub';
            }
            // Apply B-Roll Overlays
            overlaySegments.forEach((seg, idx) => {
                const inputIdx = brollInputMap[idx];
                const outLabel = `v_over_${idx}`;
                filters.push({
                    filter: 'overlay',
                    options: `enable='between(t,${seg.startTime},${seg.startTime + seg.duration})'`,
                    inputs: [lastVideoLabel, `${inputIdx}:v`],
                    outputs: outLabel
                });
                lastVideoLabel = outLabel;
            });
            // --- AUDIO FILTERS ---
            uniqueSectionIds.forEach((sid, idx) => {
                if (assetPaths.audio[sid]) {
                    const scene = scenes.find(s => s.sectionId === sid);
                    const startTimeMs = Math.round((scene?.startTime || 0) * 1000);
                    const inputIdx = audioInputMap[sid];
                    filters.push({ filter: 'volume', options: narrationVolume.toString(), inputs: `${inputIdx}:a`, outputs: `anar_vol${idx}` });
                    filters.push({ filter: 'aresample', options: '44100', inputs: `anar_vol${idx}`, outputs: `anar_res${idx}` });
                    filters.push({ filter: 'aformat', options: 'sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo', inputs: `anar_res${idx}`, outputs: `anar_fmt${idx}` });
                    filters.push({ filter: 'adelay', options: `${startTimeMs}|${startTimeMs}`, inputs: `anar_fmt${idx}`, outputs: `anar${idx}` });
                    audioMixInputs.push(`[anar${idx}]`);
                }
            });
            scenes.forEach((scene, idx) => {
                if (assetPaths.sfx[scene.id]) {
                    const startTimeMs = Math.round(scene.startTime * 1000);
                    const inputIdx = sfxInputMap[scene.id];
                    filters.push({ filter: 'volume', options: (globalSfxVolume || 0.4).toString(), inputs: `${inputIdx}:a`, outputs: `asfx_vol${idx}` });
                    filters.push({ filter: 'aresample', options: '44100', inputs: `asfx_vol${idx}`, outputs: `asfx_res${idx}` });
                    filters.push({ filter: 'aformat', options: 'sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo', inputs: `asfx_res${idx}`, outputs: `asfx_fmt${idx}` });
                    filters.push({ filter: 'adelay', options: `${startTimeMs}|${startTimeMs}`, inputs: `asfx_fmt${idx}`, outputs: `asfx${idx}` });
                    audioMixInputs.push(`[asfx${idx}]`);
                }
            });
            if (ambianceIndex !== -1) {
                filters.push({ filter: 'volume', options: ambianceVolume.toString(), inputs: `${ambianceIndex}:a`, outputs: `aamb_vol` });
                filters.push({ filter: 'aresample', options: '44100', inputs: `aamb_vol`, outputs: `aamb_res` });
                filters.push({ filter: 'aformat', options: 'sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo', inputs: `aamb_res`, outputs: 'aamb' });
                audioMixInputs.push('[aamb]');
            }
            if (bgMusicIndex !== -1) {
                const narrationRanges = [];
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
                    const duckStr = narrationRanges.map(r => `between(t,${r.start.toFixed(3)},${r.end.toFixed(3)})`).join('+');
                    volumeExpr = `'${backgroundMusicVolume}*(1-(${duckStr})*(1-0.3))'`;
                }
                filters.push({ filter: 'volume', options: volumeExpr, inputs: `${bgMusicIndex}:a`, outputs: `abg_vol` });
                filters.push({ filter: 'aresample', options: '44100', inputs: `abg_vol`, outputs: `abg_res` });
                filters.push({ filter: 'aformat', options: 'sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo', inputs: `abg_res`, outputs: 'abg' });
                audioMixInputs.push('[abg]');
            }
            if (audioMixInputs.length > 1) {
                filters.push({ filter: 'amix', options: { inputs: audioMixInputs.length, duration: 'longest', normalize: 0 }, inputs: audioMixInputs.map(i => i.replace('[', '').replace(']', '')), outputs: 'finalaudio' });
            }
            else if (audioMixInputs.length === 1) {
                filters.push({ filter: 'acopy', inputs: audioMixInputs[0].replace('[', '').replace(']', ''), outputs: 'finalaudio' });
            }
            command.complexFilter(filters);
            const totalDuration = Math.max(0.1, scenes.reduce((max, s) => Math.max(max, s.startTime + s.duration), 0));
            const outputOptions = [
                '-t', totalDuration.toFixed(3),
                '-y',
                ...getDynamicH264Opts()
            ];
            trackCommand(projectId, command);
            // Safety timeout for final mux (10 minutes)
            const timeout = setTimeout(() => {
                console.error(`[FFmpegRenderEngine] Final mux for ${projectId} timed out.`);
                command.kill('SIGKILL');
                untrackCommand(projectId, command);
                reject(new Error('Final mux timed out'));
            }, 10 * 60 * 1000);
            // Final mapping
            command.map(lastVideoLabel);
            if (audioMixInputs.length > 0) {
                command.map('finalaudio');
            }
            let cmdLine = '';
            command.outputOptions(outputOptions)
                .on('start', (cmd) => { cmdLine = cmd; console.log(`[FFmpeg] Mux: ${cmd}`); })
                .on('end', () => {
                clearTimeout(timeout);
                untrackCommand(projectId, command);
                resolve();
            })
                .on('error', (err) => {
                clearTimeout(timeout);
                untrackCommand(projectId, command);
                reject(new Error(`${err.message} (CMD: ${cmdLine})`));
            })
                .save(outputPath);
        });
    },
    /**
     * Terminates all active FFmpeg processes for a specific project.
     */
    async killProject(projectId) {
        const list = activeCommands.get(projectId);
        if (list) {
            console.warn(`[FFmpegRenderEngine] Killing ${list.size} active commands for project ${projectId}`);
            list.forEach(cmd => cmd.kill('SIGKILL'));
            activeCommands.delete(projectId);
            return true;
        }
        return false;
    },
    /**
     * Forcibly terminates all FFmpeg and compositor processes on the system.
     */
    async killAllProcesses() {
        try {
            console.warn('[FFmpegRenderEngine] Forcibly killing all render processes (FFmpeg/Compositor)...');
            // 1. First, kill all known tracked commands gracefully (SIGKILL still)
            for (const [pid, list] of activeCommands.entries()) {
                list.forEach(cmd => cmd.kill('SIGKILL'));
            }
            activeCommands.clear();
            // 2. Kill FFmpeg processes system-wide (Fallback)
            try {
                await execAsync('pkill -9 ffmpeg');
            }
            catch (e) {
                // Ignore errors if no processes found
            }
            // Kill any remnants of chromium/puppeteer if used (for subtitles or compositing)
            try {
                await execAsync('pkill -9 chrome');
                await execAsync('pkill -9 chromium');
            }
            catch (e) {
                // Ignore
            }
            return true;
        }
        catch (error) {
            console.error('[FFmpegRenderEngine] Error killing processes:', error);
            return false;
        }
    }
};
