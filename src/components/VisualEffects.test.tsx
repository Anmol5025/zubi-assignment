import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VisualEffects } from './VisualEffects';
import type { VisualEffect } from '../types/ui';

describe('VisualEffects', () => {
  describe('Highlight Effects', () => {
    it('should render highlight effect with specified area', () => {
      const effect: VisualEffect = {
        id: 'highlight-1',
        type: 'highlight',
        parameters: {
          area: 'center',
          color: 'yellow',
          duration: 3000,
        },
        startTime: Date.now(),
      };

      const { container } = render(<VisualEffects effects={[effect]} />);
      
      const highlight = container.querySelector('[data-testid="highlight-center"]');
      expect(highlight).toBeInTheDocument();
    });

    it('should render highlight with custom color', () => {
      const effect: VisualEffect = {
        id: 'highlight-2',
        type: 'highlight',
        parameters: {
          area: 'top',
          color: 'red',
          duration: 2000,
        },
        startTime: Date.now(),
      };

      const { container } = render(<VisualEffects effects={[effect]} />);
      
      const highlight = container.querySelector('[data-testid="highlight-top"]');
      expect(highlight).toBeInTheDocument();
      // Check that the element has the red color in its style (computed style returns rgb format)
      const style = window.getComputedStyle(highlight as Element);
      expect(style.backgroundColor).toBe('rgb(255, 0, 0)');
    });

    it('should render highlights for all area positions', () => {
      const areas = ['top', 'bottom', 'left', 'right', 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
      
      const effects: VisualEffect[] = areas.map((area, index) => ({
        id: `highlight-${index}`,
        type: 'highlight',
        parameters: { area, color: 'yellow', duration: 3000 },
        startTime: Date.now(),
      }));

      const { container } = render(<VisualEffects effects={effects} />);
      
      areas.forEach(area => {
        const highlight = container.querySelector(`[data-testid="highlight-${area}"]`);
        expect(highlight).toBeInTheDocument();
      });
    });
  });

  describe('Emoji Effects', () => {
    it('should render emoji at specified position', () => {
      const effect: VisualEffect = {
        id: 'emoji-1',
        type: 'emoji',
        parameters: {
          emoji: '😊',
          position: 'center',
          size: 'medium',
          duration: 2000,
        },
        startTime: Date.now(),
      };

      const { container } = render(<VisualEffects effects={[effect]} />);
      
      const emoji = container.querySelector('[data-testid="emoji-center"]');
      expect(emoji).toBeInTheDocument();
      expect(emoji).toHaveTextContent('😊');
    });

    it('should render emoji with different sizes', () => {
      const sizes = ['small', 'medium', 'large'];
      
      const effects: VisualEffect[] = sizes.map((size, index) => ({
        id: `emoji-${index}`,
        type: 'emoji',
        parameters: { emoji: '🎉', position: 'center', size, duration: 2000 },
        startTime: Date.now(),
      }));

      const { container } = render(<VisualEffects effects={effects} />);
      
      // Check for emoji elements by their test IDs
      const emojis = container.querySelectorAll('[data-testid^="emoji-"]');
      expect(emojis.length).toBeGreaterThanOrEqual(3);
    });

    it('should render emoji at all positions', () => {
      const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'];
      
      const effects: VisualEffect[] = positions.map((position, index) => ({
        id: `emoji-${index}`,
        type: 'emoji',
        parameters: { emoji: '❤️', position, duration: 2000 },
        startTime: Date.now(),
      }));

      const { container } = render(<VisualEffects effects={effects} />);
      
      positions.forEach(position => {
        const emoji = container.querySelector(`[data-testid="emoji-${position}"]`);
        expect(emoji).toBeInTheDocument();
      });
    });
  });

  describe('Animation Effects', () => {
    it('should render sparkle animation', () => {
      const effect: VisualEffect = {
        id: 'anim-1',
        type: 'animation',
        parameters: {
          type: 'sparkle',
          target: 'screen',
          intensity: 'medium',
          duration: 1500,
        },
        startTime: Date.now(),
      };

      const { container } = render(<VisualEffects effects={[effect]} />);
      
      const animation = container.querySelector('[data-testid="animation-sparkle"]');
      expect(animation).toBeInTheDocument();
    });

    it('should render confetti animation', () => {
      const effect: VisualEffect = {
        id: 'anim-2',
        type: 'animation',
        parameters: {
          type: 'confetti',
          target: 'screen',
          intensity: 'high',
          duration: 2000,
        },
        startTime: Date.now(),
      };

      const { container } = render(<VisualEffects effects={[effect]} />);
      
      const animation = container.querySelector('[data-testid="animation-confetti"]');
      expect(animation).toBeInTheDocument();
    });

    it('should render all animation types', () => {
      const types = ['sparkle', 'confetti', 'pulse', 'bounce', 'shake', 'glow'];
      
      const effects: VisualEffect[] = types.map((type, index) => ({
        id: `anim-${index}`,
        type: 'animation',
        parameters: { type, target: 'screen', intensity: 'medium', duration: 1500 },
        startTime: Date.now(),
      }));

      const { container } = render(<VisualEffects effects={effects} />);
      
      types.forEach(type => {
        const animation = container.querySelector(`[data-testid="animation-${type}"]`);
        expect(animation).toBeInTheDocument();
      });
    });
  });

  describe('Overlay Effects', () => {
    it('should render overlay with content', () => {
      const effect: VisualEffect = {
        id: 'overlay-1',
        type: 'overlay',
        parameters: {
          content: 'Great job!',
          style: 'success',
          position: 'center',
          duration: 3000,
        },
        startTime: Date.now(),
      };

      const { container } = render(<VisualEffects effects={[effect]} />);
      
      const overlay = container.querySelector('[data-testid="overlay-success"]');
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveTextContent('Great job!');
    });

    it('should render overlay with different styles', () => {
      const styles = ['info', 'success', 'celebration', 'question'];
      
      const effects: VisualEffect[] = styles.map((style, index) => ({
        id: `overlay-${index}`,
        type: 'overlay',
        parameters: { content: 'Test', style, position: 'center', duration: 3000 },
        startTime: Date.now(),
      }));

      const { container } = render(<VisualEffects effects={effects} />);
      
      styles.forEach(style => {
        const overlay = container.querySelector(`[data-testid="overlay-${style}"]`);
        expect(overlay).toBeInTheDocument();
      });
    });
  });

  describe('Effect Lifecycle', () => {
    it('should call onEffectComplete when duration expires', async () => {
      const onEffectComplete = jest.fn();
      const effect: VisualEffect = {
        id: 'effect-1',
        type: 'emoji',
        parameters: {
          emoji: '🎉',
          position: 'center',
          duration: 100, // Short duration for testing
        },
        startTime: Date.now(),
      };

      render(<VisualEffects effects={[effect]} onEffectComplete={onEffectComplete} />);
      
      await waitFor(() => {
        expect(onEffectComplete).toHaveBeenCalledWith('effect-1');
      }, { timeout: 200 });
    });

    it('should not render effects with past endTime', () => {
      const effect: VisualEffect = {
        id: 'effect-2',
        type: 'highlight',
        parameters: {
          area: 'center',
          color: 'yellow',
        },
        startTime: Date.now() - 5000,
        endTime: Date.now() - 1000, // Already ended
      };

      const { container } = render(<VisualEffects effects={[effect]} />);
      
      const highlight = container.querySelector('[data-testid="highlight-center"]');
      expect(highlight).not.toBeInTheDocument();
    });

    it('should render multiple effects simultaneously', () => {
      const effects: VisualEffect[] = [
        {
          id: 'effect-1',
          type: 'highlight',
          parameters: { area: 'center', color: 'yellow', duration: 3000 },
          startTime: Date.now(),
        },
        {
          id: 'effect-2',
          type: 'emoji',
          parameters: { emoji: '😊', position: 'top-left', duration: 2000 },
          startTime: Date.now(),
        },
        {
          id: 'effect-3',
          type: 'animation',
          parameters: { type: 'sparkle', target: 'screen', duration: 1500 },
          startTime: Date.now(),
        },
      ];

      const { container } = render(<VisualEffects effects={effects} />);
      
      expect(container.querySelector('[data-testid="highlight-center"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="emoji-top-left"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="animation-sparkle"]')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty effects array', () => {
      const { container } = render(<VisualEffects effects={[]} />);
      
      // Check that the root container exists
      const rootContainer = container.firstChild as HTMLElement;
      expect(rootContainer).toBeInTheDocument();
      expect(rootContainer).toHaveClass('absolute', 'top-0', 'left-0', 'w-full', 'h-full');
      expect(rootContainer.children).toHaveLength(0);
    });

    it('should handle effects without duration', () => {
      const effect: VisualEffect = {
        id: 'effect-permanent',
        type: 'highlight',
        parameters: {
          area: 'center',
          color: 'yellow',
          // No duration - should stay visible
        },
        startTime: Date.now(),
      };

      const { container } = render(<VisualEffects effects={[effect]} />);
      
      const highlight = container.querySelector('[data-testid="highlight-center"]');
      expect(highlight).toBeInTheDocument();
    });

    it('should handle unknown effect type gracefully', () => {
      const effect: VisualEffect = {
        id: 'effect-unknown',
        type: 'unknown' as any,
        parameters: {},
        startTime: Date.now(),
      };

      const { container } = render(<VisualEffects effects={[effect]} />);
      
      // Should not crash, just not render anything for unknown type
      const rootContainer = container.firstChild as HTMLElement;
      expect(rootContainer).toBeInTheDocument();
      expect(rootContainer).toHaveClass('absolute', 'top-0', 'left-0', 'w-full', 'h-full');
    });
  });
});
