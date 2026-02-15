import type { LLMConfig, TTSConfig, ConversationConfig } from '../types/config';
import { getApiKey, getEnv } from '../utils/env';
export const llmConfig: LLMConfig = {
  provider: 'openai',
  model: getEnv('VITE_OPENAI_MODEL', 'gpt-4'),
  apiKey: getApiKey(),
  temperature: parseFloat(getEnv('VITE_LLM_TEMPERATURE', '0.7')),
  maxTokens: parseInt(getEnv('VITE_LLM_MAX_TOKENS', '500'), 10),
  baseUrl: getEnv('VITE_OPENAI_BASE_URL'),
};

export const ttsConfig: TTSConfig = {
  voice: getEnv('VITE_TTS_VOICE', 'en-US'),
  rate: parseFloat(getEnv('VITE_TTS_RATE', '1.0')),
  pitch: parseFloat(getEnv('VITE_TTS_PITCH', '1.0')),
  volume: parseFloat(getEnv('VITE_TTS_VOLUME', '1.0')),
};

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

export const timingConfig = {
  wrapUpThresholdSeconds: parseInt(
    getEnv('VITE_WRAP_UP_THRESHOLD_SECONDS', '50'),
    10
  ),
  maxDurationSeconds: parseInt(
    getEnv('VITE_CONVERSATION_DURATION_SECONDS', '60'),
    10
  ),
  aiResponseTimeoutMs: 2000,
  toolExecutionTimeoutMs: 500,
  processingStartTimeoutMs: 500,
  conversationInitTimeoutSeconds: 2,
};

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

export const appConfig = {
  llm: llmConfig,
  tts: ttsConfig,
  conversation: conversationConfig,
  timing: timingConfig,
};
