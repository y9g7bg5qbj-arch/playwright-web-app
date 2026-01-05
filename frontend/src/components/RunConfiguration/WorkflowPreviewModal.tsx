/**
 * WorkflowPreviewModal - Modal to preview and copy generated GitHub Actions workflow
 */
import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  FileCode,
  RefreshCw,
  ExternalLink,
  Play,
} from 'lucide-react';
import { useGitHubStore } from '@/store/useGitHubStore';
import type { RunConfiguration } from '@playwright-web-app/shared';

interface WorkflowPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: Partial<RunConfiguration>;
  onTriggerRun?: () => void;
}

export const WorkflowPreviewModal: React.FC<WorkflowPreviewModalProps> = ({
  isOpen,
  onClose,
  config,
  onTriggerRun,
}) => {
  const {
    generatedWorkflow,
    workflowGenerating,
    previewWorkflow,
    clearGeneratedWorkflow,
    isConnected,
    selectedRepository,
  } = useGitHubStore();

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && config) {
      previewWorkflow(config);
    }
    return () => {
      clearGeneratedWorkflow();
    };
  }, [isOpen, config, previewWorkflow, clearGeneratedWorkflow]);

  const handleCopy = async () => {
    if (generatedWorkflow?.content) {
      await navigator.clipboard.writeText(generatedWorkflow.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (generatedWorkflow?.content) {
      const blob = new Blob([generatedWorkflow.content], { type: 'text/yaml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = generatedWorkflow.filename || 'vero-tests.yml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-lg border border-slate-700 shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-blue-400" />
            <h2 className="font-semibold text-slate-200">GitHub Actions Workflow</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {workflowGenerating ? (
            <div className="flex-1 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
          ) : generatedWorkflow ? (
            <>
              {/* File path info */}
              <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700">
                <p className="text-sm text-slate-400">
                  Save this file to:{' '}
                  <code className="text-blue-400">
                    {generatedWorkflow.path}/{generatedWorkflow.filename}
                  </code>
                </p>
              </div>

              {/* Code preview */}
              <div className="flex-1 overflow-auto">
                <pre className="p-4 text-sm text-slate-300 font-mono whitespace-pre overflow-x-auto">
                  {generatedWorkflow.content}
                </pre>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              No workflow generated
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-700 bg-slate-800/50">
          <div className="flex items-center gap-2">
            {generatedWorkflow && (
              <>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isConnected() && selectedRepository && onTriggerRun && (
              <button
                onClick={onTriggerRun}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-500 text-white rounded transition-colors"
              >
                <Play className="w-4 h-4" />
                Run on GitHub
              </button>
            )}
            <a
              href="https://docs.github.com/en/actions/learn-github-actions/understanding-github-actions"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200"
            >
              Learn about GitHub Actions
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowPreviewModal;
