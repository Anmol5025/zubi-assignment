import React, { useEffect, useState } from 'react';
import type { VisualEffect } from '../types/ui';

interface VisualEffectsProps {
  effects: VisualEffect[];
  onEffectComplete?: (effectId: string) => void;
}

/**
 * VisualEffects component renders visual effects on top of the image display.
 * Handles highlights, emoji reactions, animations, and overlays.
 * 
 * Requirements: 6.3
 */
export const VisualEffects: React.FC<VisualEffectsProps> = ({ effects, onEffectComplete }) => {
  const [activeEffects, setActiveEffects] = useState<Set<string>>(new Set());

  useEffect(() => {
    const now = Date.now();
    const newActiveEffects = new Set<string>();

    effects.forEach(effect => {
      const isActive = !effect.endTime || effect.endTime > now;
      if (isActive) {
        newActiveEffects.add(effect.id);
      }
    });

    setActiveEffects(newActiveEffects);
  }, [effects]);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    effects.forEach(effect => {
      if (effect.parameters.duration && effect.parameters.duration > 0) {
        const timer = setTimeout(() => {
          onEffectComplete?.(effect.id);
        }, effect.parameters.duration);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [effects, onEffectComplete]);

  return (
    <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10">
      {effects.map(effect => {
        if (!activeEffects.has(effect.id)) return null;

        switch (effect.type) {
          case 'highlight':
            return <HighlightEffect key={effect.id} effect={effect} />;
          case 'emoji':
            return <EmojiEffect key={effect.id} effect={effect} />;
          case 'animation':
            return <AnimationEffect key={effect.id} effect={effect} />;
          case 'overlay':
            return <OverlayEffect key={effect.id} effect={effect} />;
          default:
            return null;
        }
      })}
    </div>
  );
};

/**
 * HighlightEffect - Renders a highlight overlay on a specific area of the image
 */
const HighlightEffect: React.FC<{ effect: VisualEffect }> = ({ effect }) => {
  const { area, color = 'yellow', opacity = 0.3 } = effect.parameters;

  const getAreaClasses = (area: string): string => {
    const baseClasses = 'absolute rounded-lg border-3 animate-highlight-pulse';
    
    switch (area) {
      case 'top':
        return `${baseClasses} top-[5%] left-[10%] right-[10%] h-[30%]`;
      case 'bottom':
        return `${baseClasses} bottom-[5%] left-[10%] right-[10%] h-[30%]`;
      case 'left':
        return `${baseClasses} top-[10%] left-[5%] w-[30%] bottom-[10%]`;
      case 'right':
        return `${baseClasses} top-[10%] right-[5%] w-[30%] bottom-[10%]`;
      case 'center':
        return `${baseClasses} top-[25%] left-[25%] right-[25%] bottom-[25%]`;
      case 'top-left':
        return `${baseClasses} top-[5%] left-[5%] w-[35%] h-[35%]`;
      case 'top-right':
        return `${baseClasses} top-[5%] right-[5%] w-[35%] h-[35%]`;
      case 'bottom-left':
        return `${baseClasses} bottom-[5%] left-[5%] w-[35%] h-[35%]`;
      case 'bottom-right':
        return `${baseClasses} bottom-[5%] right-[5%] w-[35%] h-[35%]`;
      default:
        return `${baseClasses} top-[25%] left-[25%] right-[25%] bottom-[25%]`;
    }
  };

  return (
    <div 
      className={getAreaClasses(area)}
      style={{
        backgroundColor: color,
        opacity,
        borderColor: color,
        borderWidth: '3px',
      }}
      data-testid={`highlight-${area}`}
    />
  );
};

/**
 * EmojiEffect - Renders an emoji reaction at a specified position
 */
const EmojiEffect: React.FC<{ effect: VisualEffect }> = ({ effect }) => {
  const { emoji, position = 'center', size = 'medium' } = effect.parameters;

  const getPositionClasses = (position: string): string => {
    const baseClasses = 'absolute animate-emoji-appear';
    
    switch (position) {
      case 'top-left':
        return `${baseClasses} top-[10%] left-[10%]`;
      case 'top-right':
        return `${baseClasses} top-[10%] right-[10%]`;
      case 'bottom-left':
        return `${baseClasses} bottom-[10%] left-[10%]`;
      case 'bottom-right':
        return `${baseClasses} bottom-[10%] right-[10%]`;
      case 'center':
      default:
        return `${baseClasses} top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`;
    }
  };

  const getSizeClasses = (size: string): string => {
    switch (size) {
      case 'small':
        return 'text-2xl sm:text-3xl';
      case 'large':
        return 'text-5xl sm:text-6xl md:text-7xl lg:text-8xl';
      case 'medium':
      default:
        return 'text-4xl sm:text-5xl md:text-6xl';
    }
  };

  return (
    <div 
      className={`${getPositionClasses(position)} ${getSizeClasses(size)} animate-emoji-float`}
      data-testid={`emoji-${position}`}
    >
      {emoji}
    </div>
  );
};

/**
 * AnimationEffect - Renders animation effects like sparkle, confetti, pulse, etc.
 */
const AnimationEffect: React.FC<{ effect: VisualEffect }> = ({ effect }) => {
  const { type, intensity = 'medium' } = effect.parameters;

  const getIntensityMultiplier = (intensity: string): number => {
    switch (intensity) {
      case 'low': return 0.5;
      case 'high': return 1.5;
      case 'medium':
      default: return 1;
    }
  };

  const renderAnimation = () => {
    const multiplier = getIntensityMultiplier(intensity);

    switch (type) {
      case 'sparkle':
        return (
          <div className="absolute top-0 left-0 w-full h-full">
            {Array.from({ length: Math.floor(10 * multiplier) }).map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-sparkle"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${1 + Math.random()}s`,
                }}
              />
            ))}
          </div>
        );

      case 'confetti':
        const colors = ['bg-red-400', 'bg-teal-400', 'bg-blue-400', 'bg-orange-300', 'bg-green-300'];
        return (
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
            {Array.from({ length: Math.floor(20 * multiplier) }).map((_, i) => (
              <div
                key={i}
                className={`absolute -top-[10%] w-2.5 h-2.5 ${colors[i % 5]} animate-confetti-fall`}
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            ))}
          </div>
        );

      case 'pulse':
        return (
          <div 
            className="absolute top-1/2 left-1/2 w-4/5 h-4/5 -translate-x-1/2 -translate-y-1/2 border-4 border-blue-500/60 rounded-full animate-pulse-ring"
            style={{
              animationDuration: `${1 / multiplier}s`,
            }}
          />
        );

      case 'bounce':
        return (
          <div 
            className="absolute top-0 left-0 w-full h-full animate-bounce-effect"
            style={{
              animationDuration: `${0.5 / multiplier}s`,
            }}
          />
        );

      case 'shake':
        return (
          <div 
            className="absolute top-0 left-0 w-full h-full animate-shake-effect"
            style={{
              animationDuration: `${0.5 / multiplier}s`,
            }}
          />
        );

      case 'glow':
        return (
          <div 
            className="absolute top-0 left-0 w-full h-full animate-glow"
            style={{
              boxShadow: `inset 0 0 ${50 * multiplier}px rgba(255, 215, 0, 0.8)`,
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div 
      className="animation-effect"
      data-testid={`animation-${type}`}
    >
      {renderAnimation()}
    </div>
  );
};

/**
 * OverlayEffect - Renders a text overlay with different styles
 */
const OverlayEffect: React.FC<{ effect: VisualEffect }> = ({ effect }) => {
  const { content, style = 'info', position = 'center' } = effect.parameters;

  const getStyleClasses = (style: string): string => {
    switch (style) {
      case 'success':
        return 'bg-green-500/90 text-white border-green-500';
      case 'celebration':
        return 'bg-yellow-400/90 text-black border-yellow-400';
      case 'question':
        return 'bg-blue-500/90 text-white border-blue-500';
      case 'info':
      default:
        return 'bg-gray-600/90 text-white border-gray-600';
    }
  };

  const getPositionClasses = (position: string): string => {
    const baseClasses = 'absolute left-1/2 -translate-x-1/2 max-w-[90%] sm:max-w-[80%] px-4 py-3 sm:px-6 sm:py-4 md:px-8 md:py-5 rounded-lg sm:rounded-xl text-base sm:text-xl md:text-2xl font-bold text-center animate-overlay-appear pointer-events-auto border-2 sm:border-3 shadow-xl sm:shadow-2xl';
    
    switch (position) {
      case 'top':
        return `${baseClasses} top-[10%]`;
      case 'bottom':
        return `${baseClasses} bottom-[10%]`;
      case 'center':
      default:
        return `${baseClasses} top-1/2 -translate-y-1/2`;
    }
  };

  return (
    <div 
      className={`${getPositionClasses(position)} ${getStyleClasses(style)}`}
      data-testid={`overlay-${style}`}
    >
      {content}
    </div>
  );
};
