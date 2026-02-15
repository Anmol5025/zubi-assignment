/**
 * Unit tests for Visual Effect Tools
 */

import {
  highlightImageArea,
  showEmoji,
  showAnimation,
  showOverlay,
  zoomImage,
  getAllVisualEffectTools,
} from './visualEffectTools';

describe('Visual Effect Tools', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  describe('highlightImageArea', () => {
    it('should have correct tool definition structure', () => {
      expect(highlightImageArea.name).toBe('highlight_image_area');
      expect(highlightImageArea.description).toBeDefined();
      expect(highlightImageArea.parameters.type).toBe('object');
      expect(highlightImageArea.parameters.required).toEqual(['area']);
      expect(highlightImageArea.handler).toBeInstanceOf(Function);
    });

    it('should define all required parameters', () => {
      const { properties } = highlightImageArea.parameters;
      expect(properties.area).toBeDefined();
      expect(properties.area.enum).toContain('top');
      expect(properties.area.enum).toContain('center');
      expect(properties.color).toBeDefined();
      expect(properties.duration).toBeDefined();
    });

    it('should execute with required parameters only', async () => {
      await expect(
        highlightImageArea.handler({ area: 'center' })
      ).resolves.toBeUndefined();
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Highlighting center')
      );
    });

    it('should execute with all parameters', async () => {
      await highlightImageArea.handler({
        area: 'top-left',
        color: 'red',
        duration: 5000,
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Highlighting top-left with color red for 5000ms')
      );
    });

    it('should use default values for optional parameters', async () => {
      await highlightImageArea.handler({ area: 'bottom' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('yellow')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('3000ms')
      );
    });

    it('should support all area positions', async () => {
      const areas = ['top', 'bottom', 'left', 'right', 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
      
      for (const area of areas) {
        await highlightImageArea.handler({ area });
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining(`Highlighting ${area}`)
        );
      }
    });
  });

  describe('showEmoji', () => {
    it('should have correct tool definition structure', () => {
      expect(showEmoji.name).toBe('show_emoji');
      expect(showEmoji.description).toBeDefined();
      expect(showEmoji.parameters.type).toBe('object');
      expect(showEmoji.parameters.required).toEqual(['emoji']);
      expect(showEmoji.handler).toBeInstanceOf(Function);
    });

    it('should define all required parameters', () => {
      const { properties } = showEmoji.parameters;
      expect(properties.emoji).toBeDefined();
      expect(properties.position).toBeDefined();
      expect(properties.position.enum).toContain('center');
      expect(properties.duration).toBeDefined();
      expect(properties.size).toBeDefined();
    });

    it('should execute with required parameters only', async () => {
      await expect(
        showEmoji.handler({ emoji: '😊' })
      ).resolves.toBeUndefined();
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Showing emoji 😊')
      );
    });

    it('should execute with all parameters', async () => {
      await showEmoji.handler({
        emoji: '🎉',
        position: 'top-right',
        duration: 4000,
        size: 'large',
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Showing emoji 🎉 at top-right (large) for 4000ms')
      );
    });

    it('should use default values for optional parameters', async () => {
      await showEmoji.handler({ emoji: '❤️' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('center')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('medium')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('2000ms')
      );
    });

    it('should support all positions', async () => {
      const positions = ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'];
      
      for (const position of positions) {
        await showEmoji.handler({ emoji: '😀', position });
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining(`at ${position}`)
        );
      }
    });

    it('should support all sizes', async () => {
      const sizes = ['small', 'medium', 'large'];
      
      for (const size of sizes) {
        await showEmoji.handler({ emoji: '🌟', size });
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining(`(${size})`)
        );
      }
    });
  });

  describe('showAnimation', () => {
    it('should have correct tool definition structure', () => {
      expect(showAnimation.name).toBe('show_animation');
      expect(showAnimation.description).toBeDefined();
      expect(showAnimation.parameters.type).toBe('object');
      expect(showAnimation.parameters.required).toEqual(['type']);
      expect(showAnimation.handler).toBeInstanceOf(Function);
    });

    it('should define all required parameters', () => {
      const { properties } = showAnimation.parameters;
      expect(properties.type).toBeDefined();
      expect(properties.type.enum).toContain('sparkle');
      expect(properties.target).toBeDefined();
      expect(properties.intensity).toBeDefined();
      expect(properties.duration).toBeDefined();
    });

    it('should execute with required parameters only', async () => {
      await expect(
        showAnimation.handler({ type: 'sparkle' })
      ).resolves.toBeUndefined();
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Showing sparkle animation')
      );
    });

    it('should execute with all parameters', async () => {
      await showAnimation.handler({
        type: 'confetti',
        target: 'image',
        intensity: 'high',
        duration: 2500,
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Showing confetti animation on image (high) for 2500ms')
      );
    });

    it('should support all animation types', async () => {
      const types = ['sparkle', 'confetti', 'pulse', 'bounce', 'shake', 'glow'];
      
      for (const type of types) {
        await showAnimation.handler({ type });
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining(`Showing ${type} animation`)
        );
      }
    });

    it('should support all targets', async () => {
      const targets = ['image', 'screen', 'center'];
      
      for (const target of targets) {
        await showAnimation.handler({ type: 'pulse', target });
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining(`on ${target}`)
        );
      }
    });

    it('should support all intensity levels', async () => {
      const intensities = ['low', 'medium', 'high'];
      
      for (const intensity of intensities) {
        await showAnimation.handler({ type: 'glow', intensity });
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining(`(${intensity})`)
        );
      }
    });
  });

  describe('showOverlay', () => {
    it('should have correct tool definition structure', () => {
      expect(showOverlay.name).toBe('show_overlay');
      expect(showOverlay.description).toBeDefined();
      expect(showOverlay.parameters.type).toBe('object');
      expect(showOverlay.parameters.required).toEqual(['content']);
      expect(showOverlay.handler).toBeInstanceOf(Function);
    });

    it('should define all required parameters', () => {
      const { properties } = showOverlay.parameters;
      expect(properties.content).toBeDefined();
      expect(properties.style).toBeDefined();
      expect(properties.style.enum).toContain('info');
      expect(properties.position).toBeDefined();
      expect(properties.duration).toBeDefined();
    });

    it('should execute with required parameters only', async () => {
      await expect(
        showOverlay.handler({ content: 'Great job!' })
      ).resolves.toBeUndefined();
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Great job!')
      );
    });

    it('should execute with all parameters', async () => {
      await showOverlay.handler({
        content: 'Amazing work!',
        style: 'celebration',
        position: 'top',
        duration: 5000,
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Showing celebration overlay at top: "Amazing work!" for 5000ms')
      );
    });

    it('should support all styles', async () => {
      const styles = ['info', 'success', 'celebration', 'question'];
      
      for (const style of styles) {
        await showOverlay.handler({ content: 'Test', style });
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining(`Showing ${style} overlay`)
        );
      }
    });

    it('should support all positions', async () => {
      const positions = ['top', 'center', 'bottom'];
      
      for (const position of positions) {
        await showOverlay.handler({ content: 'Test', position });
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining(`at ${position}`)
        );
      }
    });

    it('should handle empty content', async () => {
      await showOverlay.handler({ content: '' });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('""')
      );
    });
  });

  describe('zoomImage', () => {
    it('should have correct tool definition structure', () => {
      expect(zoomImage.name).toBe('zoom_image');
      expect(zoomImage.description).toBeDefined();
      expect(zoomImage.parameters.type).toBe('object');
      expect(zoomImage.parameters.required).toEqual(['level']);
      expect(zoomImage.handler).toBeInstanceOf(Function);
    });

    it('should define all required parameters', () => {
      const { properties } = zoomImage.parameters;
      expect(properties.level).toBeDefined();
      expect(properties.level.enum).toContain('in');
      expect(properties.level.enum).toContain('out');
      expect(properties.level.enum).toContain('reset');
      expect(properties.area).toBeDefined();
      expect(properties.duration).toBeDefined();
    });

    it('should execute with required parameters only', async () => {
      await expect(
        zoomImage.handler({ level: 'in' })
      ).resolves.toBeUndefined();
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Zooming in')
      );
    });

    it('should execute with all parameters', async () => {
      await zoomImage.handler({
        level: 'in',
        area: 'top-left',
        duration: 1000,
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Zooming in on top-left over 1000ms')
      );
    });

    it('should support all zoom levels', async () => {
      const levels = ['in', 'out', 'reset'];
      
      for (const level of levels) {
        await zoomImage.handler({ level });
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining(`Zooming ${level}`)
        );
      }
    });

    it('should handle zoom without area', async () => {
      await zoomImage.handler({ level: 'out' });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Zooming out')
      );
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('on ')
      );
    });

    it('should support all areas', async () => {
      const areas = ['top', 'bottom', 'left', 'right', 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
      
      for (const area of areas) {
        await zoomImage.handler({ level: 'in', area });
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining(`on ${area}`)
        );
      }
    });
  });

  describe('getAllVisualEffectTools', () => {
    it('should return all visual effect tools', () => {
      const tools = getAllVisualEffectTools();
      
      expect(tools).toHaveLength(5);
      expect(tools).toContain(highlightImageArea);
      expect(tools).toContain(showEmoji);
      expect(tools).toContain(showAnimation);
      expect(tools).toContain(showOverlay);
      expect(tools).toContain(zoomImage);
    });

    it('should return tools with correct structure', () => {
      const tools = getAllVisualEffectTools();
      
      tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.parameters).toBeDefined();
        expect(tool.parameters.type).toBe('object');
        expect(tool.parameters.properties).toBeDefined();
        expect(tool.parameters.required).toBeInstanceOf(Array);
        expect(tool.handler).toBeInstanceOf(Function);
      });
    });

    it('should return tools with unique names', () => {
      const tools = getAllVisualEffectTools();
      const names = tools.map(tool => tool.name);
      const uniqueNames = new Set(names);
      
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('Integration with ToolRegistry', () => {
    it('should be compatible with ToolRegistry interface', () => {
      const tools = getAllVisualEffectTools();
      
      // Verify each tool matches the ToolDefinition interface
      tools.forEach(tool => {
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(tool.parameters.type).toBe('object');
        expect(typeof tool.parameters.properties).toBe('object');
        expect(Array.isArray(tool.parameters.required)).toBe(true);
        expect(typeof tool.handler).toBe('function');
      });
    });

    it('should have async handlers that return promises', async () => {
      const tools = getAllVisualEffectTools();
      
      for (const tool of tools) {
        const result = tool.handler({});
        expect(result).toBeInstanceOf(Promise);
        await expect(result).resolves.toBeUndefined();
      }
    });
  });

  describe('Error handling', () => {
    it('should handle missing optional parameters gracefully', async () => {
      await expect(highlightImageArea.handler({ area: 'center' })).resolves.toBeUndefined();
      await expect(showEmoji.handler({ emoji: '😊' })).resolves.toBeUndefined();
      await expect(showAnimation.handler({ type: 'sparkle' })).resolves.toBeUndefined();
      await expect(showOverlay.handler({ content: 'Test' })).resolves.toBeUndefined();
      await expect(zoomImage.handler({ level: 'in' })).resolves.toBeUndefined();
    });

    it('should handle undefined values in optional parameters', async () => {
      await expect(
        highlightImageArea.handler({ area: 'center', color: undefined, duration: undefined })
      ).resolves.toBeUndefined();
    });
  });
});
