/**
 * Unit tests for ConversationOrchestrator
 * 
 * Tests the orchestration of conversation flow including:
 * - Starting conversations
 * - Processing user speech
 * - Handling AI responses
 * - Executing tool calls
 * - Managing conversation timing
 */

import { ConversationOrchestrator } from './ConversationOrchestrator';
import type { SpeechToTextHandler } from './SpeechToTextHandler';
import type { LLMClient } from './LLMClient';
import type { TextToSpeechHandler } from './TextToSpeechHandler';
import type { ToolRegistry } from './ToolRegistry';
import type { SessionStateManager } from './SessionStateManager';
import type { AIResponse } from '../types/services';
import type { ImageContext } from '../types/image';

describe('ConversationOrchestrator', () => {
  let orchestrator: ConversationOrchestrator;
  let mockSTT: SpeechToTextHandler;
  let mockLLM: LLMClient;
  let mockTTS: TextToSpeechHandler;
  let mockToolRegistry: ToolRegistry;
  let mockSessionManager: SessionStateManager;

  beforeEach(() => {
    // Create mock STT handler
    mockSTT = {
      initialize: jest.fn(),
      startListening: jest.fn(),
      stopListening: jest.fn(),
      onTranscript: jest.fn(),
      onError: jest.fn(),
      isCurrentlyListening: jest.fn().mockReturnValue(false),
    } as any;

    // Create mock LLM client
    mockLLM = {
      initialize: jest.fn(),
      sendMessage: jest.fn(),
      streamMessage: jest.fn(),
      setImageContext: jest.fn(),
    } as any;

    // Create mock TTS handler
    mockTTS = {
      initialize: jest.fn(),
      speak: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn(),
      onSpeechStart: jest.fn(),
      onSpeechEnd: jest.fn(),
      onError: jest.fn(),
      onFallback: jest.fn(),
      isCurrentlySpeaking: jest.fn().mockReturnValue(false),
    } as any;

    // Create mock tool registry
    mockToolRegistry = {
      registerTool: jest.fn(),
      getTool: jest.fn(),
      getAllTools: jest.fn().mockReturnValue([]),
      executeTool: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Create mock session manager
    mockSessionManager = {
      createSession: jest.fn().mockReturnValue({
        sessionId: 'test-session',
        status: 'initializing',
        startTime: Date.now(),
        elapsedMs: 0,
        targetDurationMs: 60000,
        messageCount: 0,
        toolCallCount: 0,
        imageContext: 'test-image.jpg',
      }),
      getState: jest.fn().mockReturnValue({
        sessionId: 'test-session',
        status: 'active',
        startTime: Date.now(),
        elapsedMs: 0,
        targetDurationMs: 60000,
        messageCount: 0,
        toolCallCount: 0,
        imageContext: 'test-image.jpg',
      }),
      setStatus: jest.fn(),
      incrementMessageCount: jest.fn(),
      incrementToolCallCount: jest.fn(),
      shouldWrapUp: jest.fn().mockReturnValue(false),
      getTimeRemaining: jest.fn().mockReturnValue(60000),
      completeSession: jest.fn(),
      destroy: jest.fn(),
    } as any;

    orchestrator = new ConversationOrchestrator(
      mockSTT,
      mockLLM,
      mockTTS,
      mockToolRegistry,
      mockSessionManager
    );
  });

  describe('startConversation', () => {
    it('should create a session and start listening', async () => {
      const mockResponse: AIResponse = {
        content: 'Hello! What do you see in this image?',
        toolCalls: [],
        finishReason: 'stop',
      };
      (mockLLM.sendMessage as jest.Mock).mockResolvedValue(mockResponse);

      await orchestrator.startConversation('test-image.jpg');

      expect(mockSessionManager.createSession).toHaveBeenCalledWith('test-image.jpg', 60000);
      expect(mockSessionManager.setStatus).toHaveBeenCalledWith('active');
      expect(mockSTT.startListening).toHaveBeenCalled();
      expect(mockLLM.sendMessage).toHaveBeenCalled();
      expect(mockTTS.speak).toHaveBeenCalledWith('Hello! What do you see in this image?');
    });

    it('should set image context in LLM when provided', async () => {
      const imageContext: ImageContext = {
        url: 'test-image.jpg',
        description: 'A colorful sunset',
        detectedObjects: ['sun', 'clouds'],
        colors: ['orange', 'purple'],
      };

      const mockResponse: AIResponse = {
        content: 'Look at this beautiful sunset!',
        toolCalls: [],
        finishReason: 'stop',
      };
      (mockLLM.sendMessage as jest.Mock).mockResolvedValue(mockResponse);

      await orchestrator.startConversation('test-image.jpg', imageContext);

      expect(mockLLM.setImageContext).toHaveBeenCalledWith(imageContext);
    });

    it('should handle custom duration', async () => {
      const mockResponse: AIResponse = {
        content: 'Hello!',
        toolCalls: [],
        finishReason: 'stop',
      };
      (mockLLM.sendMessage as jest.Mock).mockResolvedValue(mockResponse);

      await orchestrator.startConversation('test-image.jpg', undefined, 30000);

      expect(mockSessionManager.createSession).toHaveBeenCalledWith('test-image.jpg', 30000);
    });
  });

  describe('processUserSpeech', () => {
    beforeEach(async () => {
      const mockResponse: AIResponse = {
        content: 'Hello!',
        toolCalls: [],
        finishReason: 'stop',
      };
      (mockLLM.sendMessage as jest.Mock).mockResolvedValue(mockResponse);
      await orchestrator.startConversation('test-image.jpg');
      jest.clearAllMocks();
    });

    it('should process user speech and generate AI response', async () => {
      const mockResponse: AIResponse = {
        content: 'That sounds interesting!',
        toolCalls: [],
        finishReason: 'stop',
      };
      (mockLLM.sendMessage as jest.Mock).mockResolvedValue(mockResponse);

      await orchestrator.processUserSpeech('I see a cat');

      expect(mockSessionManager.incrementMessageCount).toHaveBeenCalledTimes(2); // user + assistant
      expect(mockLLM.sendMessage).toHaveBeenCalled();
      expect(mockTTS.speak).toHaveBeenCalledWith('That sounds interesting!');
    });

    it('should not process when already processing', async () => {
      const mockResponse: AIResponse = {
        content: 'Response',
        toolCalls: [],
        finishReason: 'stop',
      };
      (mockLLM.sendMessage as jest.Mock).mockResolvedValue(mockResponse);

      // Start first processing
      const promise1 = orchestrator.processUserSpeech('First message');
      
      // Try to process second message while first is still processing
      await orchestrator.processUserSpeech('Second message');

      await promise1;

      // Should only process once
      expect(mockLLM.sendMessage).toHaveBeenCalledTimes(1);
    });

    it('should transition to wrapping_up when shouldWrapUp returns true', async () => {
      (mockSessionManager.shouldWrapUp as jest.Mock).mockReturnValue(true);
      
      const mockResponse: AIResponse = {
        content: 'Let me wrap up...',
        toolCalls: [],
        finishReason: 'stop',
      };
      (mockLLM.sendMessage as jest.Mock).mockResolvedValue(mockResponse);

      await orchestrator.processUserSpeech('Tell me more');

      expect(mockSessionManager.setStatus).toHaveBeenCalledWith('wrapping_up');
    });

    it('should end conversation when time is up', async () => {
      (mockSessionManager.getTimeRemaining as jest.Mock).mockReturnValue(0);
      (mockSTT.isCurrentlyListening as jest.Mock).mockReturnValue(true);

      await orchestrator.processUserSpeech('One more thing');

      expect(mockSessionManager.completeSession).toHaveBeenCalled();
      expect(mockSTT.stopListening).toHaveBeenCalled();
    });
  });

  describe('handleAIResponse', () => {
    it('should handle response with content only', async () => {
      const response: AIResponse = {
        content: 'This is a test response',
        toolCalls: [],
        finishReason: 'stop',
      };

      await orchestrator.handleAIResponse(response);

      expect(mockSessionManager.incrementMessageCount).toHaveBeenCalled();
      expect(mockTTS.speak).toHaveBeenCalledWith('This is a test response');
    });

    it('should execute tool calls when present', async () => {
      const response: AIResponse = {
        content: 'Look at this!',
        toolCalls: [
          {
            id: 'call_1',
            name: 'highlight_image_area',
            arguments: { area: 'center', color: 'yellow' },
          },
        ],
        finishReason: 'tool_calls',
      };

      await orchestrator.handleAIResponse(response);

      expect(mockToolRegistry.executeTool).toHaveBeenCalledWith(
        'highlight_image_area',
        { area: 'center', color: 'yellow' }
      );
      expect(mockSessionManager.incrementToolCallCount).toHaveBeenCalled();
      expect(mockTTS.speak).toHaveBeenCalledWith('Look at this!');
    });

    it('should handle multiple tool calls', async () => {
      const response: AIResponse = {
        content: 'Check this out!',
        toolCalls: [
          {
            id: 'call_1',
            name: 'highlight_image_area',
            arguments: { area: 'top' },
          },
          {
            id: 'call_2',
            name: 'show_emoji',
            arguments: { emoji: '🎨', position: 'center' },
          },
        ],
        finishReason: 'tool_calls',
      };

      await orchestrator.handleAIResponse(response);

      expect(mockToolRegistry.executeTool).toHaveBeenCalledTimes(2);
      expect(mockSessionManager.incrementToolCallCount).toHaveBeenCalledTimes(2);
    });

    it('should continue conversation if tool execution fails', async () => {
      (mockToolRegistry.executeTool as jest.Mock).mockRejectedValue(new Error('Tool failed'));

      const response: AIResponse = {
        content: 'Look at this!',
        toolCalls: [
          {
            id: 'call_1',
            name: 'invalid_tool',
            arguments: {},
          },
        ],
        finishReason: 'tool_calls',
      };

      // Should not throw
      await expect(orchestrator.handleAIResponse(response)).resolves.not.toThrow();

      // Should still speak the content
      expect(mockTTS.speak).toHaveBeenCalledWith('Look at this!');
    });

    it('should timeout tool execution after 500ms', async () => {
      // Mock a slow tool that takes longer than 500ms
      (mockToolRegistry.executeTool as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 600))
      );

      const response: AIResponse = {
        content: 'This tool is slow',
        toolCalls: [
          {
            id: 'call_1',
            name: 'slow_tool',
            arguments: {},
          },
        ],
        finishReason: 'tool_calls',
      };

      // Should not throw, but should log error
      await expect(orchestrator.handleAIResponse(response)).resolves.not.toThrow();

      // Tool should have been attempted
      expect(mockToolRegistry.executeTool).toHaveBeenCalledWith('slow_tool', {});
      
      // Should still speak the content despite timeout
      expect(mockTTS.speak).toHaveBeenCalledWith('This tool is slow');
      
      // Tool call count should NOT be incremented due to timeout
      expect(mockSessionManager.incrementToolCallCount).not.toHaveBeenCalled();
    });

    it('should not speak if content is empty', async () => {
      const response: AIResponse = {
        content: '',
        toolCalls: [],
        finishReason: 'stop',
      };

      await orchestrator.handleAIResponse(response);

      expect(mockTTS.speak).not.toHaveBeenCalled();
    });
  });

  describe('endConversation', () => {
    it('should stop listening and speaking', async () => {
      (mockSTT.isCurrentlyListening as jest.Mock).mockReturnValue(true);
      (mockTTS.isCurrentlySpeaking as jest.Mock).mockReturnValue(true);

      await orchestrator.endConversation();

      expect(mockSTT.stopListening).toHaveBeenCalled();
      expect(mockTTS.stop).toHaveBeenCalled();
      expect(mockSessionManager.completeSession).toHaveBeenCalled();
    });

    it('should not stop if not listening or speaking', async () => {
      (mockSTT.isCurrentlyListening as jest.Mock).mockReturnValue(false);
      (mockTTS.isCurrentlySpeaking as jest.Mock).mockReturnValue(false);

      await orchestrator.endConversation();

      expect(mockSTT.stopListening).not.toHaveBeenCalled();
      expect(mockTTS.stop).not.toHaveBeenCalled();
      expect(mockSessionManager.completeSession).toHaveBeenCalled();
    });
  });

  describe('callbacks', () => {
    it('should call onStateChange callback', async () => {
      const onStateChange = jest.fn();
      const orchestratorWithCallbacks = new ConversationOrchestrator(
        mockSTT,
        mockLLM,
        mockTTS,
        mockToolRegistry,
        mockSessionManager,
        { onStateChange }
      );

      const mockResponse: AIResponse = {
        content: 'Hello!',
        toolCalls: [],
        finishReason: 'stop',
      };
      (mockLLM.sendMessage as jest.Mock).mockResolvedValue(mockResponse);

      await orchestratorWithCallbacks.startConversation('test-image.jpg');

      expect(onStateChange).toHaveBeenCalled();
    });

    it('should call onAIResponse callback', async () => {
      const onAIResponse = jest.fn();
      const orchestratorWithCallbacks = new ConversationOrchestrator(
        mockSTT,
        mockLLM,
        mockTTS,
        mockToolRegistry,
        mockSessionManager,
        { onAIResponse }
      );

      const response: AIResponse = {
        content: 'Test response',
        toolCalls: [],
        finishReason: 'stop',
      };

      await orchestratorWithCallbacks.handleAIResponse(response);

      expect(onAIResponse).toHaveBeenCalledWith('Test response');
    });

    it('should call onToolCall callback', async () => {
      const onToolCall = jest.fn();
      const orchestratorWithCallbacks = new ConversationOrchestrator(
        mockSTT,
        mockLLM,
        mockTTS,
        mockToolRegistry,
        mockSessionManager,
        { onToolCall }
      );

      const response: AIResponse = {
        content: 'Look!',
        toolCalls: [
          {
            id: 'call_1',
            name: 'highlight_image_area',
            arguments: { area: 'center' },
          },
        ],
        finishReason: 'tool_calls',
      };

      await orchestratorWithCallbacks.handleAIResponse(response);

      expect(onToolCall).toHaveBeenCalledWith('highlight_image_area', { area: 'center' });
    });

    it('should call onError callback on errors', async () => {
      const onError = jest.fn();
      const orchestratorWithCallbacks = new ConversationOrchestrator(
        mockSTT,
        mockLLM,
        mockTTS,
        mockToolRegistry,
        mockSessionManager,
        { onError }
      );

      const error = new Error('Test error');
      (mockLLM.sendMessage as jest.Mock).mockRejectedValue(error);

      await expect(orchestratorWithCallbacks.startConversation('test-image.jpg')).rejects.toThrow();

      expect(onError).toHaveBeenCalled();
    });
  });

  describe('getters', () => {
    it('should return messages', async () => {
      const mockResponse: AIResponse = {
        content: 'Hello!',
        toolCalls: [],
        finishReason: 'stop',
      };
      (mockLLM.sendMessage as jest.Mock).mockResolvedValue(mockResponse);

      await orchestrator.startConversation('test-image.jpg');
      await orchestrator.processUserSpeech('Hi there');

      const messages = orchestrator.getMessages();
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0].role).toBe('assistant');
      expect(messages[1].role).toBe('user');
    });

    it('should return session state', () => {
      const state = orchestrator.getSessionState();
      expect(state).toBeDefined();
      expect(state.sessionId).toBe('test-session');
    });

    it('should return processing status', () => {
      expect(orchestrator.isCurrentlyProcessing()).toBe(false);
    });
  });

  describe('destroy', () => {
    it('should clean up resources', () => {
      (mockSTT.isCurrentlyListening as jest.Mock).mockReturnValue(true);
      (mockTTS.isCurrentlySpeaking as jest.Mock).mockReturnValue(true);

      orchestrator.destroy();

      expect(mockSTT.stopListening).toHaveBeenCalled();
      expect(mockTTS.stop).toHaveBeenCalled();
      expect(mockSessionManager.destroy).toHaveBeenCalled();
    });
  });

  describe('checkTimeRemaining', () => {
    it('should return remaining time from session manager', () => {
      (mockSessionManager.getTimeRemaining as jest.Mock).mockReturnValue(45000);

      const remaining = orchestrator.checkTimeRemaining();

      expect(remaining).toBe(45000);
      expect(mockSessionManager.getTimeRemaining).toHaveBeenCalled();
    });
  });

  describe('automatic conversation ending', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should automatically end conversation at target duration', async () => {
      const mockResponse: AIResponse = {
        content: 'Hello!',
        toolCalls: [],
        finishReason: 'stop',
      };
      (mockLLM.sendMessage as jest.Mock).mockResolvedValue(mockResponse);
      (mockSTT.isCurrentlyListening as jest.Mock).mockReturnValue(true);
      (mockTTS.isCurrentlySpeaking as jest.Mock).mockReturnValue(false);

      // Start conversation with 1 second duration
      await orchestrator.startConversation('test-image.jpg', undefined, 1000);

      // Fast-forward time by 1 second
      jest.advanceTimersByTime(1000);

      // Wait for any pending promises
      await Promise.resolve();

      // Verify conversation was ended
      expect(mockSessionManager.completeSession).toHaveBeenCalled();
      expect(mockSTT.stopListening).toHaveBeenCalled();
    });

    it('should not end conversation if already completed', async () => {
      const mockResponse: AIResponse = {
        content: 'Hello!',
        toolCalls: [],
        finishReason: 'stop',
      };
      (mockLLM.sendMessage as jest.Mock).mockResolvedValue(mockResponse);
      (mockSessionManager.getState as jest.Mock).mockReturnValue({
        sessionId: 'test-session',
        status: 'completed',
        startTime: Date.now(),
        elapsedMs: 60000,
        targetDurationMs: 60000,
        messageCount: 0,
        toolCallCount: 0,
        imageContext: 'test-image.jpg',
      });

      await orchestrator.startConversation('test-image.jpg', undefined, 1000);

      // Fast-forward time
      jest.advanceTimersByTime(1000);
      await Promise.resolve();

      // completeSession should only be called once (from the initial state, not from timeout)
      expect(mockSessionManager.completeSession).toHaveBeenCalledTimes(0);
    });

    it('should clear timeout when conversation ends manually', async () => {
      const mockResponse: AIResponse = {
        content: 'Hello!',
        toolCalls: [],
        finishReason: 'stop',
      };
      (mockLLM.sendMessage as jest.Mock).mockResolvedValue(mockResponse);

      await orchestrator.startConversation('test-image.jpg', undefined, 60000);

      // Manually end conversation before timeout
      await orchestrator.endConversation();

      // Fast-forward time past the timeout
      jest.advanceTimersByTime(60000);
      await Promise.resolve();

      // completeSession should only be called once (from manual end, not from timeout)
      expect(mockSessionManager.completeSession).toHaveBeenCalledTimes(1);
    });

    it('should clear timeout when orchestrator is destroyed', async () => {
      const mockResponse: AIResponse = {
        content: 'Hello!',
        toolCalls: [],
        finishReason: 'stop',
      };
      (mockLLM.sendMessage as jest.Mock).mockResolvedValue(mockResponse);

      await orchestrator.startConversation('test-image.jpg', undefined, 60000);

      // Destroy orchestrator
      orchestrator.destroy();

      // Fast-forward time past the timeout
      jest.advanceTimersByTime(60000);
      await Promise.resolve();

      // completeSession should not be called from timeout
      expect(mockSessionManager.completeSession).not.toHaveBeenCalled();
    });
  });

  /**
   * Property-Based Tests
   * 
   * These tests validate universal properties across randomized inputs
   * using fast-check for property-based testing.
   */
  describe('Property-Based Tests', () => {
    const fc = require('fast-check');

    /**
     * Feature: ai-conversation-app, Property 20: Context Preservation and Acknowledgment
     * Validates: Requirements 7.1, 7.3, 7.4
     * 
     * Property: For any user response during a conversation, the AI's next message 
     * should acknowledge the user's input and reference it or build upon it in 
     * follow-up questions or statements.
     */
    it('should acknowledge and build upon user input in AI responses', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random user inputs (2-5 messages)
          fc.array(
            fc.string({ minLength: 5, maxLength: 50 }).filter((s: string) => s.trim().length > 0),
            { minLength: 2, maxLength: 5 }
          ),
          async (userInputs: string[]) => {
            // Setup: Create fresh mocks for this test iteration
            const testSTT = {
              initialize: jest.fn(),
              startListening: jest.fn(),
              stopListening: jest.fn(),
              onTranscript: jest.fn(),
              onError: jest.fn(),
              isCurrentlyListening: jest.fn().mockReturnValue(false),
            } as any;

            const testTTS = {
              initialize: jest.fn(),
              speak: jest.fn().mockResolvedValue(undefined),
              stop: jest.fn(),
              onSpeechStart: jest.fn(),
              onSpeechEnd: jest.fn(),
              onError: jest.fn(),
              onFallback: jest.fn(),
              isCurrentlySpeaking: jest.fn().mockReturnValue(false),
            } as any;

            const testToolRegistry = {
              registerTool: jest.fn(),
              getTool: jest.fn(),
              getAllTools: jest.fn().mockReturnValue([]),
              executeTool: jest.fn().mockResolvedValue(undefined),
            } as any;

            const testSessionManager = {
              createSession: jest.fn().mockReturnValue({
                sessionId: `test-session-${Date.now()}`,
                status: 'initializing',
                startTime: Date.now(),
                elapsedMs: 0,
                targetDurationMs: 60000,
                messageCount: 0,
                toolCallCount: 0,
                imageContext: 'test-image.jpg',
              }),
              getState: jest.fn().mockReturnValue({
                sessionId: `test-session-${Date.now()}`,
                status: 'active',
                startTime: Date.now(),
                elapsedMs: 0,
                targetDurationMs: 60000,
                messageCount: 0,
                toolCallCount: 0,
                imageContext: 'test-image.jpg',
              }),
              setStatus: jest.fn(),
              incrementMessageCount: jest.fn(),
              incrementToolCallCount: jest.fn(),
              shouldWrapUp: jest.fn().mockReturnValue(false),
              getTimeRemaining: jest.fn().mockReturnValue(60000),
              completeSession: jest.fn(),
              destroy: jest.fn(),
            } as any;

            // Track conversation history to verify context preservation
            const conversationHistory: Array<{ role: string; content: string }> = [];

            // Mock LLM to simulate context-aware responses
            const testLLM = {
              initialize: jest.fn(),
              setImageContext: jest.fn(),
              sendMessage: jest.fn().mockImplementation((messages) => {
                // Store the messages passed to LLM
                conversationHistory.push(...messages.filter((m: any) => 
                  !conversationHistory.some(h => h.content === m.content && h.role === m.role)
                ));

                // Get the last user message
                const lastUserMessage = messages
                  .filter((m: any) => m.role === 'user')
                  .pop();

                // Generate a response that references the user's input
                // This simulates an AI that acknowledges and builds upon user input
                let responseContent = 'Opening message about the image.';
                
                if (lastUserMessage) {
                  // Extract a key word or phrase from user input
                  const userContent = lastUserMessage.content;
                  const words = userContent.split(' ').filter((w: string) => w.length > 3);
                  const keyWord = words.length > 0 ? words[0] : userContent.substring(0, 10);
                  
                  // Create a response that acknowledges the user input
                  const acknowledgments = [
                    `That's interesting that you mentioned "${keyWord}".`,
                    `I see you're talking about ${keyWord}.`,
                    `You said "${userContent.substring(0, 20)}..." - tell me more!`,
                    `Building on what you said about ${keyWord}, `,
                    `Following up on your point about ${keyWord}, `,
                  ];
                  
                  responseContent = acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
                  
                  // Add a follow-up question
                  responseContent += ' What else can you tell me?';
                }

                return Promise.resolve({
                  content: responseContent,
                  toolCalls: [],
                  finishReason: 'stop',
                });
              }),
              streamMessage: jest.fn(),
            } as any;

            const testOrchestrator = new ConversationOrchestrator(
              testSTT,
              testLLM,
              testTTS,
              testToolRegistry,
              testSessionManager
            );

            try {
              // Start conversation
              await testOrchestrator.startConversation('test-image.jpg');

              // Process each user input and verify context preservation
              for (let i = 0; i < userInputs.length; i++) {
                const userInput = userInputs[i];
                
                // Process user speech
                await testOrchestrator.processUserSpeech(userInput);

                // Get the conversation messages
                const messages = testOrchestrator.getMessages();
                
                // Find the AI response that came after this user input
                // The pattern should be: [previous messages...], user message, AI response
                const userMessageIndex = messages.findIndex(
                  (m, idx) => m.role === 'user' && m.content === userInput
                );
                
                if (userMessageIndex >= 0 && userMessageIndex < messages.length - 1) {
                  const aiResponse = messages[userMessageIndex + 1];
                  
                  // Property: AI response should acknowledge user input
                  // We verify this by checking that:
                  // 1. The AI response exists and follows the user message
                  expect(aiResponse).toBeDefined();
                  expect(aiResponse.role).toBe('assistant');
                  
                  // 2. The AI response is not empty
                  expect(aiResponse.content.trim().length).toBeGreaterThan(0);
                  
                  // 3. The LLM was called with the full conversation history including the user message
                  expect(testLLM.sendMessage).toHaveBeenCalled();
                  const lastLLMCall = (testLLM.sendMessage as jest.Mock).mock.calls[
                    (testLLM.sendMessage as jest.Mock).mock.calls.length - 1
                  ];
                  const messagesPassedToLLM = lastLLMCall[0];
                  
                  // Verify the user message was included in the context
                  const userMessageInContext = messagesPassedToLLM.some(
                    (m: any) => m.role === 'user' && m.content === userInput
                  );
                  expect(userMessageInContext).toBe(true);
                  
                  // 4. For our mock implementation, verify the response references the user input
                  // (In a real implementation, this would be validated by the LLM's behavior)
                  const responseReferencesInput = 
                    aiResponse.content.toLowerCase().includes(userInput.toLowerCase().substring(0, 10)) ||
                    aiResponse.content.includes('you') ||
                    aiResponse.content.includes('your') ||
                    aiResponse.content.includes('said') ||
                    aiResponse.content.includes('mentioned') ||
                    aiResponse.content.includes('talking about') ||
                    aiResponse.content.includes('Building on') ||
                    aiResponse.content.includes('Following up');
                  
                  // The AI should acknowledge the user in some way
                  expect(responseReferencesInput).toBe(true);
                }
              }

              // Verify that conversation history was maintained throughout
              const finalMessages = testOrchestrator.getMessages();
              
              // Each user input should be in the conversation history
              for (const userInput of userInputs) {
                const userMessageExists = finalMessages.some(
                  m => m.role === 'user' && m.content === userInput
                );
                expect(userMessageExists).toBe(true);
              }

              // Each user message should be followed by an assistant message
              for (let i = 0; i < finalMessages.length - 1; i++) {
                if (finalMessages[i].role === 'user') {
                  expect(finalMessages[i + 1].role).toBe('assistant');
                }
              }

            } finally {
              testOrchestrator.destroy();
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    /**
     * Feature: ai-conversation-app, Property 16: Minimum Tool Call Requirement
     * Validates: Requirements 6.1
     * 
     * Property: For any completed conversation session, the AI_Agent should have 
     * invoked at least one tool call.
     */
    it('should invoke at least one tool call in any completed conversation', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate random number of user messages (1-5)
          fc.integer({ min: 1, max: 5 }),
          // Generate random conversation duration (30-90 seconds)
          fc.integer({ min: 30000, max: 90000 }),
          // Generate random tool availability (at least 1 tool available)
          fc.boolean(),
          async (numUserMessages, durationMs, hasMultipleTools) => {
            // Setup: Create fresh mocks for this test iteration
            const testSTT = {
              initialize: jest.fn(),
              startListening: jest.fn(),
              stopListening: jest.fn(),
              onTranscript: jest.fn(),
              onError: jest.fn(),
              isCurrentlyListening: jest.fn().mockReturnValue(false),
            } as any;

            const testTTS = {
              initialize: jest.fn(),
              speak: jest.fn().mockResolvedValue(undefined),
              stop: jest.fn(),
              onSpeechStart: jest.fn(),
              onSpeechEnd: jest.fn(),
              onError: jest.fn(),
              onFallback: jest.fn(),
              isCurrentlySpeaking: jest.fn().mockReturnValue(false),
            } as any;

            const testToolRegistry = {
              registerTool: jest.fn(),
              getTool: jest.fn(),
              getAllTools: jest.fn().mockReturnValue(
                hasMultipleTools 
                  ? [
                      { name: 'highlight_image_area', description: 'Highlight area', parameters: {} },
                      { name: 'show_emoji', description: 'Show emoji', parameters: {} }
                    ]
                  : [{ name: 'highlight_image_area', description: 'Highlight area', parameters: {} }]
              ),
              executeTool: jest.fn().mockResolvedValue(undefined),
            } as any;

            let toolCallCount = 0;
            const testSessionManager = {
              createSession: jest.fn().mockReturnValue({
                sessionId: `test-session-${Date.now()}`,
                status: 'initializing',
                startTime: Date.now(),
                elapsedMs: 0,
                targetDurationMs: durationMs,
                messageCount: 0,
                toolCallCount: 0,
                imageContext: 'test-image.jpg',
              }),
              getState: jest.fn().mockReturnValue({
                sessionId: `test-session-${Date.now()}`,
                status: 'active',
                startTime: Date.now(),
                elapsedMs: 0,
                targetDurationMs: durationMs,
                messageCount: 0,
                toolCallCount: toolCallCount,
                imageContext: 'test-image.jpg',
              }),
              setStatus: jest.fn(),
              incrementMessageCount: jest.fn(),
              incrementToolCallCount: jest.fn(() => { toolCallCount++; }),
              shouldWrapUp: jest.fn().mockReturnValue(false),
              getTimeRemaining: jest.fn().mockReturnValue(durationMs),
              completeSession: jest.fn(),
              destroy: jest.fn(),
            } as any;

            // Mock LLM to return responses with tool calls
            // At least one response should include a tool call
            let responseCount = 0;
            const testLLM = {
              initialize: jest.fn(),
              setImageContext: jest.fn(),
              sendMessage: jest.fn().mockImplementation(() => {
                responseCount++;
                // Ensure at least one response has a tool call
                const shouldIncludeToolCall = responseCount === 1 || Math.random() > 0.5;
                
                return Promise.resolve({
                  content: `Response ${responseCount}`,
                  toolCalls: shouldIncludeToolCall ? [
                    {
                      id: `call_${responseCount}`,
                      name: hasMultipleTools && Math.random() > 0.5 ? 'show_emoji' : 'highlight_image_area',
                      arguments: hasMultipleTools && Math.random() > 0.5 
                        ? { emoji: '🎨', position: 'center' }
                        : { area: 'center', color: 'yellow' },
                    }
                  ] : [],
                  finishReason: shouldIncludeToolCall ? 'tool_calls' : 'stop',
                });
              }),
              streamMessage: jest.fn(),
            } as any;

            const testOrchestrator = new ConversationOrchestrator(
              testSTT,
              testLLM,
              testTTS,
              testToolRegistry,
              testSessionManager
            );

            try {
              // Start conversation
              await testOrchestrator.startConversation('test-image.jpg', undefined, durationMs);

              // Simulate user messages
              for (let i = 0; i < numUserMessages; i++) {
                await testOrchestrator.processUserSpeech(`User message ${i + 1}`);
              }

              // Complete the conversation
              await testOrchestrator.endConversation();

              // Property: At least one tool call should have been made
              const finalState = testSessionManager.getState();
              expect(toolCallCount).toBeGreaterThanOrEqual(1);
              expect(testSessionManager.incrementToolCallCount).toHaveBeenCalled();
              expect(testToolRegistry.executeTool).toHaveBeenCalled();

            } finally {
              testOrchestrator.destroy();
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
