import { useState, type ComponentType } from 'react';
import {
  Settings,
  SlidersHorizontal,
  Filter,
  Timer,
  Clapperboard,
  Image,
  Wrench,
  FlaskConical,
} from 'lucide-react';
import type { RunConfiguration } from '@/store/runConfigStore';
import { GeneralTab } from './GeneralTab';
import { ExecutionTab } from './ExecutionTab';
import { FilteringTab } from './FilteringTab';
import { TimeoutsTab } from './TimeoutsTab';
import { ArtifactsTab } from './ArtifactsTab';
import { VisualTab } from './VisualTab';
import { AdvancedTab } from './AdvancedTab';
import { ParametersTab } from './ParametersTab';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui';

export type TabType = 'general' | 'execution' | 'filtering' | 'timeouts' | 'artifacts' | 'visual' | 'parameters' | 'advanced';

export const TABS: { id: TabType; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'execution', label: 'Execution', icon: SlidersHorizontal },
  { id: 'filtering', label: 'Filtering', icon: Filter },
  { id: 'timeouts', label: 'Timeouts', icon: Timer },
  { id: 'artifacts', label: 'Artifacts', icon: Clapperboard },
  { id: 'visual', label: 'Visual', icon: Image },
  { id: 'parameters', label: 'Parameters', icon: FlaskConical },
  { id: 'advanced', label: 'Advanced', icon: Wrench },
];

interface RunConfigEditorProps {
  config: RunConfiguration;
  onChange: <K extends keyof RunConfiguration>(field: K, value: RunConfiguration[K]) => void;
  hideName?: boolean;
  hideScope?: boolean;
  scrollable?: boolean;
}

export function RunConfigEditor({ config, onChange, hideName, hideScope, scrollable = true }: RunConfigEditorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general');

  return (
    <>
      <div className="border-b border-border-default bg-dark-bg px-4 py-1.5">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} variant="pill" size="md">
          <TabsList className="overflow-x-auto">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.id} value={tab.id} icon={<Icon className="h-3.5 w-3.5" />}>
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      <div className={scrollable ? 'min-h-0 flex-1 overflow-y-auto bg-dark-canvas/40 p-5' : 'bg-dark-canvas/40 p-5'}>
        {activeTab === 'general' && <GeneralTab config={config} onChange={onChange} hideName={hideName} />}
        {activeTab === 'execution' && <ExecutionTab config={config} onChange={onChange} />}
        {activeTab === 'filtering' && <FilteringTab config={config} onChange={onChange} hideScope={hideScope} />}
        {activeTab === 'timeouts' && <TimeoutsTab config={config} onChange={onChange} />}
        {activeTab === 'artifacts' && <ArtifactsTab config={config} onChange={onChange} />}
        {activeTab === 'visual' && <VisualTab config={config} onChange={onChange} />}
        {activeTab === 'parameters' && <ParametersTab config={config} onChange={onChange} />}
        {activeTab === 'advanced' && <AdvancedTab config={config} onChange={onChange} />}
      </div>
    </>
  );
}
