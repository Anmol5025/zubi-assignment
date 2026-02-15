/**
 * Message and conversation-related type definitions
 */

export type MessageRole = 'system' | 'user' | 'assistant';

export interface ToolCall {
  id: string;
  name: string;
  arguments: object;
}

export interface Message {
  role: MessageRole;
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
}

export interface ConversationMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  toolCalls?: ToolCall[];
  metadata?: {
    confidence?: number;
    processingTimeMs?: number;
  };
}

export interface ConversationSession {
  sessionId: string;
  startTime: number;
  messages: Message[];
  imageContext: string;
  durationMs: number;
  toolCallCount: number;
}
