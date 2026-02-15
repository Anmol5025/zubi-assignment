/**
 * Tests for Application Configuration
 */

import {
  llmConfig,
  ttsConfig,
  conversationConfig,
  timingConfig,
  validateConfig,
  appConfig,
} from './appConfig';

describe('appConfig', () => {
  describe('LLM Configuration', () => {
    it('should have valid LLM configuration structure', () => {
      expect(llmConfig).toHaveProperty('provider');
      expect(llmConfig).toHaveProperty('model');
      expect(llmConfig).toHaveProperty('temperature');
      expect(llmConfig).toHaveProperty('maxTokens');
      expect(['openai', 'anthropic', 'local']).toContain(llmConfig.provider);
    });

    it('should have temperature within valid range', () => {
      expect(llmConfig.temperature).toBeGreaterThanOrEqual(0);
      expect(llmConfig.temperature).toBeLessThanOrEqual(2);
    });

    it('should have positive max tokens', () => {
      expect(llmConfig.maxTokens).toBeGreaterThan(0);
    });
  });

  describe('TTS Configuration', () => {
    it('should have valid TTS configuration structure', () => {
      expect(ttsConfig).toHaveProperty('voice');
      expect(ttsConfig).toHaveProperty('rate');
      expect(ttsConfig).toHaveProperty('pitch');
      expect(ttsConfig).toHaveProperty('volume');
    });

    it('should have rate within valid range', () => {
      expect(ttsConfig.rate).toBeGreaterThanOrEqual(0.1);
      expect(ttsConfig.rate).toBeLessThanOrEqual(10);
    });

    it('should have pitch within valid range', () => {
      expect(ttsConfig.pitch).toBeGreaterThanOrEqual(0);
      expect(ttsConfig.pitch).toBeLessThanOrEqual(2);
    });

    it('should have volume within valid range', () => {
      expect(ttsConfig.volume).toBeGreaterThanOrEqual(0);
      expect(ttsConfig.volume).toBeLessThanOrEqual(1);
    });
  });

  describe('Conversation Configuration', () => {
    it('should have valid conversation configuration structure', () => {
      expect(conversationConfig).toHaveProperty('durationSeconds');
      expect(conversationConfig).toHaveProperty('llmProvider');
      expect(conversationConfig).toHaveProperty('voiceProvider');
    });

    it('should have valid duration', () => {
      expect(conversationConfig.durationSeconds).toBeGreaterThanOrEqual(10);
    });

    it('should have valid provider types', () => {
      expect(['openai', 'anthropic', 'local']).toContain(
        conversationConfig.llmProvider
      );
      expect(['browser', 'elevenlabs', 'openai']).toContain(
        conversationConfig.voiceProvider
      );
    });
  });

  describe('Timing Configuration', () => {
    it('should have all required timing properties', () => {
      expect(timingConfig).toHaveProperty('wrapUpThresholdSeconds');
      expect(timingConfig).toHaveProperty('maxDurationSeconds');
      expect(timingConfig).toHaveProperty('aiResponseTimeoutMs');
      expect(timingConfig).toHaveProperty('toolExecutionTimeoutMs');
      expect(timingConfig).toHaveProperty('processingStartTimeoutMs');
      expect(timingConfig).toHaveProperty('conversationInitTimeoutSeconds');
    });

    it('should have wrap-up threshold less than max duration', () => {
      expect(timingConfig.wrapUpThresholdSeconds).toBeLessThan(
        timingConfig.maxDurationSeconds
      );
    });

    it('should have correct hardcoded timing constraints', () => {
      expect(timingConfig.aiResponseTimeoutMs).toBe(2000);
      expect(timingConfig.toolExecutionTimeoutMs).toBe(500);
      expect(timingConfig.processingStartTimeoutMs).toBe(500);
      expect(timingConfig.conversationInitTimeoutSeconds).toBe(2);
    });
  });

  describe('Configuration Validation', () => {
    it('should have a validateConfig function', () => {
      expect(typeof validateConfig).toBe('function');
    });

    it('should validate without throwing when config is valid', () => {
      // This test assumes environment variables are set correctly
      // In a real environment with proper config, this should not throw
      if (llmConfig.apiKey) {
        expect(() => validateConfig()).not.toThrow();
      }
    });
  });

  describe('App Config Export', () => {
    it('should export all configuration objects', () => {
      expect(appConfig).toHaveProperty('llm');
      expect(appConfig).toHaveProperty('tts');
      expect(appConfig).toHaveProperty('conversation');
      expect(appConfig).toHaveProperty('timing');
    });

    it('should reference the same config objects', () => {
      expect(appConfig.llm).toBe(llmConfig);
      expect(appConfig.tts).toBe(ttsConfig);
      expect(appConfig.conversation).toBe(conversationConfig);
      expect(appConfig.timing).toBe(timingConfig);
    });
  });
});
