/**
 * Session state management type definitions
 */

export type SessionStatus = 'idle' | 'initializing' | 'active' | 'wrapping_up' | 'completed';

export interface SessionState {
  sessionId: string;
  status: SessionStatus;
  startTime: number;
  elapsedMs: number;
  targetDurationMs: number;
  messageCount: number;
  toolCallCount: number;
  imageContext: string;
}
