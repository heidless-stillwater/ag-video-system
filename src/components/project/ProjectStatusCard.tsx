import React from 'react';
import { Project, Script, User } from '@/types';
import { AmbientMusicSelector } from './AmbientMusicSelector';
import { SoundDesigner } from './SoundDesigner';
import { AudioMixer } from './AudioMixer';
import { TypographySettings } from './TypographySettings';
import { ProjectStatusActions } from './ProjectStatusActions';

interface ProjectStatusCardProps {
    project: Project;
    script: Script | null;
    error: string | null;
    currentUser: User | null;
    isResearching: boolean;
    isScripting: boolean;
    isSoundDesigning: boolean;
    isGeneratingMedia: boolean;
    isAssembling: boolean;
    isRendering: boolean;
    isDownloading: boolean;
    isGeneratingMetadata: boolean;
    isGeneratingAllAudio: boolean;
    generatingAudioId: string | null;
    publishDisplayProgress: number;
    isConnectingYouTube: boolean;
    youtubeChannelStatus: any;
    onMusicSelect: (trackId: string) => void;
    onAmbianceSelect: (layerId: string) => void;
    onGenerateSoundDesign: () => void;
    onVolumeChange: (type: any, value: any) => void;
    onSubtitleToggle: () => void;
    onSubtitleStyleChange: (style: any) => void;
    onLaunchResearch: () => void;
    onGenerateScript: () => void;
    onGenerateMediaClick: () => void;
    onCancelMedia: () => void;
    onAssemble: () => void;
    onRender: () => void;
    onLoadSavedRender: (render: any) => void;
    onKillRender: () => void;
    onDownloadMP4: () => void;
    onOpenPublishModal: () => void;
    onConnectYouTube: () => void;
    onDisconnectYouTube: () => void;
    onSnapshotAndReset: (label: string) => void;
    onResetToAssembling: () => void;
    onRevertToReady: () => void;
    interceptAction: (action: () => void, title: string, message: string) => void;
    setStepConfirm: (confirm: any) => void;
}

export const ProjectStatusCard: React.FC<ProjectStatusCardProps> = (props) => {
    const { project, error } = props;

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-[80px] -mr-32 -mt-32 group-hover:bg-blue-600/10 transition-all duration-700"></div>
            <h2 className="text-2xl font-bold mb-2">Phase: {project.status.replace('_', ' ').toUpperCase()}</h2>
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <p className="text-slate-400 mb-8 max-w-lg">
                {project.status === 'draft' && "Your project is ready to begin. Start the research phase to gather facts and build your documentary outline."}
                {project.status === 'researching' && "Your research is complete. You can now generate a sleep-optimized script based on the extracted facts."}
                {project.status === 'scripting' && "Your script has been generated. Review and refine the sections before moving to media generation."}
                {project.status === 'generating_media' && "Visual assets have been synthesized. Review the gallery below before moving to final video assembly."}
                {project.status === 'assembling' && "The documentary is assembled. You can preview the finalized cinematic experience now."}
                {project.status === 'ready' && "The documentary has been rendered and is ready for download or upload to YouTube."}
            </p>

            {/* Sub-components */}
            <AmbientMusicSelector
                project={project}
                onMusicSelect={props.onMusicSelect}
            />

            <SoundDesigner
                project={project}
                script={props.script}
                isSoundDesigning={props.isSoundDesigning}
                onAmbianceSelect={props.onAmbianceSelect}
                onGenerateSoundDesign={props.onGenerateSoundDesign}
                interceptAction={props.interceptAction}
            />

            <AudioMixer
                project={project}
                onVolumeChange={props.onVolumeChange}
            />

            <TypographySettings
                project={project}
                script={props.script}
                onSubtitleToggle={props.onSubtitleToggle}
                onSubtitleStyleChange={props.onSubtitleStyleChange}
            />

            <ProjectStatusActions
                {...props}
                onLaunchResearch={props.onLaunchResearch}
                onGenerateScript={props.onGenerateScript}
                onGenerateMediaClick={props.onGenerateMediaClick}
                onCancelMedia={props.onCancelMedia}
                onAssemble={props.onAssemble}
                onRender={props.onRender}
                onLoadSavedRender={props.onLoadSavedRender}
                onKillRender={props.onKillRender}
                onDownloadMP4={props.onDownloadMP4}
                onOpenPublishModal={props.onOpenPublishModal}
                onConnectYouTube={props.onConnectYouTube}
                onDisconnectYouTube={props.onDisconnectYouTube}
                onSnapshotAndReset={props.onSnapshotAndReset}
                onResetToAssembling={props.onResetToAssembling}
                onRevertToReady={props.onRevertToReady}
            />
        </div>
    );
};
