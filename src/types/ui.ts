/**
 * UI state and visual effect type definitions
 */

export type ConversationStatus = 'idle' | 'initializing' | 'active' | 'completed' | 'error';

export type ConnectionStatus = 'online' | 'offline' | 'reconnecting';

export type EffectType = 'highlight' | 'emoji' | 'animation' | 'overlay';

export interface VisualEffect {
  id: string;
  type: EffectType;
  parameters: {
    position?: string;
    color?: string;
    emoji?: string;
    duration?: number;
    [key: string]: any;
  };
  startTime: number;
  endTime?: number;
}

export interface UIState {
  conversationStatus: ConversationStatus;
  elapsedTime: number;
  isAISpeaking: boolean;
  isUserSpeaking: boolean;
  currentTranscript: string;
  visualEffects: VisualEffect[];
  errorMessage?: string;
  connectionStatus: ConnectionStatus;
}
