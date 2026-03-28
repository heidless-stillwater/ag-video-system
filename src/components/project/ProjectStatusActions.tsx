import React from 'react';
import { Project, Script, User } from '@/types';
import { InlineConfirmButton } from '@/components/ui/InlineConfirmButton';
import { ScriptingActions } from './status-actions/ScriptingActions';
import { MediaGenerationActions } from './status-actions/MediaGenerationActions';
import { AssemblyActions } from './status-actions/AssemblyActions';
import { RenderActions } from './status-actions/RenderActions';
import { PublishActions } from './status-actions/PublishActions';

interface ProjectStatusActionsProps {
    project: Project;
    script: Script | null;
    currentUser: User | null;
    isResearching: boolean;
    isScripting: boolean;
    isGeneratingMedia: boolean;
    isAssembling: boolean;
    isRendering: boolean;
    isDownloading: boolean;
    isGeneratingMetadata: boolean;
    publishDisplayProgress: number;
    isConnectingYouTube: boolean;
    youtubeChannelStatus: any;
    persona: string;
    onPersonaChange: (persona: string) => void;
    onLaunchResearch: () => void;
    onCancelResearch?: () => void;
    onGenerateScript: () => void;
    onGenerateMediaClick: () => void;
    onCancelMedia: () => void;
    onAssemble: () => void;
    onRender: () => void;
    onLoadSavedRender: (render: any) => void;
    onKillRender: () => void;
    onDownloadMP4: () => void;
    onOpenPublishModal: () => void;
    onCancelPublish: () => Promise<void>;
    onCancelMetadata: () => void;
    onConnectYouTube: () => void;
    onDisconnectYouTube: () => void;
    onSnapshotAndReset: (label: string) => void;
    onResetToAssembling: () => void;
    onRevertToReady: () => void;
    onRevertToScripting: () => void;
    onSkipToAssembly: () => void;
    onSetViewMode: (view: 'overview' | 'timeline' | 'settings') => void;
    interceptAction: (action: () => void, title: string, message: string) => void;
    setStepConfirm: (confirm: any) => void;
    onUpdateProject?: (updates: Partial<Project>) => Promise<void>;
}

export const ProjectStatusActions: React.FC<ProjectStatusActionsProps> = ({
    project,
    script,
    currentUser,
    isResearching,
    isScripting,
    isGeneratingMedia,
    isAssembling,
    isRendering,
    isDownloading,
    isGeneratingMetadata,
    publishDisplayProgress,
    isConnectingYouTube,
    youtubeChannelStatus,
    persona,
    onPersonaChange,
    onLaunchResearch,
    onCancelResearch,
    onGenerateScript,
    onGenerateMediaClick,
    onCancelMedia,
    onAssemble,
    onRender,
    onLoadSavedRender,
    onKillRender,
    onDownloadMP4,
    onOpenPublishModal,
    onCancelPublish,
    onCancelMetadata,
    onConnectYouTube,
    onDisconnectYouTube,
    onSnapshotAndReset,
    onResetToAssembling,
    onRevertToReady,
    onRevertToScripting,
    onSkipToAssembly,
    onSetViewMode,
    interceptAction,
    setStepConfirm,
    onUpdateProject
}) => {
    return (
        <div className="flex flex-col gap-6 w-full">
            <div className="flex flex-col gap-4 w-full">
                <ScriptingActions
                    project={project}
                    script={script}
                    isScripting={isScripting}
                    isResearching={isResearching}
                    persona={persona}
                    onPersonaChange={onPersonaChange}
                    onGenerateScript={onGenerateScript}
                    onLaunchResearch={onLaunchResearch}
                    onCancelResearch={onCancelResearch}
                    onSkipToAssembly={onSkipToAssembly}
                    interceptAction={interceptAction}
                    onUpdateProject={onUpdateProject}
                    onSetViewMode={onSetViewMode}
                />

                <MediaGenerationActions
                    project={project}
                    script={script}
                    isGeneratingMedia={isGeneratingMedia}
                    onGenerateMediaClick={onGenerateMediaClick}
                    onCancelMedia={onCancelMedia}
                    onSetViewMode={onSetViewMode}
                />

                <AssemblyActions
                    project={project}
                    script={script}
                    isAssembling={isAssembling}
                    onAssemble={onAssemble}
                />

                <RenderActions
                    project={project}
                    script={script}
                    isRendering={isRendering}
                    onRender={onRender}
                    onLoadSavedRender={onLoadSavedRender}
                    onKillRender={onKillRender}
                    setStepConfirm={setStepConfirm}
                />

                <PublishActions
                    project={project}
                    currentUser={currentUser}
                    isDownloading={isDownloading}
                    onDownloadMP4={onDownloadMP4}
                    youtubeChannelStatus={youtubeChannelStatus}
                    isConnectingYouTube={isConnectingYouTube}
                    onConnectYouTube={onConnectYouTube}
                    onDisconnectYouTube={onDisconnectYouTube}
                    onOpenPublishModal={onOpenPublishModal}
                    onCancelMetadata={onCancelMetadata}
                    isGeneratingMetadata={isGeneratingMetadata}
                    publishDisplayProgress={publishDisplayProgress}
                />

                {project.status === 'ready' && (
                    <div className="flex gap-4">
                        <button
                            onClick={() => setStepConfirm({
                                isOpen: true,
                                title: '📦 ARCHIVE & RE-EDIT?',
                                message: 'This will save your current MP4 to the "Saved Renders" library and take you back to the Assembly phase. You can reload this video at any time. Continue?',
                                onConfirm: () => onSnapshotAndReset('Snapshot before Re-edit')
                            })}
                            className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20 flex items-center gap-3"
                        >
                            <span>📦 Save Version & Re-edit</span>
                        </button>

                        <button
                            onClick={() => setStepConfirm({
                                isOpen: true,
                                title: '🗑️ DISCARD & RE-EDIT?',
                                message: 'This will move the project back to the Assembling phase and CLEAR the current MP4 download. Use this if the current render is not worth saving. Continue?',
                                onConfirm: onResetToAssembling
                            })}
                            className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl font-bold transition-all border border-slate-700 flex items-center gap-3"
                        >
                            <span>🔄 Discard & Re-edit</span>
                        </button>
                    </div>
                )}

                {project.status === 'published' && (
                    <button
                        onClick={() => setStepConfirm({
                            isOpen: true,
                            title: 'Mark as Un-published?',
                            message: 'This will revert the status to READY. It will NOT delete the video from YouTube, but will allow you to republish or manage the project as if it were just rendered. Continue?',
                            onConfirm: onRevertToReady
                        })}
                        className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-2xl font-bold transition-all border border-slate-700 flex items-center gap-3"
                    >
                        <span>🔙 Mark as Un-published</span>
                    </button>
                )}

                {currentUser?.settings.youtubeConnected && (project.status === 'assembling' || project.status === 'review' || project.status === 'published' || project.status === 'ready' || project.status === 'rendering') && (
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onConnectYouTube}
                            disabled={isConnectingYouTube}
                            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center gap-2"
                        >
                            <span>🔄 Switch Account</span>
                        </button>
                        <InlineConfirmButton
                            label={<span>🚫 Disconnect</span>}
                            onConfirm={onDisconnectYouTube}
                            isLoading={isConnectingYouTube}
                            className="px-4 py-2 text-xs font-bold text-red-400/60 hover:text-red-400 transition-colors flex items-center gap-2 border-l border-slate-800"
                        />
                    </div>
                )}
            </div>
        </div>
    );
};
