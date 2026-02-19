/**
 * UIController - Main React component that orchestrates the entire application
 * 
 * Manages the conversation UI by:
 * - Providing global state through React Context
 * - Coordinating all child components (ImageDisplay, VisualEffects, Timer, StateIndicator)
 * - Managing the conversation lifecycle
 * - Handling tool calls from the AI to update UI
 * - Integrating ConversationOrchestrator with STT, TTS, and Tool Registry
 * 
 * Requirements: 2.1, 3.1, 4.1, 6.1, 8.2
 */

import React, { useEffect, useRef } from 'react';
import { UIProvider, useUI } from '../contexts/UIContext';
import { ImageDisplay } from './ImageDisplay';
import { VisualEffects } from './VisualEffects';
import { ConversationStateIndicator } from './ConversationStateIndicator';
import { TimerDisplay } from './TimerDisplay';
import { ErrorNotification } from './ErrorNotification';
import { ConnectionStatusIndicator } from './ConnectionStatusIndicator';
import type { ConversationConfig } from '../types/config';
import { ConversationOrchestrator } from '../services/ConversationOrchestrator';
import { SpeechToTextHandler } from '../services/SpeechToTextHandler';
import { TextToSpeechHandler } from '../services/TextToSpeechHandler';
import { LLMClient } from '../services/LLMClient';
import { ToolRegistry } from '../services/ToolRegistry';
import { SessionStateManager } from '../services/SessionStateManager';
import { NetworkMonitor } from '../services/NetworkMonitor';
import { registerVisualEffectTools } from '../services/registerVisualEffectTools';
import type { VisualEffect } from '../types/ui';
import { getApiKey, getEnv } from '../utils/env';
import { MicrophonePermissionHandler } from '../services/MicrophonePermissionHandler';

export interface UIControllerProps {
  imageUrl: string;
  conversationConfig: ConversationConfig;
}

/**
 * UIControllerContent - Internal component that uses the UI context
 * Integrates all services and manages conversation lifecycle
 * Requirements: 2.1, 3.1, 4.1, 6.1
 */
const UIControllerContent: React.FC<UIControllerProps> = ({ 
  imageUrl, 
  conversationConfig 
}) => {
  const { 
    state,
    setConversationStatus,
    setElapsedTime,
    setAISpeaking,
    setUserSpeaking,
    setCurrentTranscript,
    addVisualEffect,
    removeVisualEffect,
    setErrorMessage,
    setConnectionStatus,
  } = useUI();

  // Service instances (persisted across renders)
  const orchestratorRef = useRef<ConversationOrchestrator | null>(null);
  const toolRegistryRef = useRef<ToolRegistry | null>(null);
  const sessionManagerRef = useRef<SessionStateManager | null>(null);
  const networkMonitorRef = useRef<NetworkMonitor | null>(null);
  const retryCountRef = useRef<number>(0);

  /**
   * Handle retry for AI service errors
   * Requirements: 10.2 (provide retry options)
   */
  const handleRetry = () => {
    retryCountRef.current += 1;
    setErrorMessage(undefined);
    
    // Re-initialize services by triggering useEffect
    // This is done by clearing the orchestrator ref
    if (orchestratorRef.current) {
      orchestratorRef.current.destroy();
      orchestratorRef.current = null;
    }
  };

  /**
   * Handle dismissing error notification
   */
  const handleDismissError = () => {
    setErrorMessage(undefined);
  };

  /**
   * Get user-friendly error message
   * Requirements: 10.2 (display user-friendly error notifications)
   */
  const getUserFriendlyErrorMessage = (error: string): string => {
    const lowerError = error.toLowerCase();
    
    console.log('[UIController] Processing error:', error);
    
    if (lowerError.includes('api key') || lowerError.includes('unauthorized') || lowerError.includes('401')) {
      return 'Unable to connect to AI service. Please check your API key in the .env file.';
    }
    
    if (lowerError.includes('network') || lowerError.includes('fetch') || lowerError.includes('econnrefused')) {
      return 'Network connection issue. Please check your internet connection.';
    }
    
    if (lowerError.includes('timeout')) {
      return 'The AI service is taking too long to respond. Please try again.';
    }
    
    if (lowerError.includes('rate limit') || lowerError.includes('429')) {
      return 'Too many requests. Please wait a moment and try again.';
    }
    
    if (lowerError.includes('500') || lowerError.includes('502') || lowerError.includes('503') || lowerError.includes('504')) {
      return 'The AI service is temporarily unavailable. Please try again in a moment.';
    }
    
    if (lowerError.includes('microphone')) {
      return error; // Microphone errors are already user-friendly
    }
    
    // Return the actual error for debugging
    return `Error: ${error}`;
  };

  /**
   * Initialize all services and start conversation
   * Requirements: 2.1 (initiate within 2 seconds), 3.1 (STT), 4.1 (TTS), 6.1 (tools), 10.1 (microphone permission)
   */
  useEffect(() => {
    let mounted = true;

    const initializeServices = async () => {
      try {
        setConversationStatus('initializing');

        // Request microphone permission first
        // Requirement 10.1: Request microphone access on app start
        const permissionHandler = new MicrophonePermissionHandler();
        const permissionResult = await permissionHandler.requestPermission();

        if (!permissionResult.granted) {
          // Requirement 10.1: Display error message if permission denied
          // Requirement 10.1: Provide instructions for enabling microphone
          const errorMsg = `${permissionResult.error}\n\n${permissionResult.instructions}`;
          setErrorMessage(errorMsg);
          setConversationStatus('error');
          return;
        }

        // Initialize STT Handler
        const sttHandler = new SpeechToTextHandler();
        await sttHandler.initialize({
          language: 'en-US',
          continuous: true,
          interimResults: true,
        });

        // Initialize TTS Handler
        const ttsHandler = new TextToSpeechHandler();
        await ttsHandler.initialize({
          voice: 'Google US English', // Child-friendly voice
          rate: 0.9, // Slightly slower for clarity
          pitch: 1.1, // Slightly higher for child-friendly tone
          volume: 1.0,
        });

        // Initialize LLM Client
        const llmClient = new LLMClient();
        const apiKey = getApiKey();
        
        if (!apiKey) {
          throw new Error('OpenAI API key not configured. Please set VITE_OPENAI_API_KEY environment variable.');
        }

        llmClient.initialize({
          provider: conversationConfig.llmProvider,
          model: getEnv('VITE_OPENAI_MODEL', 'gpt-4o-mini'),
          apiKey,
          temperature: 0.8,
          maxTokens: 150,
        });

        // Initialize Tool Registry and register visual effect tools
        const toolRegistry = new ToolRegistry();
        toolRegistryRef.current = toolRegistry;

        // Register visual effect tools with UI update handlers
        registerVisualEffectTools(toolRegistry);

        // Override tool handlers to update UI state
        setupToolHandlers(toolRegistry);

        // Initialize Session State Manager
        const sessionManager = new SessionStateManager();
        sessionManagerRef.current = sessionManager;

        // Set up session state tracking
        const stateInterval = setInterval(() => {
          if (sessionManager) {
            const sessionState = sessionManager.getState();
            setElapsedTime(sessionState.elapsedMs);
          }
        }, 100);

        // Initialize Conversation Orchestrator with callbacks
        const orchestrator = new ConversationOrchestrator(
          sttHandler,
          llmClient,
          ttsHandler,
          toolRegistry,
          sessionManager,
          {
            onStateChange: (state) => {
              if (!mounted) return;
              
              // Update conversation status based on session state
              const sessionState = state.sessionState;
              if (sessionState) {
                setConversationStatus(sessionState.status);
              }
            },
            onError: (error) => {
              if (!mounted) return;
              console.error('[UIController] Conversation error:', error);
              
              // Requirements: 10.2 (display user-friendly error notifications)
              const friendlyMessage = getUserFriendlyErrorMessage(error.message);
              setErrorMessage(friendlyMessage);
            },
            onTranscript: (text, isFinal) => {
              if (!mounted) return;
              
              // Update transcript display
              if (!isFinal) {
                setCurrentTranscript(text);
                setUserSpeaking(true);
              } else {
                setCurrentTranscript('');
                setUserSpeaking(false);
              }
            },
            onAIResponse: (text) => {
              if (!mounted) return;
              
              // AI is speaking
              setAISpeaking(true);
              setCurrentTranscript(text);
            },
            onToolCall: (toolName, args) => {
              if (!mounted) return;
              console.log('[UIController] Tool called:', toolName, args);
            },
          }
        );

        orchestratorRef.current = orchestrator;

        // Set up TTS callbacks to update speaking state
        ttsHandler.onSpeechStart(() => {
          if (mounted) {
            setAISpeaking(true);
          }
        });

        ttsHandler.onSpeechEnd(() => {
          if (mounted) {
            setAISpeaking(false);
            setCurrentTranscript('');
          }
        });

        // Start the conversation
        // Requirement 2.1: Initiate within 2 seconds
        const durationMs = conversationConfig.durationSeconds * 1000;
        await orchestrator.startConversation(imageUrl, undefined, durationMs);

        // Cleanup function
        return () => {
          mounted = false;
          clearInterval(stateInterval);
          if (orchestrator) {
            orchestrator.destroy();
          }
          if (sessionManager) {
            sessionManager.destroy();
          }
        };

      } catch (error) {
        if (!mounted) return;
        
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize conversation';
        console.error('[UIController] Initialization error:', error);
        console.error('[UIController] Error details:', {
          message: errorMessage,
          apiKeyPresent: !!getApiKey(),
          model: getEnv('VITE_OPENAI_MODEL', 'gpt-4o-mini')
        });
        
        // Requirements: 10.2 (display user-friendly error notifications)
        const friendlyMessage = getUserFriendlyErrorMessage(errorMessage);
        setErrorMessage(friendlyMessage);
        setConversationStatus('error');
      }
    };

    initializeServices();

    // Cleanup on unmount
    return () => {
      mounted = false;
      if (orchestratorRef.current) {
        orchestratorRef.current.destroy();
      }
      if (sessionManagerRef.current) {
        sessionManagerRef.current.destroy();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl, conversationConfig]);

  /**
   * Initialize NetworkMonitor for connection status tracking
   * Requirements: 10.3 (detect network loss, automatic reconnection, display status)
   */
  useEffect(() => {
    // Initialize network monitor
    const networkMonitor = new NetworkMonitor({
      reconnectAttempts: 3,
      reconnectDelayMs: 2000,
    });
    networkMonitorRef.current = networkMonitor;

    // Subscribe to connection status changes
    const unsubscribe = networkMonitor.onStatusChange((status) => {
      setConnectionStatus(status);
      
      // Show error message when offline
      if (status === 'offline') {
        setErrorMessage('Network connection lost. Attempting to reconnect...');
      } else if (status === 'online' && state.errorMessage?.includes('Network connection lost')) {
        // Clear network error when back online
        setErrorMessage(undefined);
      }
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
      networkMonitor.destroy();
    };
  }, [setConnectionStatus, setErrorMessage, state.errorMessage]);

  /**
   * Set up tool handlers to update UI state
   * Requirement 6.1: Wire up Tool Registry to UI updates
   */
  const setupToolHandlers = (toolRegistry: ToolRegistry) => {
    // Get all registered tools and wrap their handlers with UI updates
    const tools = toolRegistry.getAllTools();
    
    tools.forEach(tool => {
      const originalTool = toolRegistry.getTool(tool.name);
      if (!originalTool) return;

      const originalHandler = originalTool.handler;
      
      // Wrap handler to add visual effects to UI state
      const wrappedHandler = async (args: any) => {
        // Execute original handler
        await originalHandler(args);
        
        // Add visual effect to UI state
        const effect: VisualEffect = {
          id: `effect_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          type: getEffectType(tool.name),
          parameters: args,
          startTime: Date.now(),
          endTime: args.duration ? Date.now() + args.duration : undefined,
        };
        
        addVisualEffect(effect);
      };

      // Re-register tool with wrapped handler
      toolRegistry.unregisterTool(tool.name);
      toolRegistry.registerTool({
        ...originalTool,
        handler: wrappedHandler,
      });
    });
  };

  /**
   * Map tool name to effect type
   */
  const getEffectType = (toolName: string): VisualEffect['type'] => {
    if (toolName.includes('highlight')) return 'highlight';
    if (toolName.includes('emoji')) return 'emoji';
    if (toolName.includes('animation')) return 'animation';
    return 'overlay';
  };

  const handleEffectComplete = (effectId: string) => {
    removeVisualEffect(effectId);
  };

  // Determine if processing (not idle, not speaking, not listening)
  const isProcessing = 
    state.conversationStatus === 'initializing' || 
    (!state.isAISpeaking && !state.isUserSpeaking && state.conversationStatus === 'active');

  return (
    <div 
      className="w-full h-screen flex flex-col bg-gray-100 overflow-hidden"
      data-testid="ui-controller"
    >
      {/* Header with Timer and Status */}
      <div 
        className="flex flex-col sm:flex-row justify-between items-center px-3 py-3 sm:px-5 sm:py-4 md:px-6 md:py-5 bg-white shadow-md z-[100] gap-2 sm:gap-0"
      >
        <div className="flex-1 w-full sm:w-auto text-center sm:text-left">
          <h1 className="m-0 text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
            AI Conversation
          </h1>
        </div>
        
        <div className="flex-1 flex justify-center">
          {state.conversationStatus !== 'idle' && (
            <TimerDisplay elapsedMs={state.elapsedTime} />
          )}
        </div>
        
        <div className="hidden sm:block flex-1" />
      </div>

      {/* Main Content Area */}
      <div 
        className="flex-1 flex flex-col items-center justify-center px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-5 relative overflow-hidden"
      >
        {/* Image Display with Visual Effects Overlay */}
        <div 
          className="relative w-full max-w-[95%] sm:max-w-[90%] md:max-w-2xl lg:max-w-3xl xl:max-w-4xl h-full max-h-[300px] sm:max-h-[400px] md:max-h-[500px] lg:max-h-[600px] rounded-lg sm:rounded-xl overflow-hidden shadow-lg sm:shadow-xl bg-white"
        >
          <ImageDisplay imageUrl={imageUrl} />
          <VisualEffects 
            effects={state.visualEffects} 
            onEffectComplete={handleEffectComplete}
          />
        </div>

        {/* Current Transcript Display */}
        {state.currentTranscript && (
          <div 
            className="mt-3 sm:mt-4 md:mt-5 px-4 py-3 sm:px-5 sm:py-3 md:px-6 md:py-4 bg-white/95 rounded-lg sm:rounded-xl shadow-md max-w-[95%] sm:max-w-[90%] md:max-w-2xl lg:max-w-3xl xl:max-w-4xl w-full"
            data-testid="transcript-display"
          >
            <p className="m-0 text-sm sm:text-base md:text-lg text-gray-800 italic">
              "{state.currentTranscript}"
            </p>
          </div>
        )}

        {/* Error Message Display */}
        {state.errorMessage && (
          <ErrorNotification
            message={state.errorMessage}
            onRetry={handleRetry}
            onDismiss={handleDismissError}
          />
        )}
      </div>

      {/* Footer with Conversation State Indicators */}
      <div 
        className="flex flex-col gap-2 sm:gap-2.5 items-center px-3 py-3 sm:px-5 sm:py-4 md:px-6 md:py-5 bg-white shadow-[0_-2px_4px_rgba(0,0,0,0.1)] z-[100]"
      >
        <ConnectionStatusIndicator status={state.connectionStatus} />
        <ConversationStateIndicator
          isListening={state.isUserSpeaking}
          isSpeaking={state.isAISpeaking}
          isProcessing={isProcessing}
        />
      </div>
    </div>
  );
};

/**
 * UIController - Main component wrapped with UIProvider
 */
export const UIController: React.FC<UIControllerProps> = (props) => {
  return (
    <UIProvider>
      <UIControllerContent {...props} />
    </UIProvider>
  );
};
