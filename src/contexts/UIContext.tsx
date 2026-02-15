/**
 * UIContext - React Context for global UI state management
 * 
 * Provides centralized state management for the conversation UI using React Context API
 * and useReducer for complex state updates.
 * 
 * Requirements: 8.2
 */

import React, { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { UIState, VisualEffect, ConversationStatus, ConnectionStatus } from '../types/ui';

// Initial state
const initialState: UIState = {
  conversationStatus: 'idle',
  elapsedTime: 0,
  isAISpeaking: false,
  isUserSpeaking: false,
  currentTranscript: '',
  visualEffects: [],
  errorMessage: undefined,
  connectionStatus: 'online',
};

// Action types
type UIAction =
  | { type: 'SET_CONVERSATION_STATUS'; payload: ConversationStatus }
  | { type: 'SET_ELAPSED_TIME'; payload: number }
  | { type: 'SET_AI_SPEAKING'; payload: boolean }
  | { type: 'SET_USER_SPEAKING'; payload: boolean }
  | { type: 'SET_CURRENT_TRANSCRIPT'; payload: string }
  | { type: 'ADD_VISUAL_EFFECT'; payload: VisualEffect }
  | { type: 'REMOVE_VISUAL_EFFECT'; payload: string }
  | { type: 'CLEAR_VISUAL_EFFECTS' }
  | { type: 'SET_ERROR_MESSAGE'; payload: string | undefined }
  | { type: 'SET_CONNECTION_STATUS'; payload: ConnectionStatus }
  | { type: 'UPDATE_STATE'; payload: Partial<UIState> }
  | { type: 'RESET_STATE' };

// Reducer function
function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'SET_CONVERSATION_STATUS':
      return { ...state, conversationStatus: action.payload };
    
    case 'SET_ELAPSED_TIME':
      return { ...state, elapsedTime: action.payload };
    
    case 'SET_AI_SPEAKING':
      return { ...state, isAISpeaking: action.payload };
    
    case 'SET_USER_SPEAKING':
      return { ...state, isUserSpeaking: action.payload };
    
    case 'SET_CURRENT_TRANSCRIPT':
      return { ...state, currentTranscript: action.payload };
    
    case 'ADD_VISUAL_EFFECT':
      return {
        ...state,
        visualEffects: [...state.visualEffects, action.payload],
      };
    
    case 'REMOVE_VISUAL_EFFECT':
      return {
        ...state,
        visualEffects: state.visualEffects.filter(effect => effect.id !== action.payload),
      };
    
    case 'CLEAR_VISUAL_EFFECTS':
      return { ...state, visualEffects: [] };
    
    case 'SET_ERROR_MESSAGE':
      return { ...state, errorMessage: action.payload };
    
    case 'SET_CONNECTION_STATUS':
      return { ...state, connectionStatus: action.payload };
    
    case 'UPDATE_STATE':
      return { ...state, ...action.payload };
    
    case 'RESET_STATE':
      return initialState;
    
    default:
      return state;
  }
}

// Context type
interface UIContextType {
  state: UIState;
  dispatch: React.Dispatch<UIAction>;
  // Helper functions for common actions
  setConversationStatus: (status: ConversationStatus) => void;
  setElapsedTime: (time: number) => void;
  setAISpeaking: (speaking: boolean) => void;
  setUserSpeaking: (speaking: boolean) => void;
  setCurrentTranscript: (transcript: string) => void;
  addVisualEffect: (effect: VisualEffect) => void;
  removeVisualEffect: (effectId: string) => void;
  clearVisualEffects: () => void;
  setErrorMessage: (message: string | undefined) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  updateState: (updates: Partial<UIState>) => void;
  resetState: () => void;
}

// Create context
const UIContext = createContext<UIContextType | undefined>(undefined);

// Provider props
interface UIProviderProps {
  children: ReactNode;
}

/**
 * UIProvider - Provides UI state to all child components
 */
export const UIProvider: React.FC<UIProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(uiReducer, initialState);

  // Helper functions
  const setConversationStatus = (status: ConversationStatus) => {
    dispatch({ type: 'SET_CONVERSATION_STATUS', payload: status });
  };

  const setElapsedTime = (time: number) => {
    dispatch({ type: 'SET_ELAPSED_TIME', payload: time });
  };

  const setAISpeaking = (speaking: boolean) => {
    dispatch({ type: 'SET_AI_SPEAKING', payload: speaking });
  };

  const setUserSpeaking = (speaking: boolean) => {
    dispatch({ type: 'SET_USER_SPEAKING', payload: speaking });
  };

  const setCurrentTranscript = (transcript: string) => {
    dispatch({ type: 'SET_CURRENT_TRANSCRIPT', payload: transcript });
  };

  const addVisualEffect = (effect: VisualEffect) => {
    dispatch({ type: 'ADD_VISUAL_EFFECT', payload: effect });
  };

  const removeVisualEffect = (effectId: string) => {
    dispatch({ type: 'REMOVE_VISUAL_EFFECT', payload: effectId });
  };

  const clearVisualEffects = () => {
    dispatch({ type: 'CLEAR_VISUAL_EFFECTS' });
  };

  const setErrorMessage = (message: string | undefined) => {
    dispatch({ type: 'SET_ERROR_MESSAGE', payload: message });
  };

  const setConnectionStatus = (status: ConnectionStatus) => {
    dispatch({ type: 'SET_CONNECTION_STATUS', payload: status });
  };

  const updateState = (updates: Partial<UIState>) => {
    dispatch({ type: 'UPDATE_STATE', payload: updates });
  };

  const resetState = () => {
    dispatch({ type: 'RESET_STATE' });
  };

  const value: UIContextType = {
    state,
    dispatch,
    setConversationStatus,
    setElapsedTime,
    setAISpeaking,
    setUserSpeaking,
    setCurrentTranscript,
    addVisualEffect,
    removeVisualEffect,
    clearVisualEffects,
    setErrorMessage,
    setConnectionStatus,
    updateState,
    resetState,
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

/**
 * useUI - Hook to access UI context
 * @throws Error if used outside UIProvider
 */
export const useUI = (): UIContextType => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
