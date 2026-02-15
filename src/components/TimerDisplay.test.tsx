import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TimerDisplay } from './TimerDisplay';
import * as fc from 'fast-check';

describe('TimerDisplay', () => {
  describe('Time Formatting', () => {
    it('should display time in MM:SS format', () => {
      render(<TimerDisplay elapsedMs={0} />);
      const timerValue = screen.getByTestId('timer-value');
      expect(timerValue.textContent).toBe('00:00');
    });

    it('should format single digit seconds with leading zero', () => {
      render(<TimerDisplay elapsedMs={5000} />);
      const timerValue = screen.getByTestId('timer-value');
      expect(timerValue.textContent).toBe('00:05');
    });

    it('should format single digit minutes with leading zero', () => {
      render(<TimerDisplay elapsedMs={65000} />);
      const timerValue = screen.getByTestId('timer-value');
      expect(timerValue.textContent).toBe('01:05');
    });

    it('should display correct time for 30 seconds', () => {
      render(<TimerDisplay elapsedMs={30000} />);
      const timerValue = screen.getByTestId('timer-value');
      expect(timerValue.textContent).toBe('00:30');
    });

    it('should display correct time for 1 minute', () => {
      render(<TimerDisplay elapsedMs={60000} />);
      const timerValue = screen.getByTestId('timer-value');
      expect(timerValue.textContent).toBe('01:00');
    });

    it('should display correct time for 1 minute 30 seconds', () => {
      render(<TimerDisplay elapsedMs={90000} />);
      const timerValue = screen.getByTestId('timer-value');
      expect(timerValue.textContent).toBe('01:30');
    });
  });

  describe('Highlighting Behavior', () => {
    it('should not highlight when time is below 50 seconds', () => {
      render(<TimerDisplay elapsedMs={49000} />);
      const timerDisplay = screen.getByTestId('timer-display');
      expect(timerDisplay.getAttribute('data-approaching-end')).toBe('false');
    });

    it('should highlight when time reaches 50 seconds', () => {
      render(<TimerDisplay elapsedMs={50000} />);
      const timerDisplay = screen.getByTestId('timer-display');
      expect(timerDisplay.getAttribute('data-approaching-end')).toBe('true');
    });

    it('should highlight when time exceeds 50 seconds', () => {
      render(<TimerDisplay elapsedMs={55000} />);
      const timerDisplay = screen.getByTestId('timer-display');
      expect(timerDisplay.getAttribute('data-approaching-end')).toBe('true');
    });

    it('should highlight at 60 seconds', () => {
      render(<TimerDisplay elapsedMs={60000} />);
      const timerDisplay = screen.getByTestId('timer-display');
      expect(timerDisplay.getAttribute('data-approaching-end')).toBe('true');
    });

    it('should apply warning background color when approaching end', () => {
      render(<TimerDisplay elapsedMs={50000} />);
      const timerDisplay = screen.getByTestId('timer-display');
      expect(timerDisplay).toHaveClass('bg-orange-500/95');
      expect(timerDisplay).toHaveClass('animate-pulse-scale');
    });

    it('should apply normal background color when not approaching end', () => {
      render(<TimerDisplay elapsedMs={30000} />);
      const timerDisplay = screen.getByTestId('timer-display');
      expect(timerDisplay).toHaveClass('bg-white/95');
      expect(timerDisplay).not.toHaveClass('animate-pulse-scale');
    });
  });

  describe('Component Rendering', () => {
    it('should render timer display element', () => {
      render(<TimerDisplay elapsedMs={0} />);
      const timerDisplay = screen.getByTestId('timer-display');
      expect(timerDisplay).toBeInTheDocument();
    });

    it('should render clock icon', () => {
      const { container } = render(<TimerDisplay elapsedMs={0} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should render timer value', () => {
      render(<TimerDisplay elapsedMs={0} />);
      const timerValue = screen.getByTestId('timer-value');
      expect(timerValue).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle 0 milliseconds', () => {
      render(<TimerDisplay elapsedMs={0} />);
      const timerValue = screen.getByTestId('timer-value');
      expect(timerValue.textContent).toBe('00:00');
    });

    it('should handle fractional seconds (rounds down)', () => {
      render(<TimerDisplay elapsedMs={5999} />);
      const timerValue = screen.getByTestId('timer-value');
      expect(timerValue.textContent).toBe('00:05');
    });

    it('should handle large elapsed times', () => {
      render(<TimerDisplay elapsedMs={125000} />);
      const timerValue = screen.getByTestId('timer-value');
      expect(timerValue.textContent).toBe('02:05');
    });

    it('should handle exactly 49999ms (just before threshold)', () => {
      render(<TimerDisplay elapsedMs={49999} />);
      const timerDisplay = screen.getByTestId('timer-display');
      expect(timerDisplay.getAttribute('data-approaching-end')).toBe('false');
    });

    it('should handle exactly 50000ms (at threshold)', () => {
      render(<TimerDisplay elapsedMs={50000} />);
      const timerDisplay = screen.getByTestId('timer-display');
      expect(timerDisplay.getAttribute('data-approaching-end')).toBe('true');
    });
  });

  describe('Custom Target Duration', () => {
    it('should accept custom target duration', () => {
      render(<TimerDisplay elapsedMs={30000} targetDurationMs={120000} />);
      const timerValue = screen.getByTestId('timer-value');
      expect(timerValue.textContent).toBe('00:30');
    });

    it('should still highlight at 50 seconds regardless of target duration', () => {
      render(<TimerDisplay elapsedMs={50000} targetDurationMs={120000} />);
      const timerDisplay = screen.getByTestId('timer-display');
      expect(timerDisplay.getAttribute('data-approaching-end')).toBe('true');
    });
  });
});

describe('Property-Based Tests', () => {
  /**
   * **Validates: Requirements 5.4**
   * 
   * Property 15: Timer Display Accuracy
   * For any point during an active conversation session, the displayed elapsed time
   * should match the actual elapsed time within 1 second accuracy.
   */
  it('Property 15: displayed time matches actual elapsed time within 1 second accuracy', () => {
    fc.assert(
      fc.property(
        // Generate elapsed time in milliseconds (0 to 120 seconds for testing)
        fc.integer({ min: 0, max: 120000 }),
        (elapsedMs) => {
          // Render the timer with the generated elapsed time
          const { unmount } = render(<TimerDisplay elapsedMs={elapsedMs} />);
          
          try {
            // Get the displayed time
            const timerValue = screen.getByTestId('timer-value');
            const displayedTime = timerValue.textContent || '';
            
            // Parse displayed time (MM:SS format)
            const [minutesStr, secondsStr] = displayedTime.split(':');
            const displayedMinutes = parseInt(minutesStr, 10);
            const displayedSeconds = parseInt(secondsStr, 10);
            const displayedTotalSeconds = displayedMinutes * 60 + displayedSeconds;
            
            // Calculate actual elapsed time in seconds
            const actualElapsedSeconds = Math.floor(elapsedMs / 1000);
            
            // Verify displayed time matches actual time within 1 second accuracy
            // The difference should be 0 (exact match) since we're using Math.floor
            const difference = Math.abs(displayedTotalSeconds - actualElapsedSeconds);
            expect(difference).toBeLessThanOrEqual(1);
            
            // Additional verification: displayed time should never exceed actual time by more than 1 second
            expect(displayedTotalSeconds).toBeLessThanOrEqual(actualElapsedSeconds + 1);
            
            // Additional verification: displayed time should never be less than actual time by more than 1 second
            expect(displayedTotalSeconds).toBeGreaterThanOrEqual(actualElapsedSeconds - 1);
            
            // Verify the format is correct (MM:SS with leading zeros)
            expect(displayedTime).toMatch(/^\d{2}:\d{2}$/);
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});
