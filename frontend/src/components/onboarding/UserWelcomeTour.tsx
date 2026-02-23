import { useState } from 'react';
import { authApi } from '@/api/auth';
import { FolderTree, FileText, Play } from 'lucide-react';

interface UserWelcomeTourProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOUR_STEPS = [
  {
    icon: FolderTree,
    title: 'Your Test Files',
    description: 'The Explorer panel shows your project files and test scenarios. Click any file to open it in the editor.',
  },
  {
    icon: FileText,
    title: 'Write Vero Tests',
    description: 'Use the Vero DSL to write tests in plain English. The editor provides syntax highlighting and autocomplete.',
  },
  {
    icon: Play,
    title: 'Run & See Results',
    description: 'Click the Run button to execute your tests. Results appear in the Executions panel with detailed reports.',
  },
];

export function UserWelcomeTour({ isOpen, onClose }: UserWelcomeTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const handleComplete = async () => {
    try {
      await authApi.completeOnboarding();
    } catch {
      // Non-critical
    }
    onClose();
  };

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="bg-dark-card border border-border-default rounded-xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Welcome header (first step only) */}
        {currentStep === 0 && (
          <p className="text-xs text-brand-primary font-medium text-center mb-4 uppercase tracking-wider">
            Quick Tour
          </p>
        )}

        {/* Step content */}
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-brand-primary/10 flex items-center justify-center mx-auto">
            <Icon size={28} className="text-brand-primary" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary">{step.title}</h3>
          <p className="text-sm text-text-muted leading-relaxed">{step.description}</p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mt-6">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === currentStep ? 'bg-brand-primary' : i < currentStep ? 'bg-brand-primary/40' : 'bg-border-default'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={handleComplete}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            Skip tour
          </button>
          <button
            onClick={handleNext}
            className="px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-lg hover:bg-brand-hover transition-colors"
          >
            {currentStep < TOUR_STEPS.length - 1 ? 'Next' : 'Get Started'}
          </button>
        </div>
      </div>
    </div>
  );
}
