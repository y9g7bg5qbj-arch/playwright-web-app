/**
 * WorkerCountSlider - Slider and input for configuring worker count
 */
import React from 'react';
import { Users, Minus, Plus, Info } from 'lucide-react';

interface WorkerCountSliderProps {
  value: number;
  onChange: (count: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  showRecommendation?: boolean;
}

export const WorkerCountSlider: React.FC<WorkerCountSliderProps> = ({
  value,
  onChange,
  min = 1,
  max = 16,
  disabled = false,
  showRecommendation = true,
}) => {
  // Get recommended workers based on available CPU cores
  const recommendedWorkers = Math.max(1, Math.floor((navigator.hardwareConcurrency || 4) / 2));

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(parseInt(e.target.value, 10));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      onChange(newValue);
    }
  };

  const increment = () => {
    if (value < max) onChange(value + 1);
  };

  const decrement = () => {
    if (value > min) onChange(value - 1);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
          <Users className="w-4 h-4 text-slate-500" />
          Parallel Workers
        </label>
        <div className="flex items-center gap-1">
          <button
            onClick={decrement}
            disabled={disabled || value <= min}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Decrease workers"
          >
            <Minus className="w-4 h-4" />
          </button>
          <input
            type="number"
            value={value}
            onChange={handleInputChange}
            min={min}
            max={max}
            disabled={disabled}
            className="w-14 text-center bg-slate-800 border border-slate-700 rounded px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            aria-label="Worker count"
          />
          <button
            onClick={increment}
            disabled={disabled || value >= max}
            className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Increase workers"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative">
        <input
          type="range"
          value={value}
          onChange={handleSliderChange}
          min={min}
          max={max}
          disabled={disabled}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Worker count slider"
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-500">{min}</span>
          <span className="text-xs text-slate-500">{max}</span>
        </div>
      </div>

      {showRecommendation && (
        <div className="flex items-start gap-2 p-2 rounded bg-slate-800/50 border border-slate-700">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-400">
            <span className="text-slate-300">Recommended: {recommendedWorkers} workers</span>
            <span className="block mt-0.5">
              Based on {navigator.hardwareConcurrency || 'unknown'} CPU cores. Higher counts may
              increase test speed but require more memory.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerCountSlider;
