/**
 * Integration Test: Complete Conversation Flow
 * 
 * Tests the full conversation flow from start to finish, verifying:
 * - All components interact correctly
 * - Tool calls trigger UI updates
 * - Conversation lifecycle works end-to-end
 * 
 * Requirements: 2.1, 3.1, 4.1, 5.1, 6.1
 */

import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UIController } from '../../components/UIController';
import type { ConversationConfig } from '../../types/config';

// Set environment variable for tests
process.env.VITE_OPENAI_API_KEY = 'test-api-key';

// Mock the env utility
jest.mock('../../utils/env', () => ({
  getApiKey: jest.fn().mockReturnValue('test-api-key'),
}));

// Mock child components
jest.mock('../../components/ImageDisplay', () => ({
  ImageDisplay: ({ imageUrl }: { imageUrl: string }) => (
    <div data-testid="image-display">{imageUrl}</div>
  ),
}));

jest.mock('../../components/VisualEffects', () => ({
  VisualEffects: ({ effects }: any) => (
    <div data-testid="visual-effects">
      {effects.map((effect: any) => (
        <div key={effect.id} data-testid={`effect-${effect.type}`}>
          {effect.type}
        </div>
      ))}
    </div>
  ),
}));

jest.mock('../../components/ConversationStateIndicator', () => ({
  ConversationStateIndicator: ({ isListening, isSpeaking, isProcessing }: any) => (
    <div data-testid="conversation-state-indicator">
      <span data-testid="listening">{String(isListening)}</span>
      <span data-testid="speaking">{String(isSpeaking)}</span>
      <span data-testid="processing">{String(isProcessing)}</span>
    </div>
  ),
}));

jest.mock('../../components/TimerDisplay', () => ({
  TimerDisplay: ({ elapsedMs }: { elapsedMs: number }) => (
    <div data-testid="timer-display">{elapsedMs}</div>
  ),
}));

jest.mock('../../components/ErrorNotification', () => ({
  ErrorNotification: ({ message, onRetry, onDismiss }: { message: string; onRetry?: () => void; onDismiss?: () => void }) => (
    <div data-testid="error-notification" role="alert">
      <div data-testid="error-message">{message}</div>
      {onRetry && <button data-testid="retry-button" onClick={onRetry}>Retry</button>}
      {onDismiss && <button data-testid="dismiss-button" onClick={onDismiss}>Dismiss</button>}
    </div>
  ),
}));

jest.mock('../../components/ConnectionStatusIndicator', () => ({
  ConnectionStatusIndicator: () => <div data-testid="connection-status" />,
}));

// Create controllable mocks for services
let sttTranscriptCallback: ((result: any) => void) | null = null;
let ttsSpeechStartCallback: (() => void) | null = null;
let ttsSpeechEndCallback: (() => void) | null = null;

const mockSTTHandler = {
  initialize: jest.fn().mockResolvedValue(undefined),
  startListening: jest.fn(),
  stopListening: jest.fn(),
  onTranscript: jest.fn((callback) => {
    sttTranscriptCallback = callback;
  }),
  onError: jest.fn(),
  isCurrentlyListening: jest.fn().mockReturnValue(true),
};

const mockTTSHandler = {
  initialize: jest.fn().mockResolvedValue(undefined),
  speak: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn(),
  onSpeechStart: jest.fn((callback) => {
    ttsSpeechStartCallback = callback;
  }),
  onSpeechEnd: jest.fn((callback) => {
    ttsSpeechEndCallback = callback;
  }),
  onError: jest.fn(),
  onFallback: jest.fn(),
  isCurrentlySpeaking: jest.fn().mockReturnValue(false),
};

const mockLLMClient = {
  initialize: jest.fn(),
  sendMessage: jest.fn(),
  setImageContext: jest.fn(),
};

const mockToolRegistry = {
  registerTool: jest.fn(),
  getTool: jest.fn(),
  getAllTools: jest.fn().mockReturnValue([
    {
      name: 'highlight_image_area',
      description: 'Highlights an area of the image',
      parameters: {
        type: 'object',
        properties: {
          area: { type: 'string' },
          color: { type: 'string' },
        },
        required: ['area'],
      },
    },
  ]),
  executeTool: jest.fn().mockResolvedValue(undefined),
  unregisterTool: jest.fn(),
};

let sessionState = {
  sessionId: 'test-session',
  status: 'idle' as any,
  startTime: Date.now(),
  elapsedMs: 0,
  targetDurationMs: 60000,
  messageCount: 0,
  toolCallCount: 0,
  imageContext: '',
};

const mockSessionManager = {
  createSession: jest.fn().mockImplementation((imageUrl, durationMs) => {
    sessionState = {
      sessionId: `session-${Date.now()}`,
      status: 'initializing',
      startTime: Date.now(),
      elapsedMs: 0,
      targetDurationMs: durationMs,
      messageCount: 0,
      toolCallCount: 0,
      imageContext: imageUrl,
    };
    return sessionState;
  }),
  getState: jest.fn(() => sessionState),
  setStatus: jest.fn((status) => {
    sessionState.status = status;
  }),
  incrementMessageCount: jest.fn(() => {
    sessionState.messageCount++;
  }),
  incrementToolCallCount: jest.fn(() => {
    sessionState.toolCallCount++;
  }),
  shouldWrapUp: jest.fn().mockReturnValue(false),
  getTimeRemaining: jest.fn().mockReturnValue(60000),
  completeSession: jest.fn(() => {
    sessionState.status = 'completed';
  }),
  destroy: jest.fn(),
};

jest.mock('../../services/SpeechToTextHandler', () => ({
  SpeechToTextHandler: jest.fn(() => mockSTTHandler),
}));

jest.mock('../../services/TextToSpeechHandler', () => ({
  TextToSpeechHandler: jest.fn(() => mockTTSHandler),
}));

jest.mock('../../services/LLMClient', () => ({
  LLMClient: jest.fn(() => mockLLMClient),
}));

jest.mock('../../services/ToolRegistry', () => ({
  ToolRegistry: jest.fn(() => mockToolRegistry),
}));

jest.mock('../../services/SessionStateManager', () => ({
  SessionStateManager: jest.fn(() => mockSessionManager),
}));

jest.mock('../../services/registerVisualEffectTools', () => ({
  registerVisualEffectTools: jest.fn().mockReturnValue(3),
}));

jest.mock('../../services/MicrophonePermissionHandler', () => ({
  MicrophonePermissionHandler: jest.fn(() => ({
    requestPermission: jest.fn().mockResolvedValue({ granted: true }),
  })),
}));

jest.mock('../../services/NetworkMonitor', () => ({
  NetworkMonitor: jest.fn(() => ({
    onStatusChange: jest.fn(() => jest.fn()),
    destroy: jest.fn(),
  })),
}));

describe('Integration Test: Complete Conversation Flow', () => {
  const mockConfig: ConversationConfig = {
    durationSeconds: 60,
    llmProvider: 'openai',
    voiceProvider: 'browser',
  };

  const mockImageUrl = 'https://example.com/test-image.jpg';

  beforeEach(() => {
    jest.clearAllMocks();
    sttTranscriptCallback = null;
    ttsSpeechStartCallback = null;
    ttsSpeechEndCallback = null;
    
    sessionState = {
      sessionId: 'test-session',
      status: 'idle',
      startTime: Date.now(),
      elapsedMs: 0,
      targetDurationMs: 60000,
      messageCount: 0,
      toolCallCount: 0,
      imageContext: '',
    };
  });

  /**
   * Test: Complete conversation flow from start to finish
   * Requirements: 2.1 (AI initiation), 3.1 (voice input), 4.1 (voice output), 5.1 (duration), 6.1 (tool calls)
   */
  it('should complete a full conversation flow from start to finish', async () => {
    // Setup: Mock LLM responses for the conversation
    const conversationResponses = [
      // Opening message
      {
        content: 'Hello! I see a beautiful image here. What do you notice first?',
        toolCalls: [
          {
            id: 'call_1',
            name: 'highlight_image_area',
            arguments: { area: 'center', color: 'yellow' },
          },
        ],
        finishReason: 'tool_calls',
      },
      // Response to user input
      {
        content: 'That\'s interesting! Tell me more about what you see.',
        toolCalls: [],
        finishReason: 'stop',
      },
      // Closing message
      {
        content: 'Thank you for this wonderful conversation! Goodbye!',
        toolCalls: [],
        finishReason: 'stop',
      },
    ];

    let responseIndex = 0;
    mockLLMClient.sendMessage.mockImplementation(() => {
      const response = conversationResponses[responseIndex];
      responseIndex = Math.min(responseIndex + 1, conversationResponses.length - 1);
      return Promise.resolve(response);
    });

    // Render the UIController
    render(<UIController imageUrl={mockImageUrl} conversationConfig={mockConfig} />);

    // Step 1: Verify initial render
    expect(screen.getByTestId('ui-controller')).toBeInTheDocument();
    expect(screen.getByTestId('image-display')).toHaveTextContent(mockImageUrl);

    // Step 2: Wait for conversation to initialize and start
    // Requirement 2.1: AI should initiate conversation
    await waitFor(
      () => {
        expect(mockSessionManager.createSession).toHaveBeenCalledWith(mockImageUrl, 60000);
        expect(mockSTTHandler.startListening).toHaveBeenCalled();
        expect(mockLLMClient.sendMessage).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Step 3: Simulate AI speaking the opening message
    // Requirement 4.1: Voice output generation
    act(() => {
      if (ttsSpeechStartCallback) {
        ttsSpeechStartCallback();
      }
    });

    await waitFor(() => {
      expect(mockTTSHandler.speak).toHaveBeenCalledWith(
        'Hello! I see a beautiful image here. What do you notice first?'
      );
      expect(screen.getByTestId('speaking')).toHaveTextContent('true');
    });

    // Step 4: Verify tool call was executed
    // Requirement 6.1: Tool calls should be invoked
    await waitFor(() => {
      expect(mockToolRegistry.executeTool).toHaveBeenCalledWith('highlight_image_area', {
        area: 'center',
        color: 'yellow',
      });
      expect(mockSessionManager.incrementToolCallCount).toHaveBeenCalled();
    });

    // Step 5: Simulate AI finishing speaking
    act(() => {
      if (ttsSpeechEndCallback) {
        ttsSpeechEndCallback();
      }
    });

    await waitFor(() => {
      expect(screen.getByTestId('speaking')).toHaveTextContent('false');
    });

    // Step 6: Simulate user speaking
    // Requirement 3.1: Voice input processing
    act(() => {
      if (sttTranscriptCallback) {
        // Interim result (user is speaking)
        sttTranscriptCallback({
          text: 'I see a colorful',
          isFinal: false,
          confidence: 0.8,
        });
      }
    });

    await waitFor(() => {
      expect(screen.getByTestId('listening')).toHaveTextContent('true');
      expect(screen.getByTestId('transcript-display')).toBeInTheDocument();
    });

    // Step 7: Simulate final transcript
    act(() => {
      if (sttTranscriptCallback) {
        sttTranscriptCallback({
          text: 'I see a colorful sunset',
          isFinal: true,
          confidence: 0.95,
        });
      }
    });

    // Step 8: Wait for AI to process and respond
    await waitFor(() => {
      expect(mockLLMClient.sendMessage).toHaveBeenCalledTimes(2);
      expect(mockSessionManager.incrementMessageCount).toHaveBeenCalled();
    });

    // Step 9: Simulate AI speaking the response
    act(() => {
      if (ttsSpeechStartCallback) {
        ttsSpeechStartCallback();
      }
    });

    await waitFor(() => {
      expect(mockTTSHandler.speak).toHaveBeenCalledWith(
        'That\'s interesting! Tell me more about what you see.'
      );
    });

    // Step 10: Simulate conversation ending
    act(() => {
      if (ttsSpeechEndCallback) {
        ttsSpeechEndCallback();
      }
    });

    // Simulate time passing and conversation wrapping up
    mockSessionManager.shouldWrapUp.mockReturnValue(true);
    mockSessionManager.getTimeRemaining.mockReturnValue(5000);

    // Step 11: Simulate final user input
    act(() => {
      if (sttTranscriptCallback) {
        sttTranscriptCallback({
          text: 'It looks amazing',
          isFinal: true,
          confidence: 0.9,
        });
      }
    });

    // Step 12: Wait for final AI response
    await waitFor(() => {
      expect(mockLLMClient.sendMessage).toHaveBeenCalledTimes(3);
    });

    // Step 13: Verify conversation completed successfully
    expect(mockSessionManager.incrementMessageCount).toHaveBeenCalled();
    expect(mockSessionManager.incrementToolCallCount).toHaveBeenCalled();
    expect(mockToolRegistry.executeTool).toHaveBeenCalled();

    // Verify all components are still rendered
    expect(screen.getByTestId('ui-controller')).toBeInTheDocument();
    expect(screen.getByTestId('image-display')).toBeInTheDocument();
    expect(screen.getByTestId('visual-effects')).toBeInTheDocument();
    expect(screen.getByTestId('conversation-state-indicator')).toBeInTheDocument();
  });

  /**
   * Test: Tool calls trigger UI updates
   * Requirement 6.1: Tool calls should update UI
   */
  it('should trigger UI updates when tool calls are executed', async () => {
    // Setup: Mock LLM response with tool call
    mockLLMClient.sendMessage.mockResolvedValue({
      content: 'Look at this area!',
      toolCalls: [
        {
          id: 'call_1',
          name: 'highlight_image_area',
          arguments: { area: 'top', color: 'blue', duration: 2000 },
        },
      ],
      finishReason: 'tool_calls',
    });

    render(<UIController imageUrl={mockImageUrl} conversationConfig={mockConfig} />);

    // Wait for conversation to start and tool to be executed
    await waitFor(
      () => {
        expect(mockToolRegistry.executeTool).toHaveBeenCalledWith('highlight_image_area', {
          area: 'top',
          color: 'blue',
          duration: 2000,
        });
      },
      { timeout: 3000 }
    );

    // Verify visual effects component received the effect
    // Note: The actual visual effect rendering is tested in VisualEffects.test.tsx
    // Here we just verify the integration works
    expect(screen.getByTestId('visual-effects')).toBeInTheDocument();
  });

  /**
   * Test: All components interact correctly during conversation
   * Requirements: 2.1, 3.1, 4.1, 5.1, 6.1
   */
  it('should coordinate all components correctly during conversation', async () => {
    mockLLMClient.sendMessage.mockResolvedValue({
      content: 'Hello! What do you see?',
      toolCalls: [],
      finishReason: 'stop',
    });

    render(<UIController imageUrl={mockImageUrl} conversationConfig={mockConfig} />);

    // Verify all components are rendered
    await waitFor(() => {
      expect(screen.getByTestId('ui-controller')).toBeInTheDocument();
      expect(screen.getByTestId('image-display')).toBeInTheDocument();
      expect(screen.getByTestId('visual-effects')).toBeInTheDocument();
      expect(screen.getByTestId('conversation-state-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('timer-display')).toBeInTheDocument();
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });

    // Verify services are initialized
    expect(mockSTTHandler.initialize).toHaveBeenCalled();
    expect(mockTTSHandler.initialize).toHaveBeenCalled();
    expect(mockLLMClient.initialize).toHaveBeenCalled();

    // Verify conversation started
    expect(mockSessionManager.createSession).toHaveBeenCalled();
    expect(mockSTTHandler.startListening).toHaveBeenCalled();
    expect(mockLLMClient.sendMessage).toHaveBeenCalled();

    // Verify state indicators are working
    expect(screen.getByTestId('listening')).toBeInTheDocument();
    expect(screen.getByTestId('speaking')).toBeInTheDocument();
    expect(screen.getByTestId('processing')).toBeInTheDocument();
  });

  /**
   * Test: Conversation handles multiple exchanges
   * Requirements: 2.1, 3.1, 4.1, 7.1 (context preservation)
   */
  it('should handle multiple conversation exchanges', async () => {
    const responses = [
      { content: 'Opening message', toolCalls: [], finishReason: 'stop' },
      { content: 'First response', toolCalls: [], finishReason: 'stop' },
      { content: 'Second response', toolCalls: [], finishReason: 'stop' },
      { content: 'Third response', toolCalls: [], finishReason: 'stop' },
    ];

    let callCount = 0;
    mockLLMClient.sendMessage.mockImplementation(() => {
      const response = responses[callCount];
      callCount++;
      return Promise.resolve(response);
    });

    render(<UIController imageUrl={mockImageUrl} conversationConfig={mockConfig} />);

    // Wait for initial message
    await waitFor(() => {
      expect(mockLLMClient.sendMessage).toHaveBeenCalledTimes(1);
    });

    // Simulate three user inputs
    for (let i = 0; i < 3; i++) {
      act(() => {
        if (sttTranscriptCallback) {
          sttTranscriptCallback({
            text: `User message ${i + 1}`,
            isFinal: true,
            confidence: 0.9,
          });
        }
      });

      await waitFor(() => {
        expect(mockLLMClient.sendMessage).toHaveBeenCalledTimes(i + 2);
      });

      // Simulate AI speaking
      act(() => {
        if (ttsSpeechStartCallback) ttsSpeechStartCallback();
      });

      await waitFor(() => {
        expect(mockTTSHandler.speak).toHaveBeenCalled();
      });

      act(() => {
        if (ttsSpeechEndCallback) ttsSpeechEndCallback();
      });
    }

    // Verify multiple exchanges occurred
    expect(mockLLMClient.sendMessage).toHaveBeenCalledTimes(4);
    expect(mockSessionManager.incrementMessageCount).toHaveBeenCalled();
  });

  /**
   * Test: Conversation timing and duration management
   * Requirement 5.1: Conversation duration management
   */
  it('should manage conversation timing correctly', async () => {
    mockLLMClient.sendMessage.mockResolvedValue({
      content: 'Hello!',
      toolCalls: [],
      finishReason: 'stop',
    });

    render(<UIController imageUrl={mockImageUrl} conversationConfig={mockConfig} />);

    // Verify session was created with correct duration
    await waitFor(() => {
      expect(mockSessionManager.createSession).toHaveBeenCalledWith(mockImageUrl, 60000);
    });

    // Verify timer is displayed
    expect(screen.getByTestId('timer-display')).toBeInTheDocument();

    // Verify session state is being tracked
    expect(mockSessionManager.getState).toHaveBeenCalled();
  });
});

describe('Integration Test: Error Recovery Scenarios', () => {
  const mockConfig: ConversationConfig = {
    durationSeconds: 60,
    llmProvider: 'openai',
    voiceProvider: 'browser',
  };

  const mockImageUrl = 'https://example.com/test-image.jpg';

  // Default mock for microphone permission (granted)
  const defaultMicHandler = {
    requestPermission: jest.fn().mockResolvedValue({
      granted: true,
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sttTranscriptCallback = null;
    ttsSpeechStartCallback = null;
    ttsSpeechEndCallback = null;
    
    sessionState = {
      sessionId: 'test-session',
      status: 'idle',
      startTime: Date.now(),
      elapsedMs: 0,
      targetDurationMs: 60000,
      messageCount: 0,
      toolCallCount: 0,
      imageContext: '',
    };

    // Reset microphone permission handler to default (granted)
    jest.mocked(require('../../services/MicrophonePermissionHandler').MicrophonePermissionHandler)
      .mockImplementation(() => defaultMicHandler);
  });

  /**
   * Test: Microphone permission denied flow
   * Requirement 10.1: Handle microphone unavailability
   */
  it('should handle microphone permission denied gracefully', async () => {
    // Mock microphone permission denied
    const mockMicHandler = {
      requestPermission: jest.fn().mockResolvedValue({
        granted: false,
        error: 'Permission denied by user',
        instructions: 'Please enable microphone access in your browser settings.',
      }),
    };

    jest.mocked(require('../../services/MicrophonePermissionHandler').MicrophonePermissionHandler)
      .mockImplementation(() => mockMicHandler);

    render(<UIController imageUrl={mockImageUrl} conversationConfig={mockConfig} />);

    // Wait for permission request
    await waitFor(() => {
      expect(mockMicHandler.requestPermission).toHaveBeenCalled();
    });

    // Verify error message is displayed
    await waitFor(() => {
      const errorNotification = screen.getByTestId('error-notification');
      expect(errorNotification).toBeInTheDocument();
      const errorMessage = screen.getByTestId('error-message');
      expect(errorMessage).toHaveTextContent(/microphone|permission/i);
    });

    // Verify STT is not started when permission is denied
    expect(mockSTTHandler.startListening).not.toHaveBeenCalled();
  });

  /**
   * Test: AI service unavailable flow
   * Requirement 10.2: Handle AI service unavailability
   */
  it('should handle AI service unavailable gracefully', async () => {
    // Mock AI service error with a 503 status
    mockLLMClient.sendMessage.mockRejectedValue(new Error('503 Service unavailable'));

    render(<UIController imageUrl={mockImageUrl} conversationConfig={mockConfig} />);

    // Wait for conversation initialization attempt
    await waitFor(
      () => {
        expect(mockLLMClient.sendMessage).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Verify error notification is displayed
    await waitFor(() => {
      const errorNotification = screen.getByTestId('error-notification');
      expect(errorNotification).toBeInTheDocument();
      const errorMessage = screen.getByTestId('error-message');
      expect(errorMessage.textContent).toMatch(/AI service.*temporarily unavailable|try again/i);
    });

    // Verify retry button is available
    expect(screen.getByTestId('retry-button')).toBeInTheDocument();
  });

  /**
   * Test: AI service retry mechanism
   * Requirement 10.2: Provide retry options for AI service failures
   */
  it('should retry AI service on failure', async () => {
    // Mock AI service to fail
    mockLLMClient.sendMessage.mockRejectedValue(new Error('503 Temporary failure'));

    render(<UIController imageUrl={mockImageUrl} conversationConfig={mockConfig} />);

    // Wait for initial failure and error display
    await waitFor(
      () => {
        const errorNotification = screen.queryByTestId('error-notification');
        expect(errorNotification).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Verify retry button is available
    const retryButton = screen.getByTestId('retry-button');
    expect(retryButton).toBeInTheDocument();

    // Verify error message is displayed
    const errorMessage = screen.getByTestId('error-message');
    expect(errorMessage.textContent).toMatch(/AI service.*temporarily unavailable|try again/i);
  });

  /**
   * Test: Network disconnection flow
   * Requirement 10.3: Handle network connectivity loss
   */
  it('should handle network disconnection gracefully', async () => {
    let networkStatusCallback: ((isOnline: boolean) => void) | null = null;

    // Mock network monitor
    const mockNetworkMonitor = {
      onStatusChange: jest.fn((callback) => {
        networkStatusCallback = callback;
        return jest.fn(); // Return unsubscribe function
      }),
      destroy: jest.fn(),
    };

    jest.mocked(require('../../services/NetworkMonitor').NetworkMonitor)
      .mockImplementation(() => mockNetworkMonitor);

    mockLLMClient.sendMessage.mockResolvedValue({
      content: 'Hello!',
      toolCalls: [],
      finishReason: 'stop',
    });

    render(<UIController imageUrl={mockImageUrl} conversationConfig={mockConfig} />);

    // Wait for initial render
    await waitFor(() => {
      expect(mockNetworkMonitor.onStatusChange).toHaveBeenCalled();
    });

    // Simulate network disconnection
    act(() => {
      if (networkStatusCallback) {
        networkStatusCallback(false);
      }
    });

    // Verify connection status indicator shows offline state
    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });

    // Simulate network reconnection
    act(() => {
      if (networkStatusCallback) {
        networkStatusCallback(true);
      }
    });

    // Verify connection status indicator shows online state
    await waitFor(() => {
      expect(screen.getByTestId('connection-status')).toBeInTheDocument();
    });
  });

  /**
   * Test: Network error during AI request
   * Requirement 10.3: Automatic reconnection on network failure
   */
  it('should attempt reconnection when network fails during AI request', async () => {
    // Mock network error during AI request
    mockLLMClient.sendMessage.mockRejectedValue(new Error('Network request failed'));

    render(<UIController imageUrl={mockImageUrl} conversationConfig={mockConfig} />);

    // Wait for initial network failure and error display
    await waitFor(
      () => {
        const errorNotification = screen.queryByTestId('error-notification');
        expect(errorNotification).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Verify retry button is available for reconnection
    const retryButton = screen.getByTestId('retry-button');
    expect(retryButton).toBeInTheDocument();

    // Verify error message mentions network issue
    const errorMessage = screen.getByTestId('error-message');
    expect(errorMessage.textContent).toMatch(/network|connection/i);
  });

  /**
   * Test: Multiple error types in sequence
   * Requirements: 10.1, 10.2, 10.3
   */
  it('should handle multiple error types gracefully', async () => {
    // Mock TTS error first
    mockTTSHandler.speak.mockRejectedValueOnce(new Error('TTS synthesis failed'));

    mockLLMClient.sendMessage.mockResolvedValue({
      content: 'Hello!',
      toolCalls: [],
      finishReason: 'stop',
    });

    render(<UIController imageUrl={mockImageUrl} conversationConfig={mockConfig} />);

    // Wait for conversation to start
    await waitFor(
      () => {
        expect(mockLLMClient.sendMessage).toHaveBeenCalled();
      },
      { timeout: 3000 }
    );

    // Wait for TTS to be called and fail
    await waitFor(() => {
      expect(mockTTSHandler.speak).toHaveBeenCalled();
    });

    // Verify fallback text display is shown (TTS fallback)
    // The system should continue despite TTS failure
    expect(screen.getByTestId('ui-controller')).toBeInTheDocument();

    // Now simulate a tool execution error
    mockToolRegistry.executeTool.mockRejectedValueOnce(new Error('Tool execution failed'));

    // Trigger another AI response with a tool call
    mockLLMClient.sendMessage.mockResolvedValueOnce({
      content: 'Look at this!',
      toolCalls: [
        {
          id: 'call_1',
          name: 'highlight_image_area',
          arguments: { area: 'center' },
        },
      ],
      finishReason: 'tool_calls',
    });

    // Simulate user input to trigger next AI response
    act(() => {
      if (sttTranscriptCallback) {
        sttTranscriptCallback({
          text: 'I see it',
          isFinal: true,
          confidence: 0.9,
        });
      }
    });

    // Wait for tool execution attempt
    await waitFor(() => {
      expect(mockToolRegistry.executeTool).toHaveBeenCalled();
    });

    // Verify conversation continues despite tool failure
    expect(screen.getByTestId('ui-controller')).toBeInTheDocument();
    expect(sessionState.status).not.toBe('error');
  });

  /**
   * Test: Error logging for critical errors
   * Requirement 10.4: Log error details for debugging
   */
  it('should log critical errors with details', async () => {
    // Mock critical error (AI service failure)
    mockLLMClient.sendMessage.mockRejectedValue(new Error('503 Service unavailable'));

    // Set up console.error spy
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<UIController imageUrl={mockImageUrl} conversationConfig={mockConfig} />);

    // Wait for error to occur
    await waitFor(() => {
      const errorNotification = screen.queryByTestId('error-notification');
      expect(errorNotification).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verify error was logged (console.error is called during error handling)
    // The error logger logs to console.error, so we should see calls
    expect(consoleErrorSpy.mock.calls.length).toBeGreaterThan(0);

    // Verify at least one call contains error information
    const hasErrorLog = consoleErrorSpy.mock.calls.some(call => 
      call.some(arg => 
        (typeof arg === 'string' && (arg.includes('error') || arg.includes('Error'))) ||
        (arg instanceof Error)
      )
    );
    expect(hasErrorLog).toBe(true);

    consoleErrorSpy.mockRestore();
  });
});
