import React from 'react';

interface TimerDisplayProps {
  elapsedMs: number;
  targetDurationMs?: number;
}

/**
 * TimerDisplay component shows elapsed time in MM:SS format.
 * Updates every second and highlights when approaching end time (50+ seconds).
 * 
 * Requirements: 5.4
 */
export const TimerDisplay: React.FC<TimerDisplayProps> = ({ 
  elapsedMs, 
  targetDurationMs: _targetDurationMs = 60000 
}) => {
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  
  // Highlight when approaching end time (50+ seconds)
  const isApproachingEnd = elapsedMs >= 50000;
  
  // Format time as MM:SS
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  return (
    <div 
      className={`inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 md:px-6 md:py-3 rounded-lg sm:rounded-xl shadow-lg transition-colors duration-300 font-mono ${
        isApproachingEnd ? 'bg-orange-500/95 animate-pulse-scale' : 'bg-white/95'
      }`}
      data-testid="timer-display"
      data-approaching-end={isApproachingEnd}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5">
        <ClockIcon active={isApproachingEnd} />
        <span 
          className={`text-lg sm:text-xl md:text-2xl font-bold transition-colors duration-300 ${
            isApproachingEnd ? 'text-white' : 'text-gray-800'
          }`}
          data-testid="timer-value"
        >
          {formattedTime}
        </span>
      </div>
    </div>
  );
};

/**
 * ClockIcon - SVG icon for timer
 */
const ClockIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <svg
    className="w-5 h-5 sm:w-6 sm:h-6"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="12"
      cy="12"
      r="9"
      stroke={active ? '#FFFFFF' : '#333333'}
      strokeWidth="2"
      fill="none"
    />
    <path
      d="M12 6V12L16 14"
      stroke={active ? '#FFFFFF' : '#333333'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
