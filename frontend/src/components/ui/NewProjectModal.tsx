import { useState } from 'react';
import { X, FolderPlus, Copy, Check, Folder } from 'lucide-react';

interface Project {
    id: string;
    name: string;
    description?: string;
}

interface NewProjectModalProps {
    isOpen: boolean;
    existingProjects: Project[];
    onClose: () => void;
    onCreate: (name: string, duplicateFromId?: string) => Promise<void>;
}

type CreationMode = 'empty' | 'duplicate';

export function NewProjectModal({
    isOpen,
    existingProjects,
    onClose,
    onCreate,
}: NewProjectModalProps) {
    const [mode, setMode] = useState<CreationMode>('empty');
    const [projectName, setProjectName] = useState('');
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCreate = async () => {
        if (!projectName.trim()) {
            setError('Project name is required');
            return;
        }

        if (mode === 'duplicate' && !selectedProjectId) {
            setError('Please select a project to duplicate');
            return;
        }

        setIsCreating(true);
        setError(null);

        try {
            await onCreate(
                projectName.trim(),
                mode === 'duplicate' ? selectedProjectId! : undefined
            );
            // Reset state on success
            setProjectName('');
            setSelectedProjectId(null);
            setMode('empty');
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create project');
        } finally {
            setIsCreating(false);
        }
    };

    const handleClose = () => {
        setProjectName('');
        setSelectedProjectId(null);
        setMode('empty');
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-gray-800 rounded-xl shadow-2xl border border-gray-700 w-full max-w-lg mx-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-800/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                            <FolderPlus className="w-5 h-5 text-green-400" />
                        </div>
                        <h2 className="text-lg font-semibold text-white">New Project</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-5">
                    {/* Project Name Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Project Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={projectName}
                            onChange={(e) => {
                                setProjectName(e.target.value);
                                setError(null);
                            }}
                            placeholder="e.g., Login Tests, Checkout Flow"
                            className="w-full px-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500"
                            autoFocus
                        />
                    </div>

                    {/* Creation Mode Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                            How would you like to create this project?
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            {/* Empty Project Option */}
                            <button
                                onClick={() => {
                                    setMode('empty');
                                    setSelectedProjectId(null);
                                    setError(null);
                                }}
                                className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                                    mode === 'empty'
                                        ? 'border-green-500 bg-green-500/10'
                                        : 'border-gray-700 hover:border-gray-600 bg-gray-900/50'
                                }`}
                            >
                                {mode === 'empty' && (
                                    <div className="absolute top-2 right-2">
                                        <Check className="w-4 h-4 text-green-400" />
                                    </div>
                                )}
                                <FolderPlus className={`w-8 h-8 mb-2 ${mode === 'empty' ? 'text-green-400' : 'text-gray-500'}`} />
                                <div className={`font-medium ${mode === 'empty' ? 'text-white' : 'text-gray-300'}`}>
                                    Empty Project
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    Start fresh with example structure
                                </div>
                            </button>

                            {/* Duplicate Option */}
                            <button
                                onClick={() => {
                                    setMode('duplicate');
                                    setError(null);
                                }}
                                disabled={existingProjects.length === 0}
                                className={`relative p-4 rounded-lg border-2 transition-all text-left ${
                                    mode === 'duplicate'
                                        ? 'border-blue-500 bg-blue-500/10'
                                        : existingProjects.length === 0
                                            ? 'border-gray-800 bg-gray-900/30 cursor-not-allowed opacity-50'
                                            : 'border-gray-700 hover:border-gray-600 bg-gray-900/50'
                                }`}
                            >
                                {mode === 'duplicate' && (
                                    <div className="absolute top-2 right-2">
                                        <Check className="w-4 h-4 text-blue-400" />
                                    </div>
                                )}
                                <Copy className={`w-8 h-8 mb-2 ${mode === 'duplicate' ? 'text-blue-400' : 'text-gray-500'}`} />
                                <div className={`font-medium ${mode === 'duplicate' ? 'text-white' : 'text-gray-300'}`}>
                                    Duplicate Existing
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {existingProjects.length === 0
                                        ? 'No projects to duplicate'
                                        : 'Copy from another project'
                                    }
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Project Selection (for duplicate mode) */}
                    {mode === 'duplicate' && existingProjects.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Select project to duplicate <span className="text-red-400">*</span>
                            </label>
                            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                                {existingProjects.map((project) => (
                                    <button
                                        key={project.id}
                                        onClick={() => {
                                            setSelectedProjectId(project.id);
                                            setError(null);
                                        }}
                                        className={`w-full p-3 rounded-lg border transition-all text-left flex items-center gap-3 ${
                                            selectedProjectId === project.id
                                                ? 'border-blue-500 bg-blue-500/10'
                                                : 'border-gray-700 hover:border-gray-600 bg-gray-900/50'
                                        }`}
                                    >
                                        <Folder className={`w-5 h-5 flex-shrink-0 ${
                                            selectedProjectId === project.id ? 'text-blue-400' : 'text-yellow-500'
                                        }`} />
                                        <div className="flex-1 min-w-0">
                                            <div className={`font-medium truncate ${
                                                selectedProjectId === project.id ? 'text-white' : 'text-gray-300'
                                            }`}>
                                                {project.name}
                                            </div>
                                            {project.description && (
                                                <div className="text-xs text-gray-500 truncate">
                                                    {project.description}
                                                </div>
                                            )}
                                        </div>
                                        {selectedProjectId === project.id && (
                                            <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Info Box */}
                    <div className={`rounded-lg p-3 border ${
                        mode === 'empty'
                            ? 'bg-green-500/5 border-green-500/20'
                            : 'bg-blue-500/5 border-blue-500/20'
                    }`}>
                        <div className="flex items-start gap-2 text-sm">
                            <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                                mode === 'empty' ? 'text-green-400' : 'text-blue-400'
                            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-gray-400">
                                {mode === 'empty'
                                    ? 'An empty project will be created with example "features" and "pages" folders to help you get started.'
                                    : 'All files, pages, and features from the selected project will be copied to the new project.'
                                }
                            </span>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="rounded-lg p-3 bg-red-500/10 border border-red-500/20">
                            <div className="flex items-center gap-2 text-sm text-red-400">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {error}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-700 bg-gray-800/50">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={!projectName.trim() || isCreating || (mode === 'duplicate' && !selectedProjectId)}
                        className={`px-5 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${
                            !projectName.trim() || isCreating || (mode === 'duplicate' && !selectedProjectId)
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-500/20'
                        }`}
                    >
                        {isCreating ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Creating...
                            </>
                        ) : (
                            <>
                                <FolderPlus className="w-4 h-4" />
                                Create Project
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
