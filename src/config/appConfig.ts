/**
 * Application Configuration
 * 
 * Centralizes all configuration settings for the AI conversation application.
 * Loads environment variables and provides typed configuration objects.
 * 
 * Requirements: 2.1, 4.1, 5.1
 */

import type { LLMConfig, TTSConfig, ConversationConfig } from '../types/config';
import { getApiKey, getEnv } from '../utils/env';

/**
 * LLM Configuration
 * Configures the language model settings for AI conversation generation
 */
export const llmConfig: LLMConfig = {
  provider: 'openai',
  model: getEnv('VITE_OPENAI_MODEL', 'gpt-4'),
  apiKey: getApiKey(),
  temperature: parseFloat(getEnv('VITE_LLM_TEMPERATURE', '0.7')),
  maxTokens: parseInt(getEnv('VITE_LLM_MAX_TOKENS', '500'), 10),
  baseUrl: getEnv('VITE_OPENAI_BASE_URL'),
};

/**
 * Text-to-Speech Configuration
 * Configures voice synthesis settings for AI responses
 */
export const ttsConfig: TTSConfig = {
  voice: getEnv('VITE_TTS_VOICE', 'en-US'),
  rate: parseFloat(getEnv('VITE_TTS_RATE', '1.0')),
  pitch: parseFloat(getEnv('VITE_TTS_PITCH', '1.0')),
  volume: parseFloat(getEnv('VITE_TTS_VOLUME', '1.0')),
};

/**
 * Conversation Configuration
 * Configures conversation duration and timing thresholds
 */
export const conversationConfig: ConversationConfig = {
  durationSeconds: parseInt(
    getEnv('VITE_CONVERSATION_DURATION_SECONDS', '60'),
    10
  ),
  llmProvider: getEnv('VITE_LLM_PROVIDER', 'openai') as ConversationConfig['llmProvider'],
  voiceProvider: getEnv('VITE_VOICE_PROVIDER', 'browser') as ConversationConfig['voiceProvider'],
  childAge: getEnv('VITE_CHILD_AGE')
    ? parseInt(getEnv('VITE_CHILD_AGE'), 10)
    : undefined,
};

/**
 * Timing Thresholds
 * Defines timing constraints for conversation management
 */
export const timingConfig = {
  /** Time in seconds when AI should start wrapping up the conversation */
  wrapUpThresholdSeconds: parseInt(
    getEnv('VITE_WRAP_UP_THRESHOLD_SECONDS', '50'),
    10
  ),
  /** Maximum time in seconds for conversation duration */
  maxDurationSeconds: parseInt(
    getEnv('VITE_CONVERSATION_DURATION_SECONDS', '60'),
    10
  ),
  /** Maximum time in milliseconds for AI response generation (Requirement 9.2) */
  aiResponseTimeoutMs: 2000,
  /** Maximum time in milliseconds for tool execution (Requirement 6.2) */
  toolExecutionTimeoutMs: 500,
  /** Maximum time in milliseconds before processing should start (Requirement 9.1) */
  processingStartTimeoutMs: 500,
  /** Maximum time in seconds for conversation initiation (Requirement 2.1) */
  conversationInitTimeoutSeconds: 2,
};

/**
 * Validates that required configuration values are present
 * @throws Error if required configuration is missing
 */
export function validateConfig(): void {
  const errors: string[] = [];

  if (!llmConfig.apiKey) {
    errors.push('VITE_OPENAI_API_KEY is required');
  }

  if (llmConfig.temperature < 0 || llmConfig.temperature > 2) {
    errors.push('VITE_LLM_TEMPERATURE must be between 0 and 2');
  }

  if (llmConfig.maxTokens < 1) {
    errors.push('VITE_LLM_MAX_TOKENS must be greater than 0');
  }

  if (ttsConfig.rate < 0.1 || ttsConfig.rate > 10) {
    errors.push('VITE_TTS_RATE must be between 0.1 and 10');
  }

  if (ttsConfig.pitch < 0 || ttsConfig.pitch > 2) {
    errors.push('VITE_TTS_PITCH must be between 0 and 2');
  }

  if (ttsConfig.volume < 0 || ttsConfig.volume > 1) {
    errors.push('VITE_TTS_VOLUME must be between 0 and 1');
  }

  if (conversationConfig.durationSeconds < 10) {
    errors.push('VITE_CONVERSATION_DURATION_SECONDS must be at least 10');
  }

  if (timingConfig.wrapUpThresholdSeconds >= timingConfig.maxDurationSeconds) {
    errors.push('VITE_WRAP_UP_THRESHOLD_SECONDS must be less than VITE_CONVERSATION_DURATION_SECONDS');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

/**
 * Export all configuration objects
 */
export const appConfig = {
  llm: llmConfig,
  tts: ttsConfig,
  conversation: conversationConfig,
  timing: timingConfig,
};
