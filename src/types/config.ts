/**
 * Configuration type definitions for services and application
 */

export type LLMProvider = 'openai' | 'anthropic' | 'local';
export type VoiceProvider = 'browser' | 'elevenlabs' | 'openai';

export interface ConversationConfig {
  durationSeconds: number;
  childAge?: number;
  llmProvider: LLMProvider;
  voiceProvider: VoiceProvider;
}

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature: number;
  maxTokens: number;
}

export interface STTConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
}

export interface TTSConfig {
  voice: string;
  rate: number;
  pitch: number;
  volume: number;
}
