/**
 * Service interface definitions for LLM, STT, and TTS
 */

import type { Message, ToolCall } from './message';
import type { LLMConfig, STTConfig, TTSConfig } from './config';

// LLM Client interfaces
export interface Tool {
  name: string;
  description: string;
  parameters: object;
}

export interface AIResponse {
  content: string;
  toolCalls: ToolCall[];
  finishReason: 'stop' | 'length' | 'tool_calls';
}

export interface LLMClient {
  initialize(config: LLMConfig): void;
  sendMessage(messages: Message[], tools: Tool[]): Promise<AIResponse>;
  streamMessage(messages: Message[], tools: Tool[]): AsyncGenerator<AIResponse>;
}

// Speech-to-Text interfaces
export interface TranscriptResult {
  text: string;
  isFinal: boolean;
  confidence: number;
}

export interface SpeechToTextHandler {
  initialize(config: STTConfig): Promise<void>;
  startListening(): void;
  stopListening(): void;
  onTranscript(callback: (result: TranscriptResult) => void): void;
  onError(callback: (error: Error) => void): void;
}

// Text-to-Speech interfaces
export interface SpeechSegment {
  text: string;
  audioUrl?: string;
}

export interface TextToSpeechHandler {
  initialize(config: TTSConfig): Promise<void>;
  speak(text: string): Promise<void>;
  stop(): void;
  onSpeechStart(callback: () => void): void;
  onSpeechEnd(callback: () => void): void;
  onError(callback: (error: Error) => void): void;
  onFallback(callback: (text: string) => void): void;
}
