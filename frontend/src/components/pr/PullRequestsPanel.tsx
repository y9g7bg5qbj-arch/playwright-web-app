import { GitPullRequest } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { PullRequestList } from './PullRequestList';
import { PullRequestDetail } from './PullRequestDetail';
import { useSandboxStore } from '@/store/sandboxStore';
import type { PullRequest } from '@/api/pullRequest';

interface PullRequestsPanelProps {
  projectId: string;
  nestedProjects?: Array<{ id: string; name: string }>;
  onSelectProject?: (id: string) => void;
}

export const PullRequestsPanel: React.FC<PullRequestsPanelProps> = ({
  projectId,
  nestedProjects,
  onSelectProject,
}) => {
  const selectedPullRequestId = useSandboxStore((s) => s.selectedPullRequestId);
  const setSelectedPullRequestId = useSandboxStore((s) => s.setSelectedPullRequestId);

  const handleSelectPR = (pr: PullRequest) => {
    setSelectedPullRequestId(pr.id);
  };

  const handleBack = () => {
    setSelectedPullRequestId(null);
  };

  const showMobileDetail = Boolean(selectedPullRequestId);

  return (
    <div className="flex h-full flex-1 overflow-hidden bg-dark-canvas">
      <div
        className={`h-full min-w-0 flex-col overflow-hidden md:flex md:w-[340px] md:shrink-0 md:border-r md:border-border-default ${
          showMobileDetail ? 'hidden' : 'flex w-full'
        }`}
      >
        <PullRequestList
          projectId={projectId}
          onSelectPR={handleSelectPR}
          nestedProjects={nestedProjects}
          onSelectProject={(id) => {
            setSelectedPullRequestId(null);
            onSelectProject?.(id);
          }}
        />
      </div>

      <div
        className={`min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
          showMobileDetail ? 'flex w-full' : 'hidden md:flex'
        }`}
      >
        {selectedPullRequestId ? (
          <PullRequestDetail prId={selectedPullRequestId} onBack={handleBack} />
        ) : (
          <div className="flex flex-1 items-center justify-center p-6">
            <EmptyState
              icon={<GitPullRequest className="h-5 w-5" />}
              title="Select a pull request"
              message="Choose an item from the list to review files, comments, and merge actions."
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PullRequestsPanel;
