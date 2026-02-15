/**
 * Tests for PromptManager
 */

import { PromptManager } from './PromptManager';
import type { ImageContext } from '../types/image';

describe('PromptManager', () => {
  let promptManager: PromptManager;
  let sampleImageContext: ImageContext;

  beforeEach(() => {
    promptManager = new PromptManager();
    sampleImageContext = {
      url: 'https://example.com/image.jpg',
      description: 'A colorful garden with flowers and butterflies',
      detectedObjects: ['flowers', 'butterflies', 'garden'],
      colors: ['red', 'yellow', 'green'],
      mood: 'cheerful',
      suggestedTopics: ['nature', 'colors', 'insects'],
    };
  });

  describe('generateSystemPrompt', () => {
    it('should generate a system prompt with image context', () => {
      const prompt = promptManager.generateSystemPrompt(sampleImageContext);

      expect(prompt).toContain('friendly');
      expect(prompt).toContain('IMAGE CONTEXT');
      expect(prompt).toContain(sampleImageContext.description);
    });

    it('should include detected objects in system prompt', () => {
      const prompt = promptManager.generateSystemPrompt(sampleImageContext);

      expect(prompt).toContain('flowers');
      expect(prompt).toContain('butterflies');
      expect(prompt).toContain('garden');
    });

    it('should include colors in system prompt', () => {
      const prompt = promptManager.generateSystemPrompt(sampleImageContext);

      expect(prompt).toContain('red');
      expect(prompt).toContain('yellow');
      expect(prompt).toContain('green');
    });

    it('should include mood in system prompt', () => {
      const prompt = promptManager.generateSystemPrompt(sampleImageContext);

      expect(prompt).toContain('cheerful');
    });

    it('should include suggested topics in system prompt', () => {
      const prompt = promptManager.generateSystemPrompt(sampleImageContext);

      expect(prompt).toContain('nature');
      expect(prompt).toContain('colors');
      expect(prompt).toContain('insects');
    });

    it('should handle minimal image context', () => {
      const minimalContext: ImageContext = {
        url: 'https://example.com/simple.jpg',
        description: 'A simple scene',
      };

      const prompt = promptManager.generateSystemPrompt(minimalContext);

      expect(prompt).toContain('IMAGE CONTEXT');
      expect(prompt).toContain('A simple scene');
    });
  });

  describe('generateOpeningPrompt', () => {
    it('should generate opening prompt referencing image elements', () => {
      const prompt = promptManager.generateOpeningPrompt(sampleImageContext);

      expect(prompt).toContain('Start the conversation');
      expect(prompt).toContain('greeting');
      expect(prompt).toContain('open-ended question');
    });

    it('should mention specific image elements', () => {
      const prompt = promptManager.generateOpeningPrompt(sampleImageContext);

      // Should mention at least one detected object
      const hasElement = 
        prompt.includes('flowers') || 
        prompt.includes('butterflies') || 
        prompt.includes('garden');
      
      expect(hasElement).toBe(true);
    });

    it('should work with image context without detected objects', () => {
      const contextWithoutObjects: ImageContext = {
        url: 'https://example.com/abstract.jpg',
        description: 'An abstract colorful painting',
        colors: ['blue', 'purple'],
      };

      const prompt = promptManager.generateOpeningPrompt(contextWithoutObjects);

      expect(prompt).toContain('Start the conversation');
      expect(prompt.length).toBeGreaterThan(0);
    });
  });

  describe('generateWrapUpPrompt', () => {
    it('should generate wrap-up prompt', () => {
      const prompt = promptManager.generateWrapUpPrompt();

      expect(prompt).toContain('wrapping up');
      expect(prompt).toContain('Summarizing');
      expect(prompt).toContain('goodbye');
    });

    it('should encourage brief response', () => {
      const prompt = promptManager.generateWrapUpPrompt();

      expect(prompt).toContain('brief');
    });

    it('should maintain positive tone', () => {
      const prompt = promptManager.generateWrapUpPrompt();

      expect(prompt).toContain('positive');
    });
  });

  describe('generateClosingPrompt', () => {
    it('should generate closing prompt', () => {
      const prompt = promptManager.generateClosingPrompt();

      expect(prompt).toContain('End the conversation');
      expect(prompt).toContain('goodbye');
    });

    it('should encourage thanking the child', () => {
      const prompt = promptManager.generateClosingPrompt();

      expect(prompt).toContain('Thank');
    });

    it('should be brief', () => {
      const prompt = promptManager.generateClosingPrompt();

      expect(prompt).toContain('brief');
      expect(prompt).toContain('1-2 sentences');
    });

    it('should maintain upbeat tone', () => {
      const prompt = promptManager.generateClosingPrompt();

      expect(prompt).toContain('upbeat');
    });
  });

  describe('getPromptForStatus', () => {
    it('should return opening prompt for initializing status', () => {
      const prompt = promptManager.getPromptForStatus('initializing', sampleImageContext);

      expect(prompt).not.toBeNull();
      expect(prompt).toContain('Start the conversation');
    });

    it('should return wrap-up prompt for wrapping_up status', () => {
      const prompt = promptManager.getPromptForStatus('wrapping_up', sampleImageContext);

      expect(prompt).not.toBeNull();
      expect(prompt).toContain('wrapping up');
    });

    it('should return closing prompt for completed status', () => {
      const prompt = promptManager.getPromptForStatus('completed', sampleImageContext);

      expect(prompt).not.toBeNull();
      expect(prompt).toContain('End the conversation');
    });

    it('should return null for active status', () => {
      const prompt = promptManager.getPromptForStatus('active', sampleImageContext);

      expect(prompt).toBeNull();
    });

    it('should return null for idle status', () => {
      const prompt = promptManager.getPromptForStatus('idle', sampleImageContext);

      expect(prompt).toBeNull();
    });
  });

  describe('age-appropriate prompts', () => {
    it('should generate age-appropriate prompt for young children', () => {
      const youngChildManager = new PromptManager({ childAge: 4 });
      const prompt = youngChildManager.generateSystemPrompt(sampleImageContext);

      expect(prompt).toContain('simple words');
      expect(prompt).toContain('short sentences');
    });

    it('should generate age-appropriate prompt for middle-age children', () => {
      const middleAgeManager = new PromptManager({ childAge: 7 });
      const prompt = middleAgeManager.generateSystemPrompt(sampleImageContext);

      expect(prompt).toContain('clear, simple language');
    });

    it('should generate age-appropriate prompt for older children', () => {
      const olderChildManager = new PromptManager({ childAge: 10 });
      const prompt = olderChildManager.generateSystemPrompt(sampleImageContext);

      expect(prompt).toContain('varied vocabulary');
      expect(prompt).toContain('analytical questions');
    });
  });

  describe('conversation style', () => {
    it('should generate playful style prompts', () => {
      const playfulManager = new PromptManager({ conversationStyle: 'playful' });
      const prompt = playfulManager.generateSystemPrompt(sampleImageContext);

      expect(prompt).toContain('playful');
      expect(prompt).toContain('fun');
    });

    it('should generate exploratory style prompts', () => {
      const exploratoryManager = new PromptManager({ conversationStyle: 'exploratory' });
      const prompt = exploratoryManager.generateSystemPrompt(sampleImageContext);

      expect(prompt).toContain('observation');
      expect(prompt).toContain('discovery');
    });

    it('should generate educational style prompts by default', () => {
      const prompt = promptManager.generateSystemPrompt(sampleImageContext);

      expect(prompt).toContain('learning');
      expect(prompt).toContain('educational');
    });
  });

  describe('updateOptions', () => {
    it('should update child age', () => {
      promptManager.updateOptions({ childAge: 5 });
      const options = promptManager.getOptions();

      expect(options.childAge).toBe(5);
    });

    it('should update conversation style', () => {
      promptManager.updateOptions({ conversationStyle: 'playful' });
      const options = promptManager.getOptions();

      expect(options.conversationStyle).toBe('playful');
    });

    it('should partially update options', () => {
      promptManager.updateOptions({ childAge: 6 });
      const options = promptManager.getOptions();

      expect(options.childAge).toBe(6);
      expect(options.conversationStyle).toBe('educational'); // Should remain unchanged
    });
  });

  describe('getOptions', () => {
    it('should return current options', () => {
      const options = promptManager.getOptions();

      expect(options).toHaveProperty('childAge');
      expect(options).toHaveProperty('conversationStyle');
    });

    it('should return default options when not specified', () => {
      const options = promptManager.getOptions();

      expect(options.childAge).toBe(8);
      expect(options.conversationStyle).toBe('educational');
    });
  });

  describe('edge cases', () => {
    it('should handle empty detected objects array', () => {
      const context: ImageContext = {
        url: 'https://example.com/image.jpg',
        description: 'A scene',
        detectedObjects: [],
      };

      const prompt = promptManager.generateOpeningPrompt(context);
      expect(prompt.length).toBeGreaterThan(0);
    });

    it('should handle missing optional fields', () => {
      const minimalContext: ImageContext = {
        url: 'https://example.com/image.jpg',
        description: 'A minimal scene',
      };

      const systemPrompt = promptManager.generateSystemPrompt(minimalContext);
      const openingPrompt = promptManager.generateOpeningPrompt(minimalContext);

      expect(systemPrompt.length).toBeGreaterThan(0);
      expect(openingPrompt.length).toBeGreaterThan(0);
    });

    it('should handle very long descriptions', () => {
      const longDescription = 'A '.repeat(100) + 'beautiful scene';
      const context: ImageContext = {
        url: 'https://example.com/image.jpg',
        description: longDescription,
      };

      const prompt = promptManager.generateSystemPrompt(context);
      expect(prompt).toContain(longDescription);
    });
  });
});
